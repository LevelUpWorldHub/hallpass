import type { ActionType, AgentAction, FieldType } from "./types";

export interface ControlMeta {
  tag: string;
  type?: string;
  name?: string;
  id?: string;
  autocomplete?: string;
  placeholder?: string;
  label?: string;
  text?: string;
  href?: string;
  download?: string | null;
}

const PAYMENT_HINT =
  /\b(cc-number|cc-exp|cc-csc|cc-name|cardnumber|card-number|cvv|cvc|pan|payment|creditcard|credit-card)\b/i;
const EMAIL_COMPOSE_NAMES = /^(to|recipient|cc|bcc|subject|body|message|content)$/i;

function blob(control: ControlMeta): string {
  return [control.type, control.name, control.id, control.autocomplete, control.placeholder, control.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function fieldTypeFromControl(control: ControlMeta): FieldType | null {
  const text = blob(control);
  if (!text) return null;
  if (PAYMENT_HINT.test(text) || control.autocomplete?.toLowerCase().startsWith("cc-")) return "payment";
  if (control.type === "password" || /\b(password|passwd)\b/i.test(text)) return "password";
  if (/\b(username|user-name|login)\b/i.test(text)) return "credentials";
  return null;
}

/** Email compose is a form-level shape: to + subject + body, not a single input. */
export function fieldTypesFromControls(controls: ControlMeta[]): FieldType[] {
  const types = new Set<FieldType>();
  const names = controls.map((control) => (control.name || control.id || control.autocomplete || "").toLowerCase());
  for (const control of controls) {
    const field = fieldTypeFromControl(control);
    if (field) types.add(field);
  }
  const hasTo = names.some((name) => /^(to|recipient)$/.test(name));
  const hasSubject = names.some((name) => name === "subject");
  const hasBody = names.some((name) => /^(body|message|content)$/.test(name));
  if (hasTo && (hasSubject || hasBody)) types.add("email_compose");
  for (const name of names) {
    if (EMAIL_COMPOSE_NAMES.test(name) && hasTo && hasSubject && hasBody) types.add("email_compose");
  }
  if (!types.size) types.add("generic");
  return [...types];
}

export function actionFromClick(
  control: ControlMeta,
  pageUrl: string,
  formControls: ControlMeta[],
): AgentAction | null {
  const text = (control.text || control.label || "").replace(/\s+/g, " ").trim();
  const downloadName = control.download;
  const href = control.href;
  let type: ActionType = "click";
  if (downloadName != null && downloadName !== "") type = "download";
  else if (control.tag === "a" && href) type = "navigate";
  else if (control.type === "submit" || control.tag === "button" || control.tag === "input") type = "click";

  const fieldTypes = fieldTypesFromControls(formControls);
  const target = type === "navigate" && href ? href : pageUrl;
  return {
    type,
    url: pageUrl,
    targetUrl: target,
    buttonText: text || undefined,
    fieldTypes: fieldTypes.filter((field) => field !== "generic"),
    fieldNames: formControls.map((item) => item.name || item.id || "").filter(Boolean),
    downloadFilename: downloadName || undefined,
    actor: "extension",
  };
}

export function actionFromSubmit(pageUrl: string, formControls: ControlMeta[], buttonText?: string): AgentAction {
  const fieldTypes = fieldTypesFromControls(formControls);
  return {
    type: "form_submit",
    url: pageUrl,
    buttonText: buttonText?.replace(/\s+/g, " ").trim() || undefined,
    fieldTypes,
    fieldNames: formControls.map((item) => item.name || item.id || "").filter(Boolean),
    actor: "extension",
  };
}
