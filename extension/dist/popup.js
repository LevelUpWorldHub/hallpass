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
    if (list) {
      list.innerHTML = state.events.slice(0, 5).map(
        (event) => `<li><strong>${label(event.verdict.decision)}</strong> \xB7 ${event.action.type}<br /><span class="muted">${event.verdict.reason}</span></li>`
      ).join("");
      if (!state.events.length) list.innerHTML = `<li class="muted">No knocks yet.</li>`;
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
        void chrome.runtime.sendMessage({ type: "import-policy", policy }).then(() => render());
      } catch {
        if (statusNode) statusNode.textContent = "That file is not a HallPass policy.";
      }
    };
    reader.readAsText(picked);
  });
  void render();
})();
