"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { compileRules } from "@/hallpass/compile-rules";
import { createAuditEvent } from "@/hallpass/audit";
import { DEMO_GUARDRAIL, TAX_GUARDRAIL } from "@/hallpass/scenarios";
import type { AgentAction, AuditEvent, Policy, Verdict } from "@/hallpass/types";
import { preferredMode } from "@/hallpass/config";

const STORAGE_KEY = "hallpass.v1";
const SEED_TIME = "2026-11-13T00:00:00.000Z";

interface Persisted {
  policies: Policy[];
  activePolicyId: string;
  events: AuditEvent[];
}

interface HallpassContextValue {
  policies: Policy[];
  activePolicy: Policy;
  events: AuditEvent[];
  mode: "rules" | "hybrid";
  hydrated: boolean;
  setActive: (id: string) => void;
  savePolicy: (policy: Policy) => void;
  record: (action: AgentAction, verdict: Verdict, policy?: Policy) => void;
  clearAudit: () => void;
  replaceEvents: (events: AuditEvent[]) => void;
}

const HallpassContext = createContext<HallpassContextValue | null>(null);

function seed(): Persisted {
  const desk = compileRules(DEMO_GUARDRAIL, { now: SEED_TIME, name: "Weekday desk" });
  const taxes = compileRules(TAX_GUARDRAIL, { now: SEED_TIME, name: "Tax season" });
  return { policies: [desk, taxes], activePolicyId: desk.id, events: [] };
}

const SERVER_SNAPSHOT = seed();

let current: Persisted = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();

function readStored(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.policies?.length || !parsed.activePolicyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function activeOf(state: Persisted): Policy {
  return state.policies.find((policy) => policy.id === state.activePolicyId) ?? state.policies[0]!;
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: Persisted) {
  current = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clientSnapshot(): Persisted {
  if (!loaded) {
    loaded = true;
    current = readStored() ?? SERVER_SNAPSHOT;
  }
  return current;
}

function publish(policy: Policy) {
  window.postMessage({ source: "hallpass-workbench", type: "push-policy", policy }, window.location.origin);
}

export function HallpassProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, clientSnapshot, () => SERVER_SNAPSHOT);
  const activePolicy = activeOf(state);

  useEffect(() => {
    publish(activePolicy);
  }, [activePolicy]);

  const value = useMemo<HallpassContextValue>(
    () => ({
      policies: state.policies,
      activePolicy,
      events: state.events,
      mode: preferredMode(),
      hydrated: true,
      setActive: (id) => commit({ ...current, activePolicyId: id }),
      savePolicy: (policy) => {
        const exists = current.policies.some((item) => item.id === policy.id);
        const policies = exists
          ? current.policies.map((item) => (item.id === policy.id ? policy : item))
          : [policy, ...current.policies];
        commit({ ...current, policies, activePolicyId: policy.id });
      },
      record: (action, verdict, policy) => {
        const owner = policy ?? activeOf(current);
        commit({
          ...current,
          events: [
            createAuditEvent({ action, verdict, policyId: owner.id, policyName: owner.name }),
            ...current.events,
          ].slice(0, 500),
        });
      },
      clearAudit: () => commit({ ...current, events: [] }),
      replaceEvents: (events) => commit({ ...current, events }),
    }),
    [state, activePolicy],
  );

  return <HallpassContext.Provider value={value}>{children}</HallpassContext.Provider>;
}

export function useHallpass(): HallpassContextValue {
  const value = useContext(HallpassContext);
  if (!value) throw new Error("useHallpass must be used inside HallpassProvider");
  return value;
}
