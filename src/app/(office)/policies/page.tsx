"use client";

import { useState } from "react";
import { InferenceBadge } from "@/components/inference-badge";
import { useHallpass } from "@/components/hallpass-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { hybridFlags, hybridReady, hybridSlots } from "@/hallpass/config";
import { compileGuardrail } from "@/hallpass/firebase";
import { DEMO_GUARDRAIL, TAX_GUARDRAIL } from "@/hallpass/scenarios";
import type { Decision, Policy } from "@/hallpass/types";

export default function PoliciesPage() {
  const { activePolicy, hydrated } = useHallpass();
  const [note, setNote] = useState<string | null>(null);
  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <p className="text-sm text-muted-foreground">Opening the desk…</p>
      </main>
    );
  }
  return (
    <PolicyEditor
      key={`${activePolicy.id}:${activePolicy.compiledAt}`}
      policy={activePolicy}
      note={note}
      onNote={setNote}
    />
  );
}

function PolicyEditor({
  policy: initial,
  note,
  onNote,
}: {
  policy: Policy;
  note: string | null;
  onNote: (note: string | null) => void;
}) {
  const { policies, savePolicy, setActive, mode } = useHallpass();
  const [draft, setDraft] = useState(initial.sourceText);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [policy, setPolicy] = useState<Policy>(initial);

  function load(next: Policy) {
    setActive(next.id);
    setPolicy(next);
    setDraft(next.sourceText);
    onNote(null);
  }

  async function compile() {
    setBusy(true);
    onNote(null);
    setProgress(null);
    try {
      const outcome = await compileGuardrail(draft, (value) => setProgress(value));
      setPolicy(outcome.policy);
      savePolicy(outcome.policy);
      onNote(outcome.note ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Guardrails</p>
      <h1 className="font-display mt-2 text-4xl text-primary">Write the rule. Compile the pass.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Plain English goes in. A JSON policy comes out. With Firebase configured, compilation prefers
        Gemini Nano in Chrome 139+ and falls back to cloud Gemini. This desk is on the {mode} path.
      </p>
      <HybridChecklist />

      <div className="mt-6 flex flex-wrap gap-2">
        {policies.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={item.id === policy.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => load(item)}
          >
            {item.name}
          </Button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <label htmlFor="guardrail" className="text-sm font-medium">
            Guardrail
          </label>
          <Textarea
            id="guardrail"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-2 min-h-56 bg-background"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" className="rounded-full" onClick={() => void compile()} disabled={busy || !draft.trim()}>
              {busy ? (mode === "hybrid" ? "Asking Gemini…" : "Compiling…") : "Compile"}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setDraft(DEMO_GUARDRAIL)}>
              Weekday desk
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setDraft(TAX_GUARDRAIL)}>
              Tax season
            </Button>
          </div>
          {progress != null && busy ? (
            <p className="mt-3 text-xs text-muted-foreground">On-device model download {Math.round(progress * 100)}%</p>
          ) : null}
          {note ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground" role="status">
              {note}
            </p>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-primary">{policy.name}</h2>
              <p className="text-xs text-muted-foreground">Compiled {policy.compiledAt}</p>
            </div>
            <InferenceBadge source={policy.compiledBy} />
          </div>
          <ul className="grid gap-3">
            {policy.rules.map((rule) => (
              <li key={rule.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{rule.description}</p>
                  <DecisionPill decision={rule.decision} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.reason}</p>
                <p className="mt-2 font-mono text-[11px] leading-5 text-muted-foreground">
                  {rule.actionTypes.join(", ") || "any action"}
                  {rule.urlPatterns.length ? ` · ${rule.urlPatterns.join(", ")}` : ""}
                  {rule.fieldTypes.length ? ` · fields ${rule.fieldTypes.join(", ")}` : ""}
                  {rule.whenLookalike ? " · lookalike" : ""}
                  {rule.whenPromptInjection ? " · hidden instructions" : ""}
                </p>
              </li>
            ))}
            {!policy.rules.length ? (
              <li className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                This text did not compile into a rule. Say allow, deny, or ask.
              </li>
            ) : null}
          </ul>
          {policy.warnings.length ? (
            <ul className="mt-3 grid gap-2" role="alert">
              {policy.warnings.map((warning) => (
                <li key={warning} className="text-sm leading-6 text-amber-900">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="mt-4 rounded-full">
                View JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Compiled policy</DialogTitle>
                <DialogDescription>This is the document the extension and the SDK enforce.</DialogDescription>
              </DialogHeader>
              <pre className="overflow-auto rounded-xl bg-[#1b2836] p-4 text-xs leading-5 text-[#f4efe4]">
                {JSON.stringify(policy, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
}

function HybridChecklist() {
  const flags = hybridFlags({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY,
    NEXT_PUBLIC_HALLPASS_INFERENCE: process.env.NEXT_PUBLIC_HALLPASS_INFERENCE,
  });
  const slots = hybridSlots(flags);
  const ready = hybridReady(flags);
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4" data-testid="hybrid-readiness">
      <h2 className="font-display text-xl text-primary">What Compile will call</h2>
      <ul className="mt-3 grid gap-1 text-sm">
        {slots.map((slot) => (
          <li key={slot.id}>
            <span className="font-medium">{slot.present ? "Ready" : "Missing"}</span>
            <span className="text-muted-foreground"> · {slot.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {ready
          ? "Compile prefers Gemini Nano in Chrome 139+ and falls back to cloud Gemini. App Check runs first."
          : flags.forcedRules
            ? "Inference is pinned to rules, so Compile will not call the model."
            : "Compile stays on the rules engine until every slot is ready. The values stay in .env.local."}
      </p>
    </section>
  );
}

function DecisionPill({ decision }: { decision: Decision }) {
  const label = decision === "require_approval" ? "Ask" : decision === "deny" ? "Deny" : "Allow";
  const tone =
    decision === "deny"
      ? "bg-red-100 text-red-900"
      : decision === "require_approval"
        ? "bg-amber-100 text-amber-950"
        : "bg-emerald-100 text-emerald-950";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${tone}`}>{label}</span>;
}
