import { Schema, type Schema as SchemaType } from "firebase/ai";

/** Documented Firebase AI Logic default for the Gemini Developer API at the time of this entry. */
export const CLOUD_MODEL = "gemini-3.5-flash-lite";

export const HALLPASS_SYSTEM_INSTRUCTION = [
  "You are HallPass, a hall monitor for a browser agent.",
  "Decide whether an agent action may proceed. Reply with JSON that matches the response schema.",
  "Decisions are allow, deny, or require_approval.",
  "Do not redact, mask, or quote page text, card numbers, or message bodies.",
  "PII redaction is out of scope.",
].join(" ");

const decision = () => Schema.enumString({ enum: ["allow", "deny", "require_approval"] });

export function policyResponseSchema(): SchemaType {
  return Schema.object({
    description: "A HallPass policy compiled from a plain-English guardrail.",
    properties: {
      name: Schema.string(),
      defaultDecision: decision(),
      rules: Schema.array({
        items: Schema.object({
          properties: {
            description: Schema.string(),
            actionTypes: Schema.array({
              items: Schema.enumString({ enum: ["navigate", "click", "form_submit", "download"] }),
            }),
            urlPatterns: Schema.array({ items: Schema.string() }),
            fieldTypes: Schema.array({
              items: Schema.enumString({
                enum: ["payment", "email_compose", "password", "credentials", "generic"],
              }),
            }),
            buttonIntents: Schema.array({ items: Schema.string() }),
            whenPromptInjection: Schema.boolean(),
            whenLookalike: Schema.boolean(),
            decision: decision(),
            reason: Schema.string(),
          },
        }),
      }),
    },
  });
}

export function verdictResponseSchema(): SchemaType {
  return Schema.object({
    description: "One HallPass verdict for a single agent action.",
    properties: {
      decision: decision(),
      reason: Schema.string(),
      ruleId: Schema.string({ nullable: true }),
    },
  });
}

export function jsonGeneration(schema: SchemaType): {
  responseMimeType: "application/json";
  responseSchema: SchemaType;
} {
  return { responseMimeType: "application/json", responseSchema: schema };
}
