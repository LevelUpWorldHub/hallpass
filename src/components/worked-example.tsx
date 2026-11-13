import { scorecardCounts, runScorecard } from "@/hallpass/scorecard";

const counts = scorecardCounts(runScorecard());

export function WorkedExample() {
  return (
    <aside className="mt-4 rounded-2xl border border-border bg-card p-5" data-testid="worked-example">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a5a00] uppercase">What this run shows</p>
      <p className="mt-2 text-sm leading-6">
        This build grades {counts.guardrails} guardrails and {counts.checks} scripted actions. The engine denies{" "}
        {counts.denies}, asks for a hall pass on {counts.asks}, and waves {counts.allows} through. One of the denials
        is Pay now on paypa1.com. The same click on www.paypal.com is waved through. Chrome&apos;s User Alignment
        Critic does not publish that pair for a rule you wrote. veto-browse and chrome-use grade their own agents,
        not this scorecard.
      </p>
    </aside>
  );
}
