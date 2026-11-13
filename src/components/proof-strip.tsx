import { scorecardCounts, runScorecard } from "@/hallpass/scorecard";

const counts = scorecardCounts(runScorecard());

const TILES = [
  { value: String(counts.guardrails), label: "Guardrails in the red team" },
  { value: `${counts.passed}/${counts.checks}`, label: "Checks passing, rules only" },
  { value: String(counts.denies), label: "Actions the engine denies" },
  { value: String(counts.asks), label: "Actions that need a hall pass" },
  { value: String(counts.allows), label: "Actions waved through" },
];

export function ProofStrip() {
  return (
    <section className="border-y border-border bg-card/60" data-testid="proof-strip">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">From this build</p>
        <h2 className="font-display mt-2 text-3xl text-primary">The red team, counted by the engine.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These figures are the rules scorecard in this page, not a slide. CI runs the same function and fails the
          build if a check stops passing.
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TILES.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-border bg-background px-4 py-3">
              <dt className="text-xs leading-5 text-muted-foreground">{tile.label}</dt>
              <dd className="font-display mt-1 text-3xl text-primary">{tile.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
