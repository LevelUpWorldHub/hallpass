import { z } from "zod";
import type { InferenceSource, Policy, PolicyRule } from "./types";

const actionType = z.enum(["navigate", "click", "form_submit", "download"]);
const decision = z.enum(["allow", "deny", "require_approval"]);
const fieldType = z.enum(["payment", "email_compose", "password", "credentials", "generic"]);

export const modelPolicySchema = z.object({
  name: z.string().min(1).max(80),
  defaultDecision: decision,
  rules: z
    .array(
      z.object({
        description: z.string().min(1),
        actionTypes: z.array(actionType),
        urlPatterns: z.array(z.string()),
        fieldTypes: z.array(fieldType),
        buttonIntents: z.array(z.string()),
        whenPromptInjection: z.boolean(),
        whenLookalike: z.boolean(),
        decision,
        reason: z.string().min(1),
      }),
    )
    .min(1),
});

function stableId(parts: string[]): string {
  let hash = 2166136261;
  const value = parts.join("|");
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `m_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return JSON.");
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

export function policyFromModel(
  text: string,
  sourceText: string,
  compiledBy: Exclude<InferenceSource, "rules">,
  options: { now?: string; model?: string } = {},
): Policy {
  const parsed = modelPolicySchema.parse(extractJson(text));
  const rules: PolicyRule[] = parsed.rules.map((rule, index) => ({
    id: stableId([sourceText, String(index), rule.description, rule.decision]),
    description: rule.description,
    actionTypes: rule.actionTypes,
    urlPatterns: rule.urlPatterns,
    fieldTypes: rule.fieldTypes,
    buttonIntents: rule.buttonIntents.map((intent) => intent.toLowerCase()),
    whenPromptInjection: rule.whenPromptInjection,
    whenLookalike: rule.whenLookalike,
    decision: rule.decision,
    reason: rule.reason,
  }));
  return {
    id: stableId(["pol", sourceText, compiledBy]),
    name: parsed.name,
    version: 1,
    sourceText: sourceText.trim(),
    compiledBy,
    compiledAt: options.now ?? new Date().toISOString(),
    model: options.model,
    defaultDecision: parsed.defaultDecision,
    rules,
    warnings: [],
  };
}

export const modelVerdictSchema = z.object({
  decision,
  reason: z.string().min(1),
  ruleId: z.string().nullable().optional(),
});
