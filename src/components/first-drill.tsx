"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HallPassCard } from "@/components/hall-pass-card";
import { Button } from "@/components/ui/button";
import { decisionLabel } from "@/components/inference-badge";
import { firstRunBeats } from "@/hallpass/first-run";

const BEATS = firstRunBeats();

export function FirstDrill() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const beat = BEATS[index] ?? BEATS[0];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % BEATS.length);
    }, 1700);
    return () => window.clearInterval(timer);
  }, [playing]);

  if (!beat) return null;

  function choose(next: number) {
    setPlaying(false);
    setIndex(next);
  }

  function play() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPlaying(false);
      setIndex((current) => (current + 1) % BEATS.length);
      return;
    }
    setPlaying((current) => !current);
  }

  return (
    <div id="first-drill">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a5a00] uppercase">First three checks</p>
        <Button type="button" variant="outline" className="rounded-full" onClick={play} aria-pressed={playing}>
          {playing ? "Pause" : "Play the three checks"}
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Scripted checks">
        {BEATS.map((item, itemIndex) => (
          <Button
            key={item.id}
            type="button"
            variant={itemIndex === index ? "default" : "outline"}
            className="rounded-full"
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
      <p className="sr-only" aria-live="polite" data-testid="first-drill-decision">
        {beat.decision}. {decisionLabel(beat.decision)}. {beat.reason}
      </p>
    </div>
  );
}
