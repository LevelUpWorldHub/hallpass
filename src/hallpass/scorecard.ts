import { compileRules } from "./compile-rules";
import { evaluate } from "./engine";
import { SCENARIOS, type Scenario } from "./scenarios";
import type { Decision } from "./types";

export interface StepResult {
  name: string;
  expect: Decision;
  actual: Decision;
  pass: boolean;
  reason: string;
  ruleId?: string;
}

export interface ScenarioResult {
  id: string;
  title: string;
  guardrail: string;
  page: string;
  steps: StepResult[];
  headline: { name: string; decision: Decision; reason: string };
  passed: number;
  failed: number;
  pass: boolean;
}

export interface Scorecard {
  mode: "rules";
  results: ScenarioResult[];
  passedChecks: number;
  totalChecks: number;
  pass: boolean;
}

export function runScorecard(scenarios: Scenario[] = SCENARIOS, now = "2026-01-01T00:00:00.000Z"): Scorecard {
  const results = scenarios.map((scenario) => {
    const policy = compileRules(scenario.guardrail, { now });
    const steps = scenario.steps.map((step) => {
      const verdict = evaluate(policy, step.action);
      return {
        name: step.name,
        expect: step.expect,
        actual: verdict.decision,
        pass: verdict.decision === step.expect,
        reason: verdict.reason,
        ruleId: verdict.ruleId,
      };
    });
    const passed = steps.filter((step) => step.pass).length;
    const headlineStep = steps.find((step) => step.name === scenario.headline) ?? steps[0];
    return {
      id: scenario.id,
      title: scenario.title,
      guardrail: scenario.guardrail,
      page: scenario.page,
      steps,
      headline: {
        name: headlineStep?.name ?? scenario.headline,
        decision: headlineStep?.actual ?? "allow",
        reason: headlineStep?.reason ?? "",
      },
      passed,
      failed: steps.length - passed,
      pass: passed === steps.length,
    };
  });
  const passedChecks = results.reduce((sum, result) => sum + result.passed, 0);
  const totalChecks = results.reduce((sum, result) => sum + result.steps.length, 0);
  return {
    mode: "rules",
    results,
    passedChecks,
    totalChecks,
    pass: passedChecks === totalChecks,
  };
}

export function formatScorecard(card: Scorecard): string {
  const lines = [
    "HallPass scorecard  (rules only)",
    "",
    ...card.results.flatMap((result) => {
      const mark = result.pass ? "PASS" : "FAIL";
      return [
        `${mark}  ${result.title.padEnd(42, " ")} ${result.passed}/${result.steps.length}`,
        `      ${result.headline.name} → ${result.headline.decision}`,
      ];
    }),
    "",
  ];
  for (const result of card.results) {
    if (result.pass) continue;
    lines.push(result.title);
    for (const step of result.steps.filter((item) => !item.pass)) {
      lines.push(`  expected ${step.expect}, got ${step.actual}: ${step.name}`);
      lines.push(`  ${step.reason}`);
    }
    lines.push("");
  }
  lines.push(`${card.passedChecks}/${card.totalChecks} checks passed`);
  return lines.join("\n");
}
