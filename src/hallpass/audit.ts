import { HALLPASS_VERSION, type AuditEvent } from "./types";

export interface AuditExport {
  product: "hallpass";
  version: string;
  exportedAt: string;
  events: AuditEvent[];
}

export function exportAudit(events: AuditEvent[], exportedAt = new Date().toISOString()): AuditExport {
  return {
    product: "hallpass",
    version: HALLPASS_VERSION,
    exportedAt,
    events,
  };
}

export function exportAuditJson(events: AuditEvent[], exportedAt?: string): string {
  return JSON.stringify(exportAudit(events, exportedAt), null, 2);
}

let auditSequence = 0;

export function createAuditEvent(partial: Omit<AuditEvent, "id" | "at"> & { id?: string; at?: string }): AuditEvent {
  auditSequence += 1;
  return {
    id: partial.id ?? `evt_${Date.now().toString(36)}_${auditSequence}`,
    at: partial.at ?? new Date().toISOString(),
    action: partial.action,
    verdict: partial.verdict,
    policyId: partial.policyId,
    policyName: partial.policyName,
  };
}
