"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HallPassCard } from "@/components/hall-pass-card";
import { useHallpass } from "@/components/hallpass-provider";
import { Button } from "@/components/ui/button";
import { decisionLabel } from "@/components/inference-badge";
import { firstRunBeats, type FirstRunBeat } from "@/hallpass/first-run";

const BEATS = firstRunBeats();

export function FirstDrill() {
  const { record } = useHallpass();
  const filed = useRef(new Set<string>());
  const [filedIds, setFiledIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const beat = BEATS[index] ?? BEATS[0];

  function file(item: FirstRunBeat) {
    if (filed.current.has(item.id)) return;
    filed.current.add(item.id);
    setFiledIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
    record(
      item.action,
      { decision: item.decision, reason: item.reason, inference: "rules", policySource: "rules" },
      item.policy,
    );
  }

  useEffect(() => {
    if (!playing) return;
    let cursor = index;
    const timer = window.setInterval(() => {
      cursor = (cursor + 1) % BEATS.length;
      const item = BEATS[cursor];
      setIndex(cursor);
      if (item) file(item);
    }, 1700);
    return () => window.clearInterval(timer);
    // The interval owns the cursor. Restarting it on every beat would skip ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!beat) return null;

  function choose(next: number) {
    setPlaying(false);
    setIndex(next);
    const item = BEATS[next];
    if (item) file(item);
  }

  function play() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const next = (index + 1) % BEATS.length;
      setPlaying(false);
      setIndex(next);
      const item = BEATS[next];
      if (item) file(item);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    const item = BEATS[index];
    if (item) file(item);
    setPlaying(true);
  }

  return (
    <div id="first-drill">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a5a00] uppercase">
          Check {index + 1} of {BEATS.length} · {beat.title}
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a00]"
          onClick={play}
          aria-pressed={playing}
        >
          {playing ? "Pause" : "Play the three checks"}
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Scripted checks">
        {BEATS.map((item, itemIndex) => (
          <Button
            key={item.id}
            type="button"
            variant={itemIndex === index ? "default" : "outline"}
            className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a00]"
            aria-pressed={itemIndex === index}
            onClick={() => choose(itemIndex)}
          >
            {item.label} check
          </Button>
        ))}
      </div>
      <p className="mb-3 text-sm leading-6 text-muted-foreground">
        Guardrail: {beat.guardrail}{" "}
        <Link href={beat.page} className="font-medium text-primary underline-offset-4 hover:underline">
          Open the drill
        </Link>
      </p>
      <HallPassCard
        destination={beat.destination}
        request={beat.request}
        reason={beat.reason}
        decision={beat.decision}
        inference="rules"
      />
      {filedIds.includes(beat.id) ? (
        <p className="mt-3 text-sm text-muted-foreground">Filed in the ledger.</p>
      ) : null}
      <p className="sr-only" aria-live="polite" data-testid="first-drill-decision">
        {beat.decision}. {decisionLabel(beat.decision)}. {beat.reason}
      </p>
    </div>
  );
}
