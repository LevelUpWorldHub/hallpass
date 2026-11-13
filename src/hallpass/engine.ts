import { detectInjection } from "./injection";
import { lookalikeOf } from "./lookalike";
import type { AgentAction, Decision, Policy, PolicyRule, Verdict } from "./types";
import { actionUrl, isHttpUrl, urlMatches } from "./url";

const RESTRICTIVENESS: Record<Decision, number> = {
  deny: 3,
  require_approval: 2,
  allow: 1,
};

export function specificity(rule: PolicyRule): number {
  let score = 0;
  if (rule.actionTypes.length) score += 1;
  const specificUrls = rule.urlPatterns.filter((pattern) => {
    const trimmed = pattern.trim();
    return trimmed !== "*" && trimmed !== "*://*" && trimmed !== "<all_urls>";
  });
  if (specificUrls.length) score += 4;
  if (rule.fieldTypes.length) score += 2;
  if (rule.buttonIntents.length) score += 2;
  if (rule.whenPromptInjection) score += 3;
  if (rule.whenLookalike) score += 3;
  return score;
}

function buttonMatches(intents: string[], buttonText: string | undefined): boolean {
  if (!intents.length) return true;
  const text = buttonText ?? "";
  return intents.some((intent) => {
    const escaped = intent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\b)${escaped}\\b`, "i").test(text);
  });
}

function signalsMatch(rule: PolicyRule, action: AgentAction): boolean {
  const fields = action.fieldTypes ?? [];
  const fieldOk = rule.fieldTypes.length === 0 || rule.fieldTypes.some((field) => fields.includes(field));
  const buttonOk = buttonMatches(rule.buttonIntents, action.buttonText);
  if (rule.fieldTypes.length && rule.buttonIntents.length) return fieldOk || buttonOk;
  return fieldOk && buttonOk;
}

export function ruleMatches(rule: PolicyRule, action: AgentAction, lookalike: string | null, injection: boolean): boolean {
  if (rule.actionTypes.length && !rule.actionTypes.includes(action.type)) return false;
  if (rule.urlPatterns.length && !rule.urlPatterns.some((pattern) => urlMatches(pattern, actionUrl(action)))) {
    return false;
  }
  if (rule.whenPromptInjection && !injection) return false;
  if (rule.whenLookalike && !lookalike) return false;
  return signalsMatch(rule, action);
}

function pageHasInjection(action: AgentAction): boolean {
  if (action.pageSignals?.hiddenInstruction) return true;
  if (detectInjection(action.pageSignals?.injectionExcerpt)) return true;
  if (detectInjection(action.pageSignals?.visibleText)) return true;
  return false;
}

/**
 * Decide an action from a compiled policy. This path is synchronous and
 * deterministic so the test bench can grade guardrails without a model.
 */
export function evaluate(policy: Policy, action: AgentAction): Verdict {
  if (!action.url) {
    return {
      decision: "allow",
      reason: "The action had no URL, so the gate left it alone.",
      inference: "rules",
      policySource: policy.compiledBy,
    };
  }

  if (!isHttpUrl(actionUrl(action))) {
    return {
      decision: "deny",
      reason: "Only http and https URLs can get a hall pass.",
      inference: "rules",
      policySource: policy.compiledBy,
    };
  }

  const lookalike = lookalikeOf(action.targetUrl || action.url) ?? lookalikeOf(action.url);
  const injection = pageHasInjection(action);
  const matches = policy.rules.filter((rule) => ruleMatches(rule, action, lookalike, injection));
  matches.sort((left, right) => {
    const byScore = specificity(right) - specificity(left);
    if (byScore !== 0) return byScore;
    return RESTRICTIVENESS[right.decision] - RESTRICTIVENESS[left.decision];
  });

  const winner = matches[0];
  if (!winner) {
    const decision = policy.defaultDecision;
    return {
      decision,
      reason:
        decision === "allow"
          ? "No guardrail covers this action. The gate leaves it alone."
          : "No guardrail covers this action. The policy default applies.",
      inference: "rules",
      policySource: policy.compiledBy,
      lookalikeOf: lookalike ?? undefined,
    };
  }

  let reason = winner.reason;
  if (winner.whenLookalike && lookalike) reason = `${reason} It resembles ${lookalike}.`;
  return {
    decision: winner.decision,
    reason,
    ruleId: winner.id,
    inference: "rules",
    policySource: policy.compiledBy,
    lookalikeOf: lookalike ?? undefined,
  };
}

const SENSITIVE_CLICK =
  /\b(pay|purchase|buy|checkout|place order|send|delete|remove|download|transfer|wire|subscribe)\b/i;

/** Whether the extension should pause the DOM event and ask the engine. */
export function shouldGate(action: AgentAction, policy: Policy | null): boolean {
  if (!policy) return false;
  if (action.type === "form_submit" || action.type === "download") return true;
  if (action.type === "navigate") {
    return policy.rules.some((rule) => rule.actionTypes.length === 0 || rule.actionTypes.includes("navigate"));
  }
  if (action.type === "click") {
    if (SENSITIVE_CLICK.test(action.buttonText ?? "")) return true;
    if (action.fieldTypes?.includes("payment") || action.fieldTypes?.includes("email_compose")) return true;
  }
  return false;
}
