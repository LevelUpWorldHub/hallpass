interface Verdict {
  decision: "allow" | "deny" | "require_approval";
  reason: string;
}

interface EventRow {
  at: string;
  action: { type: string; url: string };
  verdict: Verdict;
}

interface State {
  policy: { name?: string } | null;
  enabled: boolean;
  events: EventRow[];
}

const policyNode = document.querySelector("#policy");
const statusNode = document.querySelector("#status");
const toggle = document.querySelector<HTMLButtonElement>("#toggle");
const list = document.querySelector("#events");
const file = document.querySelector<HTMLInputElement>("#import");

function label(decision: Verdict["decision"]): string {
  if (decision === "deny") return "Denied";
  if (decision === "require_approval") return "Hall pass";
  return "Allowed";
}

async function render(): Promise<void> {
  const state = (await chrome.runtime.sendMessage({ type: "get-state" })) as State;
  if (policyNode) policyNode.textContent = state.policy?.name ?? "No policy yet";
  if (statusNode) statusNode.textContent = state.enabled ? "The gate is watching." : "Paused. Actions pass through.";
  if (toggle) toggle.textContent = state.enabled ? "Pause" : "Resume";
  if (list) fillEvents(list, state.events);
}

function fillEvents(list: Element, events: EventRow[]): void {
  list.replaceChildren();
  const rows = events.slice(0, 5);
  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No knocks yet.";
    list.append(empty);
    return;
  }
  for (const event of rows) {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = label(event.verdict.decision);
    const reason = document.createElement("span");
    reason.className = "muted";
    reason.textContent = event.verdict.reason;
    item.append(strong, document.createTextNode(` · ${event.action.type}`), document.createElement("br"), reason);
    list.append(item);
  }
}

toggle?.addEventListener("click", () => {
  void (async () => {
    const state = (await chrome.runtime.sendMessage({ type: "get-state" })) as State;
    await chrome.runtime.sendMessage({ type: "set-enabled", enabled: !state.enabled });
    await render();
  })();
});

file?.addEventListener("change", () => {
  const picked = file.files?.[0];
  if (!picked) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const policy = JSON.parse(String(reader.result));
      void chrome.runtime.sendMessage({ type: "import-policy", policy }).then((response: { ok?: boolean }) => {
        if (!response?.ok) {
          if (statusNode) statusNode.textContent = "That file is not a HallPass policy.";
          return;
        }
        void render();
      });
    } catch {
      if (statusNode) statusNode.textContent = "That file is not a HallPass policy.";
    }
  };
  reader.readAsText(picked);
});

void render();
