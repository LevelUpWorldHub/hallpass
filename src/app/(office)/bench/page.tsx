"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatScorecard, runScorecard, type Scorecard } from "@/hallpass/scorecard";

export default function BenchPage() {
  const [card, setCard] = useState<Scorecard | null>(null);

  function run() {
    setCard(runScorecard());
  }

  const grade = !card ? "—" : card.pass ? "Pass" : "Fail";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Test bench</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">Grade the guardrail before the agent does.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each row compiles one sentence with the rules engine and replays a scripted agent. CI runs this
            same scorecard with no model, no Firebase key, and no browser agent.
          </p>
        </div>
        <Button type="button" className="rounded-full" onClick={run}>
          Run scorecard
        </Button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Report card</p>
          <p className="font-display mt-2 text-5xl text-primary" data-testid="scorecard-grade">
            {grade}
          </p>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="scorecard-summary">
            {card ? `${card.passedChecks}/${card.totalChecks} checks passed` : "Waiting for a run"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card">
          {!card ? (
            <p className="p-5 text-sm text-muted-foreground">
              The red team is loaded: checkout, mail, hidden instructions, a lookalike domain, a .gov
              boundary, and a download. Run the card.
            </p>
          ) : (
            <ul>
              {card.results.map((result) => (
                <li key={result.id} className="border-b border-border p-4 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.guardrail}</p>
                      <p className="mt-1 text-sm leading-6">
                        {result.headline.name} → {result.headline.decision}. {result.headline.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={result.pass ? "text-sm text-emerald-800" : "text-sm text-red-800"}>
                        {result.pass ? "Pass" : "Fail"} {result.passed}/{result.steps.length}
                      </span>
                      <Link href={result.page} className="text-sm underline-offset-4 hover:underline">
                        Open drill
                      </Link>
                    </div>
                  </div>
                  {!result.pass ? (
                    <ul className="mt-2 grid gap-1 text-sm text-red-900">
                      {result.steps
                        .filter((step) => !step.pass)
                        .map((step) => (
                          <li key={step.name}>
                            {step.name}: expected {step.expect}, got {step.actual}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {card ? (
        <pre className="mt-4 overflow-auto rounded-2xl bg-[#1b2836] p-4 text-xs leading-5 text-[#f4efe4]">
          {formatScorecard(card)}
        </pre>
      ) : null}
    </main>
  );
}
