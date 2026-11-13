"use strict";
(() => {
  // extension/src/popup.ts
  var policyNode = document.querySelector("#policy");
  var statusNode = document.querySelector("#status");
  var toggle = document.querySelector("#toggle");
  var list = document.querySelector("#events");
  var file = document.querySelector("#import");
  function label(decision) {
    if (decision === "deny") return "Denied";
    if (decision === "require_approval") return "Hall pass";
    return "Allowed";
  }
  async function render() {
    const state = await chrome.runtime.sendMessage({ type: "get-state" });
    if (policyNode) policyNode.textContent = state.policy?.name ?? "No policy yet";
    if (statusNode) statusNode.textContent = state.enabled ? "The gate is watching." : "Paused. Actions pass through.";
    if (toggle) toggle.textContent = state.enabled ? "Pause" : "Resume";
    if (list) fillEvents(list, state.events);
  }
  function fillEvents(list2, events) {
    list2.replaceChildren();
    const rows = events.slice(0, 5);
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No knocks yet.";
      list2.append(empty);
      return;
    }
    for (const event of rows) {
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = label(event.verdict.decision);
      const reason = document.createElement("span");
      reason.className = "muted";
      reason.textContent = event.verdict.reason;
      item.append(strong, document.createTextNode(` \xB7 ${event.action.type}`), document.createElement("br"), reason);
      list2.append(item);
    }
  }
  toggle?.addEventListener("click", () => {
    void (async () => {
      const state = await chrome.runtime.sendMessage({ type: "get-state" });
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
        void chrome.runtime.sendMessage({ type: "import-policy", policy }).then((response) => {
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
})();
