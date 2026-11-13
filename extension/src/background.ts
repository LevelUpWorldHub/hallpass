import { createAuditEvent } from "../../src/hallpass/audit";
import { evaluate, shouldGate } from "../../src/hallpass/engine";
import type { AgentAction, AuditEvent, Policy, Verdict } from "../../src/hallpass/types";

interface Stored {
  policy: Policy | null;
  events: AuditEvent[];
  enabled: boolean;
}

const KEY = "hallpass";
const permits = new Map<string, number>();

function isPolicy(value: unknown): value is Policy {
  if (!value || typeof value !== "object") return false;
  const policy = value as Policy;
  return typeof policy.id === "string" && Array.isArray(policy.rules);
}

async function read(): Promise<Stored> {
  const stored = await chrome.storage.local.get(KEY);
  const value = stored[KEY] as Stored | undefined;
  return {
    policy: value?.policy && isPolicy(value.policy) ? value.policy : null,
    events: Array.isArray(value?.events) ? value.events : [],
    enabled: value?.enabled !== false,
  };
}

async function write(state: Stored): Promise<void> {
  await chrome.storage.local.set({ [KEY]: state });
}

function broadcast(message: unknown): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id == null) continue;
      chrome.tabs.sendMessage(tab.id, message, () => {
        void chrome.runtime.lastError;
      });
    }
  });
}

async function record(state: Stored, action: AgentAction, verdict: Verdict): Promise<Stored> {
  const next: Stored = {
    ...state,
    events: [
      createAuditEvent({
        action,
        verdict,
        policyId: state.policy?.id,
        policyName: state.policy?.name,
      }),
      ...state.events,
    ].slice(0, 500),
  };
  await write(next);
  return next;
}

chrome.runtime.onMessage.addListener((message: { type?: string; policy?: unknown; enabled?: boolean; action?: AgentAction; url?: string }, _sender, sendResponse) => {
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
      permits.set(message.url, Date.now() + 10_000);
      sendResponse({ ok: true });
      return;
    }
    if (message.type === "check" && message.action) {
      if (!state.enabled) {
        sendResponse({
          decision: "allow",
          reason: "HallPass is paused.",
          inference: "rules",
        } satisfies Verdict);
        return;
      }
      if (!state.policy) {
        const verdict: Verdict = {
          decision: "allow",
          reason: "No policy is loaded. The gate is open.",
          inference: "rules",
        };
        sendResponse(verdict);
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
    const action: AgentAction = {
      type: "download",
      url: item.url,
      downloadFilename: item.filename,
      actor: "extension",
    };
    if (!shouldGate(action, state.policy)) return;
    const verdict = evaluate(state.policy, action);
    await record(state, action, verdict);
    if (verdict.decision !== "allow") await chrome.downloads.cancel(item.id);
  })();
});
