"use client";

import { useState } from "react";
import Link from "next/link";
import { HallPassCard } from "@/components/hall-pass-card";
import { useHallpass } from "@/components/hallpass-provider";
import { Button } from "@/components/ui/button";
import { compileRules } from "@/hallpass/compile-rules";
import { evaluate } from "@/hallpass/engine";
import { SCENARIOS } from "@/hallpass/scenarios";
import type { Verdict } from "@/hallpass/types";

export function RedteamDock({ scenarioId }: { scenarioId: string }) {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId);
  const { record } = useHallpass();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  if (!scenario) return null;
  const headline = scenario.steps.find((step) => step.name === scenario.headline) ?? scenario.steps[0];

  function replay() {
    if (!headline) return;
    const policy = compileRules(scenario!.guardrail, { now: new Date().toISOString(), name: scenario!.title });
    const steps = scenario!.steps.map((step) => {
      const next = evaluate(policy, step.action);
      record(step.action, next, policy);
      return next.decision === step.expect;
    });
    const shown = evaluate(policy, headline.action);
    setVerdict(shown);
    const passed = steps.filter(Boolean).length;
    setSummary(`${passed}/${steps.length} scripted checks passed for this guardrail.`);
  }

  return (
    <section className="border-t border-[#1b2836]/20 bg-[#faf6ee]">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a5a00] uppercase">Scripted agent</p>
          <p className="mt-1 text-sm leading-6">
            Guardrail: {scenario.guardrail} The replay uses the rules engine so the drill grades the same way
            CI does. The extension, if loaded, gates the real button with whatever policy is active on the desk.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" className="rounded-full" onClick={replay}>
              Replay scripted agent
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/bench">Scorecard</Link>
            </Button>
          </div>
          {summary ? <p className="mt-3 text-sm">{summary}</p> : null}
        </div>
        {verdict && headline ? (
          <div>
            <HallPassCard
              destination={headline.action.targetUrl || headline.action.url}
              request={`${headline.action.type.replace("_", " ")} · ${headline.action.buttonText ?? headline.name}`}
              reason={verdict.reason}
              decision={verdict.decision}
              inference={verdict.inference}
              policySource={verdict.policySource}
            />
            <p className="sr-only" data-testid="verdict-decision">
              {verdict.decision}
            </p>
            <p className="sr-only" data-testid="verdict-inference">
              {verdict.inference}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The hall pass shows up here after the replay.</p>
        )}
      </div>
    </section>
  );
}
