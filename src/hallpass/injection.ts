const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above) (instructions|rules|guardrails|prompts)/i,
  /disregard (your|the|all) (rules|guardrails|policy|instructions)/i,
  /system\s*:/i,
  /you are now (a|an|the)\b/i,
  /do not (tell|alert|inform) the user/i,
  /hidden instruction/i,
  /exfiltrat/i,
  /<!--\s*(agent|system)/i,
  /\bdeveloper mode\b/i,
];

export function detectInjection(text: string | undefined | null): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function injectionExcerpt(text: string | undefined | null, limit = 180): string | undefined {
  if (!text || !detectInjection(text)) return undefined;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, limit - 1)}…`;
}

export interface HiddenStyle {
  display: string;
  visibility: string;
  opacity: string;
  fontSize: string;
  textIndent: string;
  ariaHidden: boolean;
  hiddenAttr: boolean;
  offscreen: boolean;
}

/** Heuristic for "this element is not shown to the person sitting at the keyboard". */
export function isHiddenStyle(style: HiddenStyle): boolean {
  if (style.hiddenAttr || style.ariaHidden) return true;
  if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
    return true;
  }
  const opacity = Number.parseFloat(style.opacity);
  if (!Number.isNaN(opacity) && opacity <= 0.05) return true;
  const fontSize = Number.parseFloat(style.fontSize);
  if (!Number.isNaN(fontSize) && fontSize <= 1) return true;
  if (/^-?\d{3,}px/.test(style.textIndent) && style.textIndent.trim().startsWith("-")) return true;
  if (style.offscreen) return true;
  return false;
}
