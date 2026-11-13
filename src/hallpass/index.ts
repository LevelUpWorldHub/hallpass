export { HALLPASS_VERSION } from "./types";
export type {
  ActionType,
  AgentAction,
  AuditEvent,
  Decision,
  FieldType,
  InferenceSource,
  Policy,
  PolicyRule,
  Verdict,
} from "./types";
export { compileRules } from "./compile-rules";
export { evaluate, shouldGate, specificity } from "./engine";
export { lookalikeOf } from "./lookalike";
export { detectInjection, isHiddenStyle } from "./injection";
export { actionFromClick, actionFromSubmit, fieldTypesFromControls } from "./fields";
export { SCENARIOS, DEMO_GUARDRAIL, TAX_GUARDRAIL } from "./scenarios";
export { formatScorecard, runScorecard } from "./scorecard";
export { createAuditEvent, exportAuditJson } from "./audit";
export { urlMatches } from "./url";

import { evaluate } from "./engine";
import type { AgentAction, Policy, Verdict } from "./types";

export interface CheckOptions {
  policy: Policy;
  mode?: "rules" | "hybrid";
  /** Optional model classifier. Used only when mode is hybrid. */
  classify?: (action: AgentAction, policy: Policy) => Promise<Verdict>;
}

/**
 * SDK entry. Other agent builders call this before they act.
 * Rules mode is synchronous work wrapped in a promise so hybrid callers share one shape.
 */
export async function check(action: AgentAction, options: CheckOptions): Promise<Verdict> {
  if (options.mode === "hybrid" && options.classify) {
    try {
      return await options.classify(action, options.policy);
    } catch (error) {
      const fallback = evaluate(options.policy, action);
      const detail = error instanceof Error ? error.message : "model unavailable";
      return {
        ...fallback,
        rulesDecision: fallback.decision,
        rulesReason: fallback.reason,
        reason: `${fallback.reason} Hybrid review failed (${detail}), so the rules engine decided.`,
      };
    }
  }
  return evaluate(options.policy, action);
}
