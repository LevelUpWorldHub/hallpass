import { decisionLabel } from "@/components/inference-badge";
import { lookalikePair } from "@/hallpass/first-run";

const pair = lookalikePair();

function Side({
  kicker,
  url,
  decision,
}: {
  kicker: string;
  url: string;
  decision: string;
}) {
  const denied = decision === "deny";
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a5a00] uppercase">{kicker}</p>
      <p className="mt-2 break-all font-mono text-sm">{url}</p>
      <p className="mt-3 text-sm text-muted-foreground">Button: Pay now</p>
      <p className={`font-display mt-4 text-4xl ${denied ? "text-red-800" : "text-emerald-800"}`}>
        {decisionLabel(decision as "allow" | "deny" | "require_approval")}
      </p>
    </article>
  );
}

export function LookalikePair() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12" data-testid="lookalike-pair">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">One click, two hosts</p>
      <h2 className="font-display mt-2 max-w-2xl text-4xl text-primary">The real host is waved through. The lookalike is not.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Guardrail: {pair.guardrail} Both cards are the rules engine, on the same Pay now click. Chrome&apos;s
        critic does not grade this pair before the agent runs.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Side kicker="Real host" url={pair.real.url} decision={pair.real.verdict.decision} />
        <Side kicker="Lookalike" url={pair.fake.url} decision={pair.fake.verdict.decision} />
      </div>
    </section>
  );
}
