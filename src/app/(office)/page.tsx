import Link from "next/link";
import { ComparisonTable } from "@/components/comparison";
import { FirstDrill } from "@/components/first-drill";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    kicker: "01",
    title: "Write it in English",
    body: "“Never submit a payment form.” Hybrid inference compiles that into a JSON policy: action types, URL patterns, field types, and a decision.",
  },
  {
    kicker: "02",
    title: "Fail it on purpose",
    body: "The test bench replays a scripted agent through a fake checkout, a compose window, a hidden-instruction page, and a lookalike domain. You get a pass/fail scorecard.",
  },
  {
    kicker: "03",
    title: "Enforce it at the door",
    body: "A Manifest V3 extension pauses the click, the submit, or the download. The agent gets a hall pass, a denial, or a wave-through. The ledger stays on this machine.",
  },
];

export default function DeskPage() {
  return (
    <main>
      <section className="ink-grid border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Built for #BuildHybridAI
            </p>
            <h1 className="font-display mt-3 max-w-xl text-5xl leading-[1.02] text-primary sm:text-6xl">
              The agent can run the errand. It still needs a hall pass.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Browser agents click, pay, send, and download inside a logged-in Chrome. HallPass is the
              workbench for writing those guardrails, grading them on a red team, and enforcing them for
              any agent that acts in the page.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Press play. Three scripted actions run against three guardrails. No Firebase key and no
              extension are required for this pass.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 rounded-full px-5">
                <Link href="#first-drill">Watch the first three checks</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-5">
                <Link href="/policies">Write a guardrail</Link>
              </Button>
            </div>
          </div>
          <FirstDrill />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-3">
        {STEPS.map((step) => (
          <article key={step.kicker} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm text-[#8a5a00]">{step.kicker}</p>
            <h2 className="font-display mt-2 text-2xl text-primary">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-primary">Where this sits</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Chrome&apos;s User Alignment Critic checks Gemini in Chrome. veto-browse and chrome-use each
              guard their own agent. HallPass is the bench you use when the agent is someone else&apos;s.
            </p>
          </div>
          <Link href="/sdk" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Call hallpass.check
          </Link>
        </div>
        <ComparisonTable />
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Sources: Google&apos;s agentic-browsing security note, the veto-browse repository, and the
          chrome-use repository. HallPass does not redact page text. That job belongs to PlainSight.
        </p>
      </section>
    </main>
  );
}
