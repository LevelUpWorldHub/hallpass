import { hostOf } from "./url";

/** Brands the lookalike check compares against. Exact hosts are legitimate. */
const BRANDS: { host: string; label: string }[] = [
  { host: "paypal.com", label: "paypal" },
  { host: "google.com", label: "google" },
  { host: "microsoft.com", label: "microsoft" },
  { host: "apple.com", label: "apple" },
  { host: "amazon.com", label: "amazon" },
  { host: "chase.com", label: "chase" },
  { host: "bankofamerica.com", label: "bankofamerica" },
  { host: "irs.gov", label: "irs" },
];

const FOLD: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

export function foldLabel(label: string): string {
  const swapped = label.toLowerCase().replace(/rn/g, "m").replace(/vv/g, "w");
  let folded = "";
  for (const char of swapped) folded += FOLD[char] ?? char;
  return folded.replace(/[^a-z]/g, "");
}

export function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j] ?? 0;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(current + 1, (row[j - 1] ?? 0) + 1, previous + cost);
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}

function registrableHost(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(-2).join(".");
}

const BRAND_TAILS = [
  "login",
  "secure",
  "account",
  "pay",
  "payment",
  "verify",
  "support",
  "update",
  "signin",
  "billing",
  "wallet",
];

/**
 * True when a single hostname label is imitating a brand.
 * Called only after the registrable host has already failed the exact-brand check.
 */
function labelLooksLike(label: string, brand: string): boolean {
  const folded = foldLabel(label);
  if (!folded) return false;
  if (folded === brand) return true;
  if (folded.startsWith(brand) && folded.length > brand.length) {
    const rest = folded.slice(brand.length);
    if (BRAND_TAILS.includes(rest)) return true;
  }
  const distance = levenshtein(folded, brand);
  const delta = Math.abs(folded.length - brand.length);
  return distance === 1 && delta <= 1 && brand.length >= 3 && folded.length >= 3;
}

/**
 * Returns the legitimate host being imitated, or null when the URL is not a lookalike.
 * Exact brand hosts (paypal.com, www.paypal.com, irs.gov) are not lookalikes.
 */
export function lookalikeOf(input: string): string | null {
  const host = hostOf(input);
  if (!host) return null;
  const registrable = registrableHost(host);
  if (BRANDS.some((brand) => registrable === brand.host || host === brand.host)) return null;

  const labels = host.split(".").filter(Boolean);
  for (const brand of BRANDS) {
    for (const label of labels) {
      if (labelLooksLike(label, brand.label)) return brand.host;
    }
  }
  return null;
}
