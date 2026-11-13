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
  let outcome: { status: "ready" } | { status: "failed"; error: unknown } | null = null;
  const tracked = download.then(
    () => {
      outcome = { status: "ready" };
    },
    (error: unknown) => {
      outcome = { status: "failed", error };
    },
  );
  await Promise.race([tracked, timeout]);
  if (outcome?.status === "failed") {
    const error = outcome.error;
    throw error instanceof Error ? error : new Error("On-device model setup failed.");
  }
  if (outcome?.status === "ready") return "ready";
  return "pending";
}
