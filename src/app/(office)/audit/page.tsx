"use client";

import { useMemo, useState } from "react";
import { InferenceBadge } from "@/components/inference-badge";
import { useHallpass } from "@/components/hallpass-provider";
import { Button } from "@/components/ui/button";
import { exportAuditJson } from "@/hallpass/audit";
import type { AuditEvent, Decision } from "@/hallpass/types";

const FILTERS: Array<Decision | "all"> = ["all", "deny", "require_approval", "allow"];

export default function AuditPage() {
  const { events, clearAudit, replaceEvents } = useHallpass();
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [note, setNote] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? events : events.filter((event) => event.verdict.decision === filter)),
    [events, filter],
  );

  function download() {
    const blob = new Blob([exportAuditJson(events)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hallpass-audit.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function pullExtension() {
    setNote(null);
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; events?: AuditEvent[] };
      if (data?.source !== "hallpass-extension" || data.type !== "audit" || !data.events) return;
      window.removeEventListener("message", onMessage);
      const merged = new Map<string, AuditEvent>();
      for (const item of [...data.events, ...events]) merged.set(item.id, item);
      replaceEvents([...merged.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 500));
      setNote(`Merged ${data.events.length} extension events into the ledger.`);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "hallpass-workbench", type: "pull-audit" }, window.location.origin);
    window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setNote((current) => current ?? "No extension answered. Load HallPass unpacked, then try again.");
    }, 800);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Ledger</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">Every knock at the door.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Verdicts stay in this browser. Export them when you want a record. The file contains URLs,
            button labels, and field types. It does not contain field values.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={pullExtension}>
            Pull extension log
          </Button>
          <Button type="button" className="rounded-full" onClick={download} disabled={!events.length}>
            Export JSON
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={clearAudit} disabled={!events.length}>
            Clear
          </Button>
        </div>
      </div>
      {note ? <p className="mt-4 text-sm text-muted-foreground">{note}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            variant={filter === item ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(item)}
          >
            {item === "require_approval" ? "Hall pass" : item === "all" ? "All" : item}
          </Button>
        ))}
      </div>

      {!visible.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8">
          <h2 className="font-display text-2xl text-primary">The hall is quiet.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Play a check on the desk, replay a red-team drill, or browse with the extension. Each
            intercepted action lands here with its verdict and the badge that says who decided.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {visible.map((event) => (
            <li key={event.id} className="grid gap-2 p-4 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
              <p className="font-mono text-xs text-muted-foreground">{event.at.slice(11, 19)}</p>
              <div>
                <p className="text-sm font-medium">
                  {event.verdict.decision === "require_approval"
                    ? "Hall pass"
                    : event.verdict.decision === "deny"
                      ? "Denied"
                      : "Allowed"}{" "}
                  · {event.action.type.replace("_", " ")}
                </p>
                <p className="text-sm text-muted-foreground">{event.verdict.reason}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {event.action.targetUrl || event.action.url}
                </p>
              </div>
              <InferenceBadge source={event.verdict.inference} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
