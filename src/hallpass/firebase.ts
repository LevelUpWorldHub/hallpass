"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type GenerativeModel,
} from "firebase/ai";
import { firebasePublicConfig, hybridConfigured, preferredMode, recaptchaSiteKey } from "./config";
import { compileRules } from "./compile-rules";
import { evaluate } from "./engine";
import { policyFromModel, modelVerdictSchema, extractJson } from "./schema";
import type { AgentAction, InferenceSource as HallpassSource, Policy, Verdict } from "./types";

export { firebasePublicConfig, hybridConfigured, preferredMode, recaptchaSiteKey };

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;
let model: GenerativeModel | null = null;
let deviceInit: Promise<void> | null = null;

function readSource(source: string | undefined): Exclude<HallpassSource, "rules"> | null {
  if (source === InferenceSource.ON_DEVICE || source === "on_device") return "on_device";
  if (source === InferenceSource.IN_CLOUD || source === "in_cloud") return "cloud";
  return null;
}

export function ensureFirebase(): GenerativeModel {
  if (model) return model;
  const config = firebasePublicConfig();
  const siteKey = recaptchaSiteKey();
  if (!config || !siteKey) {
    throw new Error("Firebase config or the reCAPTCHA Enterprise site key is missing.");
  }
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "true") {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  app = getApps()[0] ?? initializeApp(config);
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Fast refresh can initialize App Check twice in one tab. The first instance still serves tokens.
    appCheck = null;
  }
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  model = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE });
  void appCheck;
  return model;
}

/**
 * Must run from a click or keypress. Does not wait out a multi-minute Nano
 * download: PREFER_ON_DEVICE falls back to cloud if the on-device model is not ready.
 */
export async function warmDeviceModel(onProgress?: (progress: number) => void): Promise<void> {
  const generative = ensureFirebase();
  if (!deviceInit) {
    deviceInit = Promise.race([
      generative.initializeDeviceModel((value) => onProgress?.(value)).catch(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2500);
      }),
    ]);
  }
  await deviceInit;
}

const COMPILE_PROMPT = `Compile the guardrail into JSON. Reply with JSON only, no markdown.
Schema:
{"name":string,"defaultDecision":"allow"|"deny"|"require_approval","rules":[{"description":string,"actionTypes":("navigate"|"click"|"form_submit"|"download")[],"urlPatterns":string[],"fieldTypes":("payment"|"email_compose"|"password"|"credentials"|"generic")[],"buttonIntents":string[],"whenPromptInjection":boolean,"whenLookalike":boolean,"decision":"allow"|"deny"|"require_approval","reason":string}]}
Use "*" as a URL pattern only when every URL applies. Prefer specific patterns like "*.gov".
Do not invent redaction or PII masking. HallPass only allows, denies, or asks before an agent action.
Guardrail:
`;

export interface CompileOutcome {
  policy: Policy;
  note?: string;
  downloadProgress?: number;
}

export async function compileGuardrail(
  sourceText: string,
  onProgress?: (progress: number) => void,
): Promise<CompileOutcome> {
  const rulesPolicy = compileRules(sourceText);
  if (preferredMode() === "rules") {
    const note = hybridConfigured()
      ? "HALLPASS inference is set to rules. The model was not called."
      : "No Firebase config. Compiled with the rules engine.";
    return { policy: rulesPolicy, note };
  }
  try {
    await warmDeviceModel(onProgress);
    const generative = ensureFirebase();
    const result = await generative.generateContent(`${COMPILE_PROMPT}${sourceText.trim()}`);
    const source = readSource(result.response.inferenceSource);
    const text = result.response.text();
    if (!source) {
      return {
        policy: rulesPolicy,
        note: "The model answered, but the SDK did not report on-device or cloud. Kept the rules policy.",
      };
    }
    const policy = policyFromModel(text, sourceText, source, { model: "gemini-hybrid" });
    return { policy };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Hybrid inference failed.";
    return {
      policy: rulesPolicy,
      note: `${detail} Kept the rules policy.`,
    };
  }
}

export async function classifyWithHybrid(action: AgentAction, policy: Policy): Promise<Verdict> {
  const rulesVerdict = evaluate(policy, action);
  if (preferredMode() === "rules") return rulesVerdict;
  try {
    await warmDeviceModel();
    const generative = ensureFirebase();
    const prompt = `You are HallPass, a hall monitor for a browser agent. Judge this one action against the policy.
Reply with JSON only: {"decision":"allow"|"deny"|"require_approval","reason":string,"ruleId":string|null}
The reason is one sentence a person can read. Do not redact or quote secrets.
Policy:
${JSON.stringify({ name: policy.name, defaultDecision: policy.defaultDecision, rules: policy.rules })}
Action:
${JSON.stringify(action)}`;
    const result = await generative.generateContent(prompt);
    const source = readSource(result.response.inferenceSource);
    if (!source) return rulesVerdict;
    const parsed = modelVerdictSchema.parse(extractJson(result.response.text()));
    return {
      decision: parsed.decision,
      reason: parsed.reason,
      ruleId: parsed.ruleId ?? undefined,
      inference: source,
      model: "gemini-hybrid",
      policySource: policy.compiledBy,
      lookalikeOf: rulesVerdict.lookalikeOf,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "model unavailable";
    return {
      ...rulesVerdict,
      reason: `${rulesVerdict.reason} Hybrid review failed (${detail}), so the rules engine decided.`,
    };
  }
}
