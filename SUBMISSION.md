# Devpost draft

Do not register or submit this. Fields below are a draft for a person to paste later.

## Project name

HallPass

## Tagline

A hall monitor for any browser agent. Write the guardrail, fail it on a red team, enforce it on device.

## Hackathon

Google #BuildHybridAI

## Built with

Next.js, TypeScript, Chrome Manifest V3, Firebase AI Logic (Gemini Nano on device, cloud Gemini fallback), Firebase App Check with reCAPTCHA Enterprise, Playwright

## Summary

HallPass is a workbench for guardrails on browser agents. You write rules in plain English. Firebase AI Logic compiles them with Gemini Nano when Chrome has it, and with cloud Gemini otherwise. A Chrome extension pauses payment submits, sends, deletes, downloads, and out-of-bounds navigations, then allows them, denies them, or asks for a one-action hall pass. A bundled red team and a rules-only scorecard let you grade the policy before any agent runs. Other agents can call `hallpass.check(action)`.

## About the project

Browser agents act inside a logged-in Chrome. They can submit a payment, send mail, or follow a hidden instruction with the same authority as the person at the keyboard. Chrome's User Alignment Critic checks Gemini in Chrome. veto-browse and chrome-use each guard their own agent. HallPass is the bench for the agents you did not write: author the rule, prove it on a fake checkout and a lookalike domain, then enforce it.

All model calls go through Firebase AI Logic in `prefer_on_device` mode, with a system instruction, a JSON response schema, `countTokens`, and `usageMetadata`. The cloud fallback is `gemini-3.5-flash-lite` on `inCloudParams`. The response badge reads `inferenceSource` and shows On-device or Cloud. Firebase App Check with reCAPTCHA Enterprise is initialized before those calls. When no Firebase config is present, or when CI sets rules mode, a deterministic compiler and matcher produce the same decisions. The test bench's 23 checks pass with no model. A public Netlify deploy (`netlify.toml`) stays on that rules path until Firebase env vars are added in the host UI.

HallPass stores an audit log locally and exports it as JSON. The log keeps URLs, button labels, and field types. It does not keep field values. PII redaction is out of scope. That is PlainSight's product.

## Inspiration

Agents are being handed the mouse. The missing piece is a seatbelt a person can write, test, and reuse across agents, with the model call staying on the device when the browser can do it.

## What it does

- Compiles plain-English guardrails into a JSON policy.
- Enforces that policy in a Manifest V3 extension: allow, deny, or a hall pass.
- Grades the policy on bundled red-team pages with a Playwright harness and a rules-only scorecard.
- Keeps a local audit trail and exports JSON.
- Exposes `hallpass.check` for other agent builders.

## How we built it

The policy engine is plain TypeScript with no model dependency, so CI can grade it. The workbench calls `getGenerativeModel` with `InferenceMode.PREFER_ON_DEVICE` and reads `response.inferenceSource`. The extension bundles only the rules engine, because a click has to be cancelled immediately. The model runs at compile time and, in the SDK try-box, as an optional hybrid review. Red-team pages are drills inside the app, clearly marked, and they never send a payment or an email.

## Challenges

Cancelling a click cannot wait on a cloud round trip, so enforcement is the compiled policy and the badge records who compiled it. On-device Gemini also needs a user gesture and a finished model download. `PREFER_ON_DEVICE` covers the gap: the first compile can be cloud, and later compiles can be on device, and the badge says which one happened. Prompt-injection text is a signal, not a guarantee. The guardrail denies the dangerous action when the signal fires. It does not claim to have read the attacker's mind.

## Accomplishments

A person can write a guardrail, watch it fail a fake checkout, a hidden instruction, and a lookalike domain, and see a pass/fail card that CI reproduces. The extension shows the same decision on a real click. Hybrid inference is wired, badged, and falls back without taking the scorecard down.

## What we learned

The useful safety product is the test bench. A critic that only runs in production tells you too late. A rules engine that a model compiles, and that CI can execute alone, is something you can ship.

## What's next

An Android companion that signs a hall pass from a phone. Signed policy bundles. A Firefox build. The rules format is already the contract those clients would enforce.

## Links

- Repository: https://github.com/LevelUpWorldHub/hallpass
- Demo video: add the YouTube URL after the 3-minute cut in DEMO_SCRIPT.md
- Live app: run locally with `npm run dev` (this draft does not deploy)

## Built for #BuildHybridAI

On-device path: Firebase AI Logic, `InferenceMode.PREFER_ON_DEVICE`, Gemini Nano in Chrome 139+, badge from `inferenceSource === on_device`.

Cloud fallback: the same call, badge from `inferenceSource === in_cloud`.

No-model path: `NEXT_PUBLIC_HALLPASS_INFERENCE=rules`, used by GitHub Actions.

App Check: reCAPTCHA Enterprise provider, debug token documented for localhost, enforcement expected in the Firebase console.
