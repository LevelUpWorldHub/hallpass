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
import { raceDeviceDownload, readInferenceSource } from "./hybrid";
import { policyFromModel, modelVerdictSchema, extractJson } from "./schema";
import type { AgentAction, Policy, Verdict } from "./types";

export { firebasePublicConfig, hybridConfigured, preferredMode, recaptchaSiteKey };

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;
let model: GenerativeModel | null = null;
let deviceDownload: Promise<void> | null = null;

function readSource(source: string | undefined): "on_device" | "cloud" | null {
  if (source === InferenceSource.ON_DEVICE) return "on_device";
  if (source === InferenceSource.IN_CLOUD) return "cloud";
  return readInferenceSource(source);
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
export async function warmDeviceModel(onProgress?: (progress: number) => void): Promise<"ready" | "pending"> {
  const generative = ensureFirebase();
  if (!deviceDownload) {
    deviceDownload = generative.initializeDeviceModel((value) => onProgress?.(value)).then(
      () => undefined,
      (error: unknown) => {
        deviceDownload = null;
        throw error;
      },
    );
  }
  const current = deviceDownload;
  try {
    return await raceDeviceDownload(
      current,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2500);
      }),
    );
  } catch (error) {
    if (deviceDownload === current) deviceDownload = null;
    throw error;
  }
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
    const generative = ensureFirebase();
    let warmNote: string | undefined;
    try {
      const warmth = await warmDeviceModel(onProgress);
      if (warmth === "pending") {
        warmNote = "Gemini Nano is still downloading. This call can fall back to cloud Gemini.";
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "On-device setup failed.";
      warmNote = `${detail} Asking cloud Gemini through the same hybrid model.`;
    }
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
    return { policy, note: source === "cloud" ? warmNote : undefined };
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
    try {
      await warmDeviceModel();
    } catch {
      // A failed Nano download must not skip the cloud fallback on this same model.
    }
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
