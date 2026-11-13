/** http(s), or a schemeless path the gate can treat as a page URL. javascript: and data: are not. */
export function isHttpUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return true;
  try {
    const protocol = new URL(trimmed).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Patterns the matcher will run. One star, a known wildcard, or a plain host. */
export function isSafeUrlPattern(pattern: string): boolean {
  const raw = pattern.trim().toLowerCase();
  if (!raw || raw.length > 200) return false;
  if (raw === "*" || raw === "*://*" || raw === "<all_urls>") return true;
  const stars = raw.match(/\*/g)?.length ?? 0;
  if (stars > 1) return false;
  return /^[a-z0-9.*-]+$/.test(raw);
}

export function hostOf(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return trimmed.toLowerCase().split("/")[0] ?? "";
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a URL against a HallPass pattern.
 * `*` matches everything. `*.gov` matches hosts that are under `.gov`.
 * `shop.example` matches that host and its subdomains.
 */
export function urlMatches(pattern: string, url: string): boolean {
  const raw = pattern.trim().toLowerCase();
  if (!raw || raw === "*" || raw === "*://*" || raw === "<all_urls>") return true;

  const host = hostOf(url);
  if (!host) return false;

  const hostGlob = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!hostGlob || !isSafeUrlPattern(hostGlob === raw ? raw : hostGlob)) return false;

  if (hostGlob.startsWith("*.")) {
    const suffix = hostGlob.slice(1);
    return host.endsWith(suffix) && host.length > suffix.length;
  }

  if (hostGlob.includes("*")) {
    const expression = new RegExp(`^${hostGlob.split("*").map(escapeRegExp).join(".*")}$`);
    return expression.test(host);
  }

  return host === hostGlob || host.endsWith(`.${hostGlob}`);
}

export function actionUrl(action: { url: string; targetUrl?: string }): string {
  return action.targetUrl || action.url;
}
