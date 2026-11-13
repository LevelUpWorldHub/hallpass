import { cn } from "cn";
import type { InferenceSource } from "@/hallpass/types";

const COPY: Record<InferenceSource, { label: string; hint: string; className: string }> = {
  on_device: {
    label: "On-device",
    hint: "Gemini Nano answered in Chrome",
    className: "bg-emerald-800 text-emerald-50",
  },
  cloud: {
    label: "Cloud",
    hint: "Cloud Gemini answered after the on-device model was unavailable",
    className: "bg-sky-800 text-sky-50",
  },
  rules: {
    label: "Rules",
    hint: "Deterministic rules engine. No model call.",
    className: "bg-stone-700 text-stone-50",
  },
};

export function InferenceBadge({
  source,
  className,
  label,
  hint,
}: {
  source: InferenceSource;
  className?: string;
  label?: string;
  hint?: string;
}) {
  const copy = COPY[source];
  return (
    <span
      title={hint ?? copy.hint}
      data-testid="inference-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        copy.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label ?? copy.label}
    </span>
  );
}

export function decisionLabel(decision: "allow" | "deny" | "require_approval"): string {
  if (decision === "deny") return "Denied";
  if (decision === "require_approval") return "Hall pass";
  return "Allowed";
}

export function decisionTone(decision: "allow" | "deny" | "require_approval"): string {
  if (decision === "deny") return "text-red-800";
  if (decision === "require_approval") return "text-amber-800";
  return "text-emerald-800";
}
