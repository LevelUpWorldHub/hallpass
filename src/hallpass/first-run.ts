import { compileRules } from "./compile-rules";
import { evaluate } from "./engine";
import { SCENARIOS } from "./scenarios";
import type { Decision } from "./types";

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
}

const LABELS: Record<(typeof FIRST_RUN_IDS)[number], string> = {
  "no-payment": "Payment",
  "email-ask": "Mail",
  lookalike: "Lookalike",
};

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
    };
  });
}
