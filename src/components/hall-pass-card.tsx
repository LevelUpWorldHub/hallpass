import { decisionLabel, decisionTone, InferenceBadge } from "@/components/inference-badge";
import { disagreement } from "@/hallpass/hybrid";
import type { Decision, InferenceSource } from "@/hallpass/types";

export function HallPassCard({
  serial = "HP-2026-0142",
  who = "Browser agent",
  destination,
  request,
  reason,
  decision,
  inference,
  policySource,
  rulesDecision,
}: {
  serial?: string;
  who?: string;
  destination: string;
  request: string;
  reason: string;
  decision: Decision;
  inference: InferenceSource;
  policySource?: InferenceSource;
  rulesDecision?: Decision;
}) {
  const stamp = decision === "deny" ? "Denied" : decision === "require_approval" ? "Sign" : "Pass";
  const aside = disagreement({ decision, rulesDecision });
  return (
    <article className="ticket relative overflow-hidden rounded-2xl border border-border pl-6">
      <div className="pass-stripe h-3" />
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            Hall pass · {serial}
          </p>
          <h3 className="font-display mt-1 text-2xl text-primary">One action, one signature.</h3>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-muted-foreground">Who</dt>
              <dd>{who}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="break-all font-mono text-xs">{destination}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-muted-foreground">Request</dt>
              <dd>{request}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-muted-foreground">Monitor</dt>
              <dd className="flex flex-wrap gap-2">
                <InferenceBadge source={inference} />
                {policySource && policySource !== inference ? (
                  <span className="text-xs text-muted-foreground">Policy compiled: {policySource.replace("_", " ")}</span>
                ) : null}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6">{reason}</p>
          {aside ? (
            <p className="mt-2 text-sm leading-6" role="status">
              {aside}
            </p>
          ) : null}
        </div>
        <p className={`stamp ${decisionTone(decision)}`} aria-label={decisionLabel(decision)}>
          {stamp}
        </p>
      </div>
    </article>
  );
}
