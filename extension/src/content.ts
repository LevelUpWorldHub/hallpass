import { actionFromClick, actionFromSubmit, type ControlMeta } from "../../src/hallpass/fields";
import { shouldGate } from "../../src/hallpass/engine";
import { detectInjection, injectionExcerpt, isHiddenStyle } from "../../src/hallpass/injection";
import type { AgentAction, PageSignals, Policy, Verdict } from "../../src/hallpass/types";

let policy: Policy | null = null;
let enabled = true;

function isLocalWorkbench(): boolean {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

async function refresh(): Promise<void> {
  const state = (await chrome.runtime.sendMessage({ type: "get-state" })) as {
    policy?: Policy | null;
    enabled?: boolean;
  };
  policy = state?.policy ?? null;
  enabled = state?.enabled !== false;
}

void refresh().catch(() => undefined);

chrome.runtime.onMessage.addListener((message: { type?: string; policy?: Policy | null; enabled?: boolean }) => {
  if (message.type === "policy") {
    policy = message.policy ?? null;
    enabled = message.enabled !== false;
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window || !isLocalWorkbench()) return;
  const data = event.data as { source?: string; type?: string; policy?: Policy };
  if (data?.source !== "hallpass-workbench") return;
  if (data.type === "push-policy") {
    void chrome.runtime.sendMessage({ type: "set-policy", policy: data.policy });
  }
  if (data.type === "pull-audit") {
    void chrome.runtime.sendMessage({ type: "get-audit" }).then((state: { events?: unknown }) => {
      window.postMessage(
        { source: "hallpass-extension", type: "audit", events: state?.events ?? [] },
        window.location.origin,
      );
    });
  }
});

function controlMeta(element: Element): ControlMeta {
  const named = element as HTMLInputElement;
  return {
    tag: element.tagName.toLowerCase(),
    type: named.type,
    name: element.getAttribute("name") || undefined,
    id: element.id || undefined,
    autocomplete: element.getAttribute("autocomplete") || undefined,
    placeholder: "placeholder" in named ? named.placeholder : undefined,
    text: "innerText" in element ? (element as HTMLElement).innerText : undefined,
    href: element instanceof HTMLAnchorElement ? element.href : undefined,
    download: element.getAttribute("download"),
  };
}

function formControls(form: HTMLFormElement | null): ControlMeta[] {
  if (!form) return [];
  return [...form.elements].map((element) => controlMeta(element));
}

function pageSignals(): PageSignals {
  const nodes = document.querySelectorAll("body *");
  let seen = 0;
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (++seen > 1500) break;
    const text = node.textContent ?? "";
    if (text.length < 12 || text.length > 2000 || !detectInjection(text)) continue;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const offscreen = rect.right < 0 || rect.bottom < 0 || (rect.width < 1 && rect.height < 1);
    const hidden = isHiddenStyle({
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      fontSize: style.fontSize,
      textIndent: style.textIndent,
      ariaHidden: node.getAttribute("aria-hidden") === "true",
      hiddenAttr: node.hidden,
      offscreen,
    });
    if (!hidden) continue;
    return { hiddenInstruction: true, injectionExcerpt: injectionExcerpt(text) };
  }
  return { hiddenInstruction: false };
}

function describeClick(element: HTMLElement): AgentAction | null {
  const form = element.closest("form");
  const action = actionFromClick(controlMeta(element), location.href, formControls(form));
  if (!action) return null;
  return { ...action, pageSignals: pageSignals() };
}

function describeSubmit(form: HTMLFormElement): AgentAction {
  const submitter = form.querySelector<HTMLElement>("button[type=submit], input[type=submit], button:not([type])");
  return {
    ...actionFromSubmit(location.href, formControls(form), submitter?.innerText || submitter?.getAttribute("value") || undefined),
    pageSignals: pageSignals(),
  };
}

function overlayHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>("[data-hallpass-overlay]");
  if (host) return host;
  host = document.createElement("div");
  host.dataset.hallpassOverlay = "true";
  host.style.all = "initial";
  (document.body ?? document.documentElement).appendChild(host);
  host.attachShadow({ mode: "open" });
  return host;
}

function paint(verdict: Verdict, action: AgentAction, mode: "deny" | "ask"): Promise<boolean> {
  const host = overlayHost();
  const shadow = host.shadowRoot!;
  const destination = action.targetUrl || action.url;
  const request = `${action.type.replace("_", " ")}${action.buttonText ? ` · ${action.buttonText}` : ""}`;
  const stamp = mode === "deny" ? "Denied" : "Sign";
  const tone = mode === "deny" ? "#9d1c1c" : "#8a5a00";
  const badge =
    verdict.inference === "on_device" ? "On-device" : verdict.inference === "cloud" ? "Cloud" : "Rules";
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char] ?? char;
  });
}

function fromOverlay(event: Event): boolean {
  return event.composedPath().some((node) => node instanceof HTMLElement && node.dataset.hallpassOverlay === "true");
}

async function judge(action: AgentAction): Promise<Verdict> {
  return (await chrome.runtime.sendMessage({ type: "check", action })) as Verdict;
}

function release(element: HTMLElement): void {
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
  }, 1000);
}

async function gate(action: AgentAction, element: HTMLElement): Promise<void> {
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
  true,
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
    const button = form.querySelector<HTMLElement>("button[type=submit], input[type=submit], button:not([type])");
    void gate(action, button ?? form);
  },
  true,
);
