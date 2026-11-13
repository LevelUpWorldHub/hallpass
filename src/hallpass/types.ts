export const ACTION_TYPES = ["navigate", "click", "form_submit", "download"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const DECISIONS = ["allow", "deny", "require_approval"] as const;
export type Decision = (typeof DECISIONS)[number];

export const FIELD_TYPES = [
  "payment",
  "email_compose",
  "password",
  "credentials",
  "generic",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Where a judgment was produced. `rules` is the deterministic engine. */
export const INFERENCE_SOURCES = ["on_device", "cloud", "rules"] as const;
export type InferenceSource = (typeof INFERENCE_SOURCES)[number];

export interface PageSignals {
  /** True when the page hides text that reads like instructions to an agent. */
  hiddenInstruction?: boolean;
  /** Short excerpt of that hidden text. Never a form value. */
  injectionExcerpt?: string;
  visibleText?: string;
}

/**
 * An agent action. Field metadata is types and names only — never values.
 * HallPass does not read card numbers, message bodies, or other PII.
 */
export interface AgentAction {
  type: ActionType;
  url: string;
  /** Destination when the action navigates. Defaults to `url`. */
  targetUrl?: string;
  buttonText?: string;
  fieldTypes?: FieldType[];
  fieldNames?: string[];
  downloadFilename?: string;
  pageSignals?: PageSignals;
  actor?: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  /** Empty means any action type. */
  actionTypes: ActionType[];
  /** Empty means any URL. A lone "*" matches every URL but is not "specific". */
  urlPatterns: string[];
  /** Empty means any fields. */
  fieldTypes: FieldType[];
  /** Empty means any button label. */
  buttonIntents: string[];
  whenPromptInjection: boolean;
  whenLookalike: boolean;
  decision: Decision;
  reason: string;
}

export interface Policy {
  id: string;
  name: string;
  version: 1;
  sourceText: string;
  compiledBy: InferenceSource;
  compiledAt: string;
  model?: string;
  defaultDecision: Decision;
  rules: PolicyRule[];
  warnings: string[];
}

export interface Verdict {
  decision: Decision;
  reason: string;
  ruleId?: string;
  inference: InferenceSource;
  model?: string;
  /** Set when a model compiled the policy and the rules engine enforced it. */
  policySource?: InferenceSource;
  lookalikeOf?: string;
  /** What the deterministic engine would have done, kept beside a model verdict. */
  rulesDecision?: Decision;
  rulesReason?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: AgentAction;
  verdict: Verdict;
  policyId?: string;
  policyName?: string;
}

export const HALLPASS_VERSION = "0.1.0";
