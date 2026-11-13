import type { Policy, PolicyRule } from "./types";

const DECISIONS = new Set(["allow", "deny", "require_approval"]);
const ACTIONS = new Set(["navigate", "click", "form_submit", "download"]);
const FIELDS = new Set(["payment", "email_compose", "password", "credentials", "generic"]);
const SOURCES = new Set(["on_device", "cloud", "rules"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRule(value: unknown): value is PolicyRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as PolicyRule;
  if (typeof rule.id !== "string" || !rule.id) return false;
  if (typeof rule.description !== "string" || typeof rule.reason !== "string" || !rule.reason) return false;
  if (!DECISIONS.has(rule.decision)) return false;
  if (!isStringArray(rule.actionTypes) || !rule.actionTypes.every((item) => ACTIONS.has(item))) return false;
  if (!isStringArray(rule.urlPatterns) || !isStringArray(rule.buttonIntents)) return false;
  if (!isStringArray(rule.fieldTypes) || !rule.fieldTypes.every((item) => FIELDS.has(item))) return false;
  if (typeof rule.whenPromptInjection !== "boolean" || typeof rule.whenLookalike !== "boolean") return false;
  return true;
}

/** True when a JSON value is safe to store and enforce. Rejects partial or hostile shapes. */
export function isPolicy(value: unknown): value is Policy {
  if (!value || typeof value !== "object") return false;
  const policy = value as Policy;
  if (typeof policy.id !== "string" || !policy.id) return false;
  if (typeof policy.name !== "string" || !policy.name) return false;
  if (policy.version !== 1) return false;
  if (typeof policy.sourceText !== "string") return false;
  if (!SOURCES.has(policy.compiledBy)) return false;
  if (!DECISIONS.has(policy.defaultDecision)) return false;
  if (!Array.isArray(policy.rules) || !policy.rules.every(isRule)) return false;
  if (!Array.isArray(policy.warnings) || !policy.warnings.every((item) => typeof item === "string")) return false;
  return true;
}
