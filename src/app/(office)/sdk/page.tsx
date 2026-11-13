"use client";

import { useState } from "react";
import { HallPassCard } from "@/components/hall-pass-card";
import { useHallpass } from "@/components/hallpass-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { check } from "@/hallpass";
import { classifyWithHybrid } from "@/hallpass/firebase";
import type { ActionType, AgentAction, FieldType, Verdict } from "@/hallpass/types";

const SAMPLE = `import { check } from "hallpass";

const verdict = await check(
  {
    type: "form_submit",
    url: location.href,
    buttonText: "Pay now",
    fieldTypes: ["payment"],
  },
  { policy, mode: "rules" },
);

if (verdict.decision === "deny") {
  throw new Error(verdict.reason);
}`;

export default function SdkPage() {
  const { activePolicy, record, mode } = useHallpass();
  const [type, setType] = useState<ActionType>("form_submit");
  const [url, setUrl] = useState("https://shop.example/checkout");
  const [buttonText, setButtonText] = useState("Pay now");
  const [fields, setFields] = useState("payment");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  function action(): AgentAction {
    const fieldTypes = fields
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as FieldType[];
    return { type, url, buttonText, fieldTypes, actor: "sdk" };
  }

  async function run(hybrid: boolean) {
    setBusy(true);
    try {
      const next = await check(action(), {
        policy: activePolicy,
        mode: hybrid ? "hybrid" : "rules",
        classify: hybrid ? classifyWithHybrid : undefined,
      });
      setVerdict(next);
      record(action(), next, activePolicy);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">SDK</p>
        <h1 className="font-display mt-2 text-4xl text-primary">hallpass.check(action)</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Agent builders call this before they click, submit, navigate, or download. Pass{" "}
          <code className="font-mono text-xs">mode: &quot;rules&quot;</code> in CI. Pass{" "}
          <code className="font-mono text-xs">mode: &quot;hybrid&quot;</code> with a classifier when Firebase
          AI Logic is configured. The active policy on this desk is {activePolicy.name}.
        </p>
        <pre className="mt-5 overflow-auto rounded-2xl bg-[#1b2836] p-4 text-xs leading-6 text-[#f4efe4]">{SAMPLE}</pre>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          The browser build is <code className="font-mono">sdk/hallpass.js</code>. It exposes{" "}
          <code className="font-mono">window.hallpass</code> after you load the script.
        </p>
      </div>
      <form
        className="rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void run(false);
        }}
      >
        <h2 className="font-display text-2xl text-primary">Try an action</h2>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="action-type">Action</Label>
            <select
              id="action-type"
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as ActionType)}
            >
              <option value="form_submit">form_submit</option>
              <option value="click">click</option>
              <option value="navigate">navigate</option>
              <option value="download">download</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="action-url">URL</Label>
            <Input id="action-url" value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="action-button">Button text</Label>
            <Input id="action-button" value={buttonText} onChange={(event) => setButtonText(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="action-fields">Field types</Label>
            <Input id="action-fields" value={fields} onChange={(event) => setFields(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" className="rounded-full" disabled={busy}>
            Check with rules
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy || mode !== "hybrid"}
            onClick={() => void run(true)}
          >
            Ask Gemini
          </Button>
        </div>
        {mode !== "hybrid" ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Ask Gemini stays quiet until Firebase and the reCAPTCHA Enterprise site key are in{" "}
            <code className="font-mono">.env.local</code>. The rules check works today.
          </p>
        ) : null}
        {verdict ? (
          <div className="mt-5">
            <HallPassCard
              destination={url}
              request={`${type} · ${buttonText || "no button"}`}
              reason={verdict.reason}
              decision={verdict.decision}
              inference={verdict.inference}
              policySource={verdict.policySource}
              rulesDecision={verdict.rulesDecision}
            />
          </div>
        ) : null}
      </form>
    </main>
  );
}
