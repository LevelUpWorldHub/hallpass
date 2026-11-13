"use strict";
(() => {
  // src/hallpass/escape.ts
  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return map[char] ?? char;
    });
  }

  // src/hallpass/fields.ts
  var PAYMENT_HINT = /\b(cc-number|cc-exp|cc-csc|cc-name|cardnumber|card-number|cvv|cvc|pan|payment|creditcard|credit-card)\b/i;
  var EMAIL_COMPOSE_NAMES = /^(to|recipient|cc|bcc|subject|body|message|content)$/i;
  function blob(control) {
    return [control.type, control.name, control.id, control.autocomplete, control.placeholder, control.label].filter(Boolean).join(" ").toLowerCase();
  }
  function fieldTypeFromControl(control) {
    const text = blob(control);
    if (!text) return null;
    if (PAYMENT_HINT.test(text) || control.autocomplete?.toLowerCase().startsWith("cc-")) return "payment";
    if (control.type === "password" || /\b(password|passwd)\b/i.test(text)) return "password";
    if (/\b(username|user-name|login)\b/i.test(text)) return "credentials";
    return null;
  }
  function fieldTypesFromControls(controls) {
    const types = /* @__PURE__ */ new Set();
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
  function actionFromClick(control, pageUrl, formControls2) {
    const text = (control.text || control.label || "").replace(/\s+/g, " ").trim();
    const downloadName = control.download;
    const href = control.href;
    let type = "click";
    if (downloadName != null && downloadName !== "") type = "download";
    else if (control.tag === "a" && href) type = "navigate";
    else if (control.type === "submit" || control.tag === "button" || control.tag === "input") type = "click";
    const fieldTypes = fieldTypesFromControls(formControls2);
    const target = type === "navigate" && href ? href : pageUrl;
    return {
      type,
      url: pageUrl,
      targetUrl: target,
      buttonText: text || void 0,
      fieldTypes: fieldTypes.filter((field) => field !== "generic"),
      fieldNames: formControls2.map((item) => item.name || item.id || "").filter(Boolean),
      downloadFilename: downloadName || void 0,
      actor: "extension"
    };
  }
  function actionFromSubmit(pageUrl, formControls2, buttonText) {
    const fieldTypes = fieldTypesFromControls(formControls2);
    return {
      type: "form_submit",
      url: pageUrl,
      buttonText: buttonText?.replace(/\s+/g, " ").trim() || void 0,
      fieldTypes,
      fieldNames: formControls2.map((item) => item.name || item.id || "").filter(Boolean),
      actor: "extension"
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
  function injectionExcerpt(text, limit = 180) {
    if (!text || !detectInjection(text)) return void 0;
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= limit) return collapsed;
    return `${collapsed.slice(0, limit - 1)}\u2026`;
  }
  function isHiddenStyle(style) {
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

  // src/hallpass/engine.ts
  var SENSITIVE_CLICK = /\b(pay|purchase|buy|checkout|place order|send|delete|remove|download|transfer|wire|subscribe)\b/i;
  function shouldGate(action, policy2) {
    if (!policy2) return false;
    if (action.type === "form_submit" || action.type === "download") return true;
    if (action.type === "navigate") {
      return policy2.rules.some((rule) => rule.actionTypes.length === 0 || rule.actionTypes.includes("navigate"));
    }
    if (action.type === "click") {
      if (SENSITIVE_CLICK.test(action.buttonText ?? "")) return true;
      if (action.fieldTypes?.includes("payment") || action.fieldTypes?.includes("email_compose")) return true;
    }
    return false;
  }

  // extension/src/content.ts
  var policy = null;
  var enabled = true;
  function isLocalWorkbench() {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1";
  }
  async function refresh() {
    const state = await chrome.runtime.sendMessage({ type: "get-state" });
    policy = state?.policy ?? null;
    enabled = state?.enabled !== false;
  }
  void refresh().catch(() => void 0);
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "policy") {
      policy = message.policy ?? null;
      enabled = message.enabled !== false;
    }
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window || !isLocalWorkbench()) return;
    const data = event.data;
    if (data?.source !== "hallpass-workbench") return;
    if (data.type === "push-policy") {
      void chrome.runtime.sendMessage({ type: "set-policy", policy: data.policy });
    }
    if (data.type === "pull-audit") {
      void chrome.runtime.sendMessage({ type: "get-audit" }).then((state) => {
        window.postMessage(
          { source: "hallpass-extension", type: "audit", events: state?.events ?? [] },
          window.location.origin
        );
      });
    }
  });
  function controlMeta(element) {
    const named = element;
    return {
      tag: element.tagName.toLowerCase(),
      type: named.type,
      name: element.getAttribute("name") || void 0,
      id: element.id || void 0,
      autocomplete: element.getAttribute("autocomplete") || void 0,
      placeholder: "placeholder" in named ? named.placeholder : void 0,
      text: "innerText" in element ? element.innerText : void 0,
      href: element instanceof HTMLAnchorElement ? element.href : void 0,
      download: element.getAttribute("download")
    };
  }
  function formControls(form) {
    if (!form) return [];
    return [...form.elements].map((element) => controlMeta(element));
  }
  function pageSignals() {
    const nodes = document.querySelectorAll("body *");
    let seen = 0;
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (++seen > 1500) break;
      const text = node.textContent ?? "";
      if (text.length < 12 || text.length > 2e3 || !detectInjection(text)) continue;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const offscreen = rect.right < 0 || rect.bottom < 0 || rect.width < 1 && rect.height < 1;
      const hidden = isHiddenStyle({
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        ariaHidden: node.getAttribute("aria-hidden") === "true",
        hiddenAttr: node.hidden,
        offscreen
      });
      if (!hidden) continue;
      return { hiddenInstruction: true, injectionExcerpt: injectionExcerpt(text) };
    }
    return { hiddenInstruction: false };
  }
  function describeClick(element) {
    const form = element.closest("form");
    const action = actionFromClick(controlMeta(element), location.href, formControls(form));
    if (!action) return null;
    return { ...action, pageSignals: pageSignals() };
  }
  function describeSubmit(form) {
    const submitter = form.querySelector("button[type=submit], input[type=submit], button:not([type])");
    return {
      ...actionFromSubmit(location.href, formControls(form), submitter?.innerText || submitter?.getAttribute("value") || void 0),
      pageSignals: pageSignals()
    };
  }
  function overlayHost() {
    let host = document.querySelector("[data-hallpass-overlay]");
    if (host) return host;
    host = document.createElement("div");
    host.dataset.hallpassOverlay = "true";
    host.style.all = "initial";
    (document.body ?? document.documentElement).appendChild(host);
    host.attachShadow({ mode: "open" });
    return host;
  }
  function paint(verdict, action, mode) {
    const host = overlayHost();
    const shadow = host.shadowRoot;
    const destination = action.targetUrl || action.url;
    const request = `${action.type.replace("_", " ")}${action.buttonText ? ` \xB7 ${action.buttonText}` : ""}`;
    const stamp = mode === "deny" ? "Denied" : "Sign";
    const tone = mode === "deny" ? "#9d1c1c" : "#8a5a00";
    const badge = verdict.inference === "on_device" ? "On-device" : verdict.inference === "cloud" ? "Cloud" : "Rules";
    shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .scrim { position: fixed; inset: 0; z-index: 2147483646; background: rgba(27, 40, 54, 0.45); display: grid; place-items: end center; font-family: Georgia, "Iowan Old Style", serif; }
      .card { width: min(440px, calc(100vw - 24px)); margin: 16px; background: #faf6ee; color: #1c1915; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
      .stripe { height: 12px; background: repeating-linear-gradient(-45deg, #e2b12a, #e2b12a 8px, #f2c14e 8px, #f2c14e 16px); }
      .body { padding: 18px 18px 16px; }
      .kicker { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #6d6458; }
      h2 { margin: 6px 0 0; font-size: 28px; font-weight: 560; }
      p { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.45; }
      .row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; font-size: 13px; }
      .row span { color: #6d6458; }
      .stamp { float: right; margin-left: 12px; border: 3px solid ${tone}; color: ${tone}; padding: 4px 8px; letter-spacing: .14em; text-transform: uppercase; transform: rotate(-8deg); font-weight: 700; }
      .badge { display: inline-block; border-radius: 999px; background: #1b2836; color: #f4efe4; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; padding: 3px 8px; }
      .actions { display: flex; gap: 8px; margin-top: 14px; }
      button { font-family: ui-sans-serif, system-ui, sans-serif; border-radius: 999px; border: 1px solid #1b2836; padding: 8px 14px; cursor: pointer; }
      .primary { background: #1b2836; color: #f4efe4; }
      .ghost { background: transparent; }
    </style>
    <div class="scrim" role="dialog" aria-modal="true" aria-label="Hall pass">
      <div class="card">
        <div class="stripe"></div>
        <div class="body">
          <div class="stamp">${stamp}</div>
          <p class="kicker">Hall pass</p>
          <h2>${mode === "deny" ? "Sent back." : "Sign this one."}</h2>
          <div class="row"><span>Destination</span><div>${escapeHtml(destination)}</div></div>
          <div class="row"><span>Request</span><div>${escapeHtml(request)}</div></div>
          <p>${escapeHtml(verdict.reason)}</p>
          <p><span class="badge">${badge}</span></p>
          <div class="actions">
            ${mode === "ask" ? '<button class="primary" data-act="sign">Sign pass</button>' : ""}
            <button class="ghost" data-act="back">${mode === "ask" ? "Send back" : "Close"}</button>
          </div>
        </div>
      </div>
    </div>
  `;
    const close = () => {
      shadow.innerHTML = "";
    };
    return new Promise((resolve) => {
      shadow.querySelector("[data-act=sign]")?.addEventListener("click", () => {
        close();
        resolve(true);
      });
      shadow.querySelector("[data-act=back]")?.addEventListener("click", () => {
        close();
        resolve(false);
      });
    });
  }
  function fromOverlay(event) {
    return event.composedPath().some((node) => node instanceof HTMLElement && node.dataset.hallpassOverlay === "true");
  }
  async function judge(action) {
    return await chrome.runtime.sendMessage({ type: "check", action });
  }
  function release(element) {
    const form = element instanceof HTMLFormElement ? element : element.closest("form");
    element.setAttribute("data-hallpass-bypass", "1");
    form?.setAttribute("data-hallpass-bypass", "1");
    if (element instanceof HTMLAnchorElement && element.hasAttribute("download")) {
      void chrome.runtime.sendMessage({ type: "permit-once", url: element.href });
    }
    if (element instanceof HTMLFormElement) element.requestSubmit();
    else element.click();
    window.setTimeout(() => {
      element.removeAttribute("data-hallpass-bypass");
      form?.removeAttribute("data-hallpass-bypass");
    }, 1e3);
  }
  async function gate(action, element) {
    const verdict = await judge(action);
    if (verdict.decision === "allow") {
      release(element);
      return;
    }
    if (verdict.decision === "deny") {
      await paint(verdict, action, "deny");
      return;
    }
    const signed = await paint(verdict, action, "ask");
    if (signed) release(element);
  }
  document.addEventListener(
    "click",
    (event) => {
      if (!enabled || !policy || fromOverlay(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest("a, button, input[type=submit], [role=button]");
      if (!(element instanceof HTMLElement)) return;
      if (element.dataset.hallpassBypass === "1") return;
      const action = describeClick(element);
      if (!action || !shouldGate(action, policy)) return;
      event.preventDefault();
      event.stopPropagation();
      void gate(action, element);
    },
    true
  );
  document.addEventListener(
    "submit",
    (event) => {
      if (!enabled || !policy || fromOverlay(event)) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.hallpassBypass === "1") return;
      const action = describeSubmit(form);
      if (!shouldGate(action, policy)) return;
      event.preventDefault();
      event.stopPropagation();
      const button = form.querySelector("button[type=submit], input[type=submit], button:not([type])");
      void gate(action, button ?? form);
    },
    true
  );
})();
