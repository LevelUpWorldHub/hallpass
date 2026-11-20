import { describe, expect, it } from "vitest";
import { amountThresholdOf, compileRules } from "./compile-rules";
import { evaluate } from "./engine";
import { isPolicy } from "./policy-guard";
import type { AgentAction } from "./types";

const NOW = "2026-11-19T00:00:00.000Z";
const shop = "https://shop.example.net/checkout";

function pay(amount: number | undefined, buttonText = "Pay now"): AgentAction {
  return { type: "click", url: shop, buttonText, amount };
}

describe("dollar thresholds (Wave 1)", () => {
  it.each([
    ["Never let the agent pay more than $50.", 50],
    ["Block payments over $50.", 50],
    ["Deny any purchase above $50.", 50],
    ["Never pay > $50.", 50],
    ["Ask before paying more than $1,250.50.", 1250.5],
  ])("%s keeps the threshold", (text, value) => {
    expect(amountThresholdOf(text)).toBe(value);
    const policy = compileRules(text, { now: NOW });
    expect(policy.rules[0]?.amountAbove).toBe(value);
    expect(isPolicy(policy)).toBe(true);
  });

  for (const phrase of ["more than", "over", "above", ">"]) {
    it(`"${phrase} $50": $50 and under pass, above $50 is stopped`, () => {
      const policy = compileRules(`Never let the agent pay ${phrase} $50.`, { now: NOW });
      expect(evaluate(policy, pay(49.99)).decision).toBe("allow");
      expect(evaluate(policy, pay(50)).decision).toBe("allow");
      expect(evaluate(policy, pay(50.01)).decision).toBe("deny");
      expect(evaluate(policy, pay(120)).decision).toBe("deny");
    });
  }

  it("reads the amount from the button label when the action has none", () => {
    const policy = compileRules("Never let the agent pay more than $50.", { now: NOW });
    expect(evaluate(policy, pay(undefined, "Pay $42.00")).decision).toBe("allow");
    expect(evaluate(policy, pay(undefined, "Pay $64.00")).decision).toBe("deny");
  });

  it("fails closed when the amount is unknown", () => {
    const policy = compileRules("Never let the agent pay more than $50.", { now: NOW });
    expect(evaluate(policy, pay(undefined, "Pay now")).decision).toBe("deny");
  });

  it("warns when an amount is present without a limit word", () => {
    const policy = compileRules("Block the $50 gift card.", { now: NOW });
    expect(policy.warnings.join(" ")).toMatch(/more than \$50/);
  });
});

describe("outside-domain email (Wave 1)", () => {
  const policy = compileRules("Block email to anyone outside example.com.", { now: NOW });
  const mail = (recipientDomains: string[] | undefined, url = "https://mail.google.com/mail/u/0/"): AgentAction => ({
    type: "click",
    url,
    buttonText: "Send",
    fieldTypes: ["email_compose"],
    recipientDomains,
  });

  it("compiles to a recipient allow-list instead of a page URL match", () => {
    expect(policy.rules).toHaveLength(1);
    expect(policy.rules[0].urlPatterns).toEqual([]);
    expect(policy.rules[0].recipientsOutside).toEqual(["example.com"]);
    expect(isPolicy(policy)).toBe(true);
  });

  it("blocks mail to an outside recipient from any site", () => {
    expect(evaluate(policy, mail(["gmail.com"])).decision).toBe("deny");
    expect(evaluate(policy, mail(["example.com", "evil.io"])).decision).toBe("deny");
    expect(evaluate(policy, mail(["example.com.evil.io"])).decision).toBe("deny");
  });

  it("allows mail to example.com and its subdomains", () => {
    expect(evaluate(policy, mail(["example.com"])).decision).toBe("allow");
    expect(evaluate(policy, mail(["sales.example.com"])).decision).toBe("allow");
  });

  it("fails closed when recipients are unknown", () => {
    expect(evaluate(policy, mail(undefined)).decision).toBe("deny");
  });

  it("navigation outside a domain becomes allow-list plus default deny", () => {
    const nav = compileRules("Block browsing outside example.com.", { now: NOW });
    const go = (url: string): AgentAction => ({ type: "navigate", url });
    expect(evaluate(nav, go("https://example.com/a")).decision).toBe("allow");
    expect(evaluate(nav, go("https://other.org/")).decision).toBe("deny");
  });
});
