import type { Verdict } from "./types";

/**
 * Pure helpers for the Firebase AI Logic hybrid path.
 * The browser client in firebase.ts is the only place that calls the SDK.
 */

export type DeviceWarmth = "ready" | "pending";

/** Map Firebase `inferenceSource` onto the HallPass badge. Unknown values stay unlabeled. */
export function readInferenceSource(source: string | undefined): "on_device" | "cloud" | null {
  if (source === "on_device") return "on_device";
  if (source === "in_cloud") return "cloud";
  return null;
}

/**
 * Race an in-flight Gemini Nano download against a short wait.
 * A timeout returns "pending" and leaves the download running.
 * It does not count as a finished warm-up.
 */
export async function raceDeviceDownload(download: Promise<void>, timeout: Promise<void>): Promise<DeviceWarmth> {
  const tracked = download.then(
    () => ({ status: "ready" as const }),
    (error: unknown) => ({ status: "failed" as const, error }),
  );
  const timeoutMark = timeout.then(() => ({ status: "pending" as const }));
  const outcome = await Promise.race([tracked, timeoutMark]);
  if (outcome.status === "failed") {
    throw outcome.error instanceof Error ? outcome.error : new Error("On-device model setup failed.");
  }
  if (outcome.status === "ready") return "ready";
  return "pending";
}

/** One sentence when the model and the tested rules engine disagree. */
export function disagreement(verdict: Pick<Verdict, "decision" | "rulesDecision">): string | null {
  if (!verdict.rulesDecision || verdict.rulesDecision === verdict.decision) return null;
  const rules = verdict.rulesDecision === "require_approval" ? "ask for a hall pass" : verdict.rulesDecision;
  const model = verdict.decision === "require_approval" ? "ask for a hall pass" : verdict.decision;
  return `The rules engine would ${rules}. The model said ${model}.`;
}
