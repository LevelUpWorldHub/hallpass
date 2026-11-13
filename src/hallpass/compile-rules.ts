import type { ActionType, Decision, FieldType, Policy, PolicyRule } from "./types";

export interface CompileOptions {
  now?: string;
  id?: string;
  name?: string;
}

const PII_BOUNDARY =
  "HallPass does not redact page content. It allows, denies, or asks before an agent action. PII redaction belongs to PlainSight.";

function stableId(parts: string[]): string {
  let hash = 2166136261;
  const value = parts.join("|");
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `r_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function decisionOf(text: string): Decision | null {
  if (/\b(ask me|ask before|need approval|needs approval|approval|hall pass|check with me|confirm with me)\b/.test(text)) {
    return "require_approval";
  }
  if (/\b(never|do not|don't|dont|block|deny|forbid|must not|stop)\b/.test(text)) return "deny";
  if (/\b(always allow|allow)\b/.test(text)) return "allow";
  return null;
}

function urlPatterns(sentence: string): string[] {
  const found = new Set<string>();
  for (const match of sentence.matchAll(/\*\.[a-z0-9.-]+/gi)) found.add(match[0].toLowerCase());
  for (const match of sentence.matchAll(/\b(?:[a-z0-9-]+\.)+(?:gov|com|org|net|edu|io)\b/gi)) {
    found.add(match[0].toLowerCase());
  }
  return [...found];
}

function fieldTypesOf(text: string): FieldType[] {
  const fields = new Set<FieldType>();
  if (/\b(payment|payments|card|cvv|cvc|checkout|purchase)\b/.test(text)) fields.add("payment");
  if (/\b(e-?mail|inbox|compose)\b/.test(text)) fields.add("email_compose");
  if (/\b(password|sign-?in|log ?in)\b/.test(text)) fields.add("password");
  return [...fields];
}

function buttonIntentsOf(text: string): string[] {
  const intents = new Set<string>();
  if (/\bsend/.test(text)) intents.add("send");
  if (/\breply\b/.test(text)) intents.add("reply");
  if (/\b(delete|remove)\b/.test(text)) {
    intents.add("delete");
    intents.add("remove");
  }
  if (/\bplace order\b/.test(text)) intents.add("place order");
  if (/\bpurchase\b/.test(text)) intents.add("purchase");
  if (/\bcheckout\b/.test(text)) intents.add("checkout");
  if (/\bbuy\b/.test(text)) intents.add("buy");
  if (/\bsubscribe\b/.test(text)) intents.add("subscribe");
  if (/\b(transfer|wire)\b/.test(text)) {
    intents.add("transfer");
    intents.add("wire");
  }
  if (/\bpay\b/.test(text)) intents.add("pay");
  return [...intents];
}

function actionTypesOf(text: string): ActionType[] {
  const types = new Set<ActionType>();
  if (/\b(browse|visit|navigat|go to|open)\b/.test(text)) types.add("navigate");
  if (/\bdownload/.test(text)) types.add("download");
  if (/\b(submit|form)\b/.test(text)) types.add("form_submit");
  if (/\bclick\b/.test(text)) types.add("click");
  if (/\be-?mail\b/.test(text)) {
    types.add("click");
    types.add("form_submit");
  }
  if (/\b(payment|payments|pay|purchase|checkout|buy)\b/.test(text)) {
    types.add("form_submit");
    types.add("click");
  }
  return [...types];
}

interface RuleDraft {
  description: string;
  actionTypes: ActionType[];
  urlPatterns?: string[];
  fieldTypes?: FieldType[];
  buttonIntents?: string[];
  whenPromptInjection?: boolean;
  whenLookalike?: boolean;
  decision: Decision;
  reason: string;
  source: string;
  index: number;
  salt: string;
}

function rule(draft: RuleDraft): PolicyRule {
  return {
    id: stableId([draft.salt, String(draft.index), draft.source, draft.decision, draft.description]),
    description: draft.description,
    actionTypes: draft.actionTypes,
    urlPatterns: draft.urlPatterns ?? [],
    fieldTypes: draft.fieldTypes ?? [],
    buttonIntents: draft.buttonIntents ?? [],
    whenPromptInjection: draft.whenPromptInjection ?? false,
    whenLookalike: draft.whenLookalike ?? false,
    decision: draft.decision,
    reason: draft.reason,
  };
}

function reasonFor(decision: Decision, sentence: string): string {
  const clean = sentence.replace(/\.$/, "");
  if (decision === "deny") return `Stopped. ${clean}`;
  if (decision === "require_approval") return `Needs a hall pass. ${clean}`;
  return `Allowed. ${clean}`;
}

function compileSentence(sentence: string, index: number): { rules: PolicyRule[]; warnings: string[] } {
  const warnings: string[] = [];
  const text = sentence.toLowerCase();

  if (/\b(redact|mask|anonymize|anonymise)\b/.test(text) || /\b(pii|ssn|social security)\b/.test(text)) {
    warnings.push(PII_BOUNDARY);
  }

  const injection = /hidden instruction|hides instructions|prompt injection|hidden instructions/.test(text);
  const lookalike = /look-?alike|typosquat|homoglyph/.test(text);
  const onlyBrowse = /\bonly\b/.test(text) && /\b(browse|visit|open|navigat|go)\b/.test(text);

  if (onlyBrowse) {
    const patterns = urlPatterns(sentence);
    const allowPatterns = patterns.length ? patterns : ["*"];
    const listed = allowPatterns.join(", ");
    return {
      warnings,
      rules: [
        rule({
          description: `Allow navigation on ${listed}`,
          actionTypes: ["navigate"],
          urlPatterns: allowPatterns,
          decision: "allow",
          reason: `Navigation stays inside ${listed}.`,
          source: sentence,
          index,
          salt: "allow",
        }),
        rule({
          description: `Deny navigation outside ${listed}`,
          actionTypes: ["navigate"],
          urlPatterns: ["*"],
          decision: "deny",
          reason: `This guardrail only allows browsing ${listed}.`,
          source: sentence,
          index,
          salt: "deny",
        }),
      ],
    };
  }

  const decision = decisionOf(text);
  if (!decision) {
    warnings.push(`No allow, deny, or ask in “${sentence.replace(/\.$/, "")}”.`);
    return { rules: [], warnings };
  }

  if (injection) {
    const buttons = buttonIntentsOf(text);
    const rules: PolicyRule[] = [];
    const wantsForm = /\bform/.test(text) || actionTypesOf(text).includes("form_submit");
    const wantsClick = /\bclick\b/.test(text) || buttons.length > 0;
    if (wantsForm) {
      rules.push(
        rule({
          description: "Deny form submits when the page hides agent instructions",
          actionTypes: ["form_submit"],
          whenPromptInjection: true,
          decision,
          reason: "The page is hiding instructions for the agent. The form stays unsent.",
          source: sentence,
          index,
          salt: "inj-form",
        }),
      );
    }
    if (wantsClick) {
      rules.push(
        rule({
          description: "Deny sensitive clicks when the page hides agent instructions",
          actionTypes: ["click"],
          buttonIntents: buttons.length ? buttons : ["send", "pay", "delete"],
          whenPromptInjection: true,
          decision,
          reason: "The page is hiding instructions for the agent. That click stays stopped.",
          source: sentence,
          index,
          salt: "inj-click",
        }),
      );
    }
    if (!rules.length) {
      rules.push(
        rule({
          description: "Hold actuation when the page hides agent instructions",
          actionTypes: ["form_submit", "click", "download"],
          whenPromptInjection: true,
          decision,
          reason: "The page is hiding instructions for the agent.",
          source: sentence,
          index,
          salt: "inj",
        }),
      );
    }
    return { rules, warnings };
  }

  const fields = fieldTypesOf(text);
  const buttons = buttonIntentsOf(text);
  let actions = actionTypesOf(text);

  if (lookalike) {
    if (!actions.length) actions = ["form_submit", "click"];
    const paymentButtons = fields.includes("payment") ? ["pay", "purchase", "checkout", "buy"] : [];
    return {
      warnings,
      rules: [
        rule({
          description: sentence.replace(/\.$/, ""),
          actionTypes: actions,
          fieldTypes: fields,
          buttonIntents: buttons.length ? buttons : paymentButtons,
          whenLookalike: true,
          decision,
          reason: "This domain imitates a known site. The payment stays stopped.",
          source: sentence,
          index,
          salt: "lookalike",
        }),
      ],
    };
  }

  if (!actions.length) {
    if (fields.includes("email_compose")) actions = ["form_submit", "click"];
    else actions = ["form_submit", "click"];
  }

  return {
    warnings,
    rules: [
      rule({
        description: sentence.replace(/\.$/, ""),
        actionTypes: actions,
        urlPatterns: urlPatterns(sentence),
        fieldTypes: fields,
        buttonIntents: buttons,
        decision,
        reason: reasonFor(decision, sentence),
        source: sentence,
        index,
        salt: "main",
      }),
    ],
  };
}

function policyName(text: string): string {
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  const clean = (line ?? "Guardrail").replace(/\.$/, "");
  return clean.length > 72 ? `${clean.slice(0, 69)}…` : clean;
}

export function compileRules(sourceText: string, options: CompileOptions = {}): Policy {
  const warnings: string[] = [];
  const rules: PolicyRule[] = [];
  const parts = sentences(sourceText);
  if (!parts.length) warnings.push("Write a guardrail before compiling.");
  parts.forEach((sentence, index) => {
    const compiled = compileSentence(sentence, index);
    rules.push(...compiled.rules);
    warnings.push(...compiled.warnings);
  });

  const text = sourceText.trim();
  return {
    id: options.id ?? stableId(["pol", text || "empty"]),
    name: options.name ?? policyName(text),
    version: 1,
    sourceText: text,
    compiledBy: "rules",
    compiledAt: options.now ?? new Date().toISOString(),
    defaultDecision: "allow",
    rules,
    warnings,
  };
}
