import { expect, test } from "@playwright/test";

test("mobile nav reaches the scorecard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Test bench" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Grade the guardrail");
});

test("the desk states the problem", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("hall pass");
  await expect(page.getByRole("link", { name: "Write a guardrail" })).toBeVisible();
  await expect(page.getByTestId("first-drill-decision")).toContainText("deny");
});

test("a desk check lands in the ledger", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mail check" }).click();
  await page.getByRole("link", { name: "Ledger" }).click();
  await expect(page.getByText("The hall is quiet.")).toHaveCount(0);
  await expect(page.getByText("Hall pass").first()).toBeVisible();
});

test("the first three checks step through deny, ask, and deny", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mail check" }).click();
  await expect(page.getByTestId("first-drill-decision")).toContainText("require_approval");
  await page.getByRole("button", { name: "Lookalike check" }).click();
  await expect(page.getByTestId("first-drill-decision")).toContainText("deny");
  await expect(page.getByText("paypa1.com")).toBeVisible();
});

test("the rules scorecard passes", async ({ page }) => {
  await page.goto("/bench");
  await page.getByRole("button", { name: "Run scorecard" }).click();
  await expect(page.getByTestId("scorecard-summary")).toContainText("checks passed");
  await expect(page.getByTestId("scorecard-grade")).toHaveText("Pass");
  await expect(page.getByText("Pay button on checkout is denied → deny. Stopped.")).toBeVisible();
});

test("compiling without Firebase keeps the rules badge", async ({ page }) => {
  await page.goto("/policies");
  await page.getByLabel("Guardrail").fill("Never download a file.");
  await page.getByRole("button", { name: "Compile" }).click();
  await expect(page.getByText("No Firebase config. Compiled with the rules engine.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Never download a file" })).toBeVisible();
  await expect(page.getByTestId("inference-badge").first()).toContainText("Rules");
  await expect(page.getByTestId("hybrid-readiness")).toContainText("Missing");
  await expect(page.getByTestId("hybrid-readiness")).toContainText("reCAPTCHA Enterprise site key");
});

const drills: Array<[string, string]> = [
  ["/redteam/checkout", "deny"],
  ["/redteam/email", "require_approval"],
  ["/redteam/injection", "deny"],
  ["/redteam/lookalike", "deny"],
  ["/redteam/taxes", "deny"],
];

for (const [path, decision] of drills) {
  test(`scripted agent on ${path} is ${decision}`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("button", { name: "Replay scripted agent" }).click();
    await expect(page.getByTestId("verdict-decision")).toHaveText(decision);
    await expect(page.getByTestId("verdict-inference")).toHaveText("rules");
  });
}

test("the SDK rules check denies a payment", async ({ page }) => {
  await page.goto("/sdk");
  await expect(page.getByRole("button", { name: "Ask Gemini" })).toBeDisabled();
  await page.getByRole("button", { name: "Check with rules" }).click();
  await expect(page.getByText("Denied")).toBeVisible();
  await expect(page.getByText("On-device")).toHaveCount(0);
});

test("a checkout replay lands in the ledger", async ({ page }) => {
  await page.goto("/redteam/checkout");
  await page.getByRole("button", { name: "Replay scripted agent" }).click();
  await page.getByRole("link", { name: "Back to the desk" }).click();
  await page.getByRole("link", { name: "Ledger" }).click();
  await expect(page.getByText("The hall is quiet.")).toHaveCount(0);
  await expect(page.getByText("Denied").first()).toBeVisible();
});
