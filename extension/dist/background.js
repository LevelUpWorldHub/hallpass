"use strict";
(() => {
  // src/hallpass/audit.ts
  var auditSequence = 0;
  function createAuditEvent(partial) {
    auditSequence += 1;
    return {
      id: partial.id ?? `evt_${Date.now().toString(36)}_${auditSequence}`,
      at: partial.at ?? (/* @__PURE__ */ new Date()).toISOString(),
      action: partial.action,
      verdict: partial.verdict,
      policyId: partial.policyId,
      policyName: partial.policyName
    };
  }

  // src/hallpass/injection.ts
  var INJECTION_PATTERNS = [
    /ignore (all |any )?(previous|prior|above) (instructions|rules|guardrails|prompts)/i,
    /disregard (your|the|all) (rules|guardrails|policy|instructions)/i,
    /system\s*:/i,
    /you are now (a|an|the)\b/i,
    /do not (tell|alert|inform) the user/i,
    /hidden instruction/i,
    /exfiltrat/i,
    /<!--\s*(agent|system)/i,
    /\bdeveloper mode\b/i
  ];
  function detectInjection(text) {
    if (!text) return false;
    return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
  }

  // src/hallpass/url.ts
  function isHttpUrl(input) {
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
  function isSafeUrlPattern(pattern) {
    const raw = pattern.trim().toLowerCase();
    if (!raw || raw.length > 200) return false;
    if (raw === "*" || raw === "*://*" || raw === "<all_urls>") return true;
    const stars = raw.match(/\*/g)?.length ?? 0;
    if (stars > 1) return false;
    return /^[a-z0-9.*-]+$/.test(raw);
  }
  function hostOf(input) {
    const trimmed = input.trim();
    if (!trimmed) return "";
    try {
      const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
      return new URL(withProto).hostname.toLowerCase().replace(/\.$/, "");
    } catch {
      return trimmed.toLowerCase().split("/")[0] ?? "";
    }
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function urlMatches(pattern, url) {
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
  function actionUrl(action) {
    return action.targetUrl || action.url;
  }

  // src/hallpass/lookalike.ts
  var BRANDS = [
    { host: "paypal.com", label: "paypal" },
    { host: "google.com", label: "google" },
    { host: "microsoft.com", label: "microsoft" },
    { host: "apple.com", label: "apple" },
    { host: "amazon.com", label: "amazon" },
    { host: "chase.com", label: "chase" },
    { host: "bankofamerica.com", label: "bankofamerica" },
    { host: "irs.gov", label: "irs" }
  ];
  var FOLD = {
    "0": "o",
    "1": "l",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "@": "a",
    $: "s"
  };
  function foldLabel(label) {
    const swapped = label.toLowerCase().replace(/rn/g, "m").replace(/vv/g, "w");
    let folded = "";
    for (const char of swapped) folded += FOLD[char] ?? char;
    return folded.replace(/[^a-z]/g, "");
  }
  function levenshtein(left, right) {
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
  function registrableHost(host) {
    const parts = host.split(".").filter(Boolean);
    if (parts.length < 2) return host;
    return parts.slice(-2).join(".");
  }
  var BRAND_TAILS = [
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
    "wallet"
  ];
  function labelLooksLike(label, brand) {
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
  function lookalikeOf(input) {
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

  // src/hallpass/engine.ts
  var RESTRICTIVENESS = {
    deny: 3,
    require_approval: 2,
    allow: 1
  };
  function specificity(rule) {
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
  function buttonMatches(intents, buttonText) {
    if (!intents.length) return true;
    const text = buttonText ?? "";
    return intents.some((intent) => {
      const escaped = intent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\b)${escaped}\\b`, "i").test(text);
    });
  }
  function signalsMatch(rule, action) {
    const fields = action.fieldTypes ?? [];
    const fieldOk = rule.fieldTypes.length === 0 || rule.fieldTypes.some((field) => fields.includes(field));
    const buttonOk = buttonMatches(rule.buttonIntents, action.buttonText);
    if (rule.fieldTypes.length && rule.buttonIntents.length) return fieldOk || buttonOk;
    return fieldOk && buttonOk;
  }
  function ruleMatches(rule, action, lookalike, injection) {
    if (rule.actionTypes.length && !rule.actionTypes.includes(action.type)) return false;
    if (rule.urlPatterns.length && !rule.urlPatterns.some((pattern) => urlMatches(pattern, actionUrl(action)))) {
      return false;
    }
    if (rule.whenPromptInjection && !injection) return false;
    if (rule.whenLookalike && !lookalike) return false;
    return signalsMatch(rule, action);
  }
  function pageHasInjection(action) {
    if (action.pageSignals?.hiddenInstruction) return true;
    if (detectInjection(action.pageSignals?.injectionExcerpt)) return true;
    if (detectInjection(action.pageSignals?.visibleText)) return true;
    return false;
  }
  function evaluate(policy, action) {
    if (!action.url) {
      return {
        decision: "allow",
        reason: "The action had no URL, so the gate left it alone.",
        inference: "rules",
        policySource: policy.compiledBy
      };
    }
    if (!isHttpUrl(actionUrl(action))) {
      return {
        decision: "deny",
        reason: "Only http and https URLs can get a hall pass.",
        inference: "rules",
        policySource: policy.compiledBy
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
        reason: decision === "allow" ? "No guardrail covers this action. The gate leaves it alone." : "No guardrail covers this action. The policy default applies.",
        inference: "rules",
        policySource: policy.compiledBy,
        lookalikeOf: lookalike ?? void 0
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
      lookalikeOf: lookalike ?? void 0
    };
  }
  var SENSITIVE_CLICK = /\b(pay|purchase|buy|checkout|place order|send|delete|remove|download|transfer|wire|subscribe)\b/i;
  function shouldGate(action, policy) {
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

  // src/hallpass/policy-guard.ts
  var DECISIONS = /* @__PURE__ */ new Set(["allow", "deny", "require_approval"]);
  var ACTIONS = /* @__PURE__ */ new Set(["navigate", "click", "form_submit", "download"]);
  var FIELDS = /* @__PURE__ */ new Set(["payment", "email_compose", "password", "credentials", "generic"]);
  var SOURCES = /* @__PURE__ */ new Set(["on_device", "cloud", "rules"]);
  function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  function isRule(value) {
    if (!value || typeof value !== "object") return false;
    const rule = value;
    if (typeof rule.id !== "string" || !rule.id) return false;
    if (typeof rule.description !== "string" || typeof rule.reason !== "string" || !rule.reason) return false;
    if (!DECISIONS.has(rule.decision)) return false;
    if (!isStringArray(rule.actionTypes) || !rule.actionTypes.every((item) => ACTIONS.has(item))) return false;
    if (!isStringArray(rule.urlPatterns) || !rule.urlPatterns.every(isSafeUrlPattern)) return false;
    if (!isStringArray(rule.buttonIntents) || rule.buttonIntents.length > 24) return false;
    if (rule.buttonIntents.some((intent) => intent.length > 64)) return false;
    if (rule.reason.length > 2e3 || rule.description.length > 2e3) return false;
    if (!isStringArray(rule.fieldTypes) || !rule.fieldTypes.every((item) => FIELDS.has(item))) return false;
    if (typeof rule.whenPromptInjection !== "boolean" || typeof rule.whenLookalike !== "boolean") return false;
    return true;
  }
  function isPolicy(value) {
    if (!value || typeof value !== "object") return false;
    const policy = value;
    if (!Object.hasOwn(policy, "id") || typeof policy.id !== "string" || !policy.id) return false;
    if (!Object.hasOwn(policy, "name") || typeof policy.name !== "string" || !policy.name) return false;
    if (!Object.hasOwn(policy, "version") || policy.version !== 1) return false;
    if (typeof policy.sourceText !== "string") return false;
    if (!SOURCES.has(policy.compiledBy)) return false;
    if (!DECISIONS.has(policy.defaultDecision)) return false;
    if (!Array.isArray(policy.rules) || policy.rules.length > 100 || !policy.rules.every(isRule)) return false;
    if (!Array.isArray(policy.warnings) || !policy.warnings.every((item) => typeof item === "string")) return false;
    return true;
  }

  // extension/src/background.ts
  var KEY = "hallpass";
  var permits = /* @__PURE__ */ new Map();
  async function read() {
    const stored = await chrome.storage.local.get(KEY);
    const value = stored[KEY];
    return {
      policy: value?.policy && isPolicy(value.policy) ? value.policy : null,
      events: Array.isArray(value?.events) ? value.events : [],
      enabled: value?.enabled !== false
    };
  }
  async function write(state) {
    await chrome.storage.local.set({ [KEY]: state });
  }
  function broadcast(message) {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id == null) continue;
        chrome.tabs.sendMessage(tab.id, message, () => {
          void chrome.runtime.lastError;
        });
      }
    });
  }
  async function record(state, action, verdict) {
    const next = {
      ...state,
      events: [
        createAuditEvent({
          action,
          verdict,
          policyId: state.policy?.id,
          policyName: state.policy?.name
        }),
        ...state.events
      ].slice(0, 500)
    };
    await write(next);
    return next;
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void (async () => {
      const state = await read();
      if (message.type === "get-state" || message.type === "get-audit") {
        sendResponse(state);
        return;
      }
      if (message.type === "set-policy" || message.type === "import-policy") {
        if (!isPolicy(message.policy)) {
          sendResponse({ ok: false });
          return;
        }
        const next = { ...state, policy: message.policy };
        await write(next);
        broadcast({ type: "policy", policy: message.policy, enabled: next.enabled });
        sendResponse({ ok: true });
        return;
      }
      if (message.type === "set-enabled") {
        const next = { ...state, enabled: Boolean(message.enabled) };
        await write(next);
        broadcast({ type: "policy", policy: next.policy, enabled: next.enabled });
        sendResponse({ ok: true, enabled: next.enabled });
        return;
      }
      if (message.type === "permit-once" && message.url) {
        permits.set(message.url, Date.now() + 1e4);
        sendResponse({ ok: true });
        return;
      }
      if (message.type === "check" && message.action) {
        if (!state.enabled) {
          sendResponse({
            decision: "allow",
            reason: "HallPass is paused.",
            inference: "rules"
          });
          return;
        }
        if (!state.policy) {
          const verdict2 = {
            decision: "allow",
            reason: "No policy is loaded. The gate is open.",
            inference: "rules"
          };
          sendResponse(verdict2);
          return;
        }
        const verdict = evaluate(state.policy, message.action);
        await record(state, message.action, verdict);
        sendResponse(verdict);
        return;
      }
      sendResponse({ ok: false });
    })();
    return true;
  });
  chrome.downloads.onCreated.addListener((item) => {
    void (async () => {
      const permitUntil = permits.get(item.url);
      if (permitUntil && permitUntil > Date.now()) {
        permits.delete(item.url);
        return;
      }
      const state = await read();
      if (!state.enabled || !state.policy) return;
      const action = {
        type: "download",
        url: item.url,
        downloadFilename: item.filename,
        actor: "extension"
      };
      if (!shouldGate(action, state.policy)) return;
      const verdict = evaluate(state.policy, action);
      await record(state, action, verdict);
      if (verdict.decision !== "allow") await chrome.downloads.cancel(item.id);
    })();
  });
})();
