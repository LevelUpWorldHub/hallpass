import { compileRules } from "./compile-rules";
import { evaluate } from "./engine";
import { SCENARIOS } from "./scenarios";
import type { AgentAction, Decision, Policy, Verdict } from "./types";

/** The three checks a first-time visitor should see before they read the rest of the desk. */
export const FIRST_RUN_IDS = ["no-payment", "email-ask", "lookalike"] as const;

export interface FirstRunBeat {
  id: (typeof FIRST_RUN_IDS)[number];
  label: string;
  title: string;
  guardrail: string;
  page: string;
  destination: string;
  request: string;
  decision: Decision;
  reason: string;
  action: AgentAction;
  policy: Policy;
}

const LABELS: Record<(typeof FIRST_RUN_IDS)[number], string> = {
  "no-payment": "Payment",
  "email-ask": "Mail",
  lookalike: "Lookalike",
};

export interface HostPair {
  guardrail: string;
  real: { url: string; verdict: Verdict };
  fake: { url: string; verdict: Verdict };
}

/** The same Pay now click on the real host and on a one-character lookalike. */
export function lookalikePair(now = "2026-01-01T00:00:00.000Z"): HostPair {
  const guardrail = "Deny payments on lookalike domains.";
  const policy = compileRules(guardrail, { now, name: "Lookalike" });
  const pay = (url: string) =>
    evaluate(policy, {
      type: "form_submit",
      url,
      buttonText: "Pay now",
      fieldTypes: ["payment"],
    });
  return {
    guardrail,
    real: { url: "https://www.paypal.com/checkout", verdict: pay("https://www.paypal.com/checkout") },
    fake: { url: "https://paypa1.com/checkout", verdict: pay("https://paypa1.com/checkout") },
  };
}

export function firstRunBeats(now = "2026-01-01T00:00:00.000Z"): FirstRunBeat[] {
  return FIRST_RUN_IDS.map((id) => {
    const scenario = SCENARIOS.find((item) => item.id === id);
    if (!scenario) throw new Error(`Missing first-run scenario ${id}`);
    const step = scenario.steps.find((item) => item.name === scenario.headline) ?? scenario.steps[0];
    if (!step) throw new Error(`Missing headline step for ${id}`);
    const policy = compileRules(scenario.guardrail, { now, name: scenario.title });
    const verdict = evaluate(policy, step.action);
    const requestLabel = step.action.buttonText ?? step.name;
    return {
      id,
      label: LABELS[id],
      title: scenario.title,
      guardrail: scenario.guardrail,
      page: scenario.page,
      destination: step.action.targetUrl || step.action.url,
      request: `${step.action.type.replace(/_/g, " ")} · ${requestLabel}`,
      decision: verdict.decision,
      reason: verdict.reason,
      action: step.action,
      policy,
    };
  });
}
