# HallPass judge notes

Strict #BuildHybridAI scoring. Each criterion is 1–10 and weighted equally. Scores describe the tree at the start of the round, before that round's fixes.

## Round 1

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 6 | `getGenerativeModel` really uses `InferenceMode.PREFER_ON_DEVICE`, App Check is initialized with reCAPTCHA Enterprise before `getAI`, and the badge follows `inferenceSource`. The rules engine, scorecard, and CI path are real. The on-device warm-up caches a 2.5s race, so a timeout or a failed Nano setup is treated as finished and is never retried, and a warm-up throw skips the cloud call entirely. Unit tests cover the compiler and the scorecard, and they do not cover `shouldGate`, a bad model payload, or the warm-up race. |
| Design | 6 | The paper ticket, type, and stamps are a point of view, and empty states exist. The first screen is a brochure: two equal buttons, a frozen Denied card, and the actual product (compile, red team, scorecard) is a navigation exercise. Verdicts in the red-team dock are easy to see and easy to miss with a screen reader. Focus on the navy nav is weak. |
| Impact | 6 | The audience is specific: people who let an agent use a logged-in Chrome, and people building those agents. The scorecard is the proof. A judge who only opens the desk never watches a guardrail fire. The extension still has to be loaded by hand before any live click is stopped. |
| Idea / originality | 8 | This is a workbench for any browser agent, with a bundled red team, which Chrome's User Alignment Critic, veto-browse, and chrome-use do not offer. The comparison table is concrete. The idea is held back on the page itself, because the differentiator is one click away and the hybrid path is easy to mistake for a rules engine with a Firebase import. |

**Total: 26 / 40**

### Top 5 gaps

1. No first-run path that fires a real guardrail. The desk shows a static Denied card. Payment, mail, and lookalike never run until the visitor hunts through the nav.
2. On-device warm-up caches the timeout. A failed or still-downloading Gemini Nano is not retried, and the failure aborts the cloud fallback inside the same `prefer_on_device` call.
3. The gate and the model boundary are under-tested. `shouldGate`, a non-JSON model reply, and inference-source parsing have no unit coverage, so a refactor can ship a gate that pauses every click or a badge that lies.
4. Verdict changes are not announced. The red-team stamp is visual. The decision text that tests read is `sr-only`, and the desk has no live region for the result of a check.
5. The README opens on architecture. A judge with three minutes is not told to press one button and watch three checks before reading Firebase setup.

## Round 2

Judged after the desk drill, the warm-up retry, and the gate tests.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 7 | The warm-up no longer treats a timeout as success, a failed Nano setup still reaches `generateContent`, and tests lock `shouldGate`, bad model JSON, and `inferenceSource`. The model can still overrule a tested rule with no side-by-side record. The scorecard still throws away the reason text after grading. |
| Design | 8 | The first screen plays three real checks, the nav has a skip link and `aria-current`, and verdicts are in a live region. The report card is still a pile of Pass 4/4. The nav badge "Rules only" reads like a missing entry instead of a checklist of what Compile is waiting on. |
| Impact | 7 | A visitor now watches a payment die, a send wait, and a lookalike die, without a key. The ledger stays empty after that, and the scorecard does not say which action mattered, so the proof is a number. |
| Idea / originality | 8 | The workbench-for-any-agent idea was already distinct. It is now the first thing on the desk. It is still one step short of obvious on the scorecard, where the original claim (grade the guardrail before you trust it) should show the sentence that passed. |

**Total: 30 / 40** (was 26)

### Top 5 gaps

1. Scorecard rows show a fraction and hide the headline decision and its one-line reason. That reason is the product.
2. "Rules only" does not say which Firebase and App Check slots are empty. A judge cannot see the hybrid path without reading the README.
3. A hybrid verdict can contradict the rules engine and leave no trace of what the tested policy would have done.
4. Passing rows are silent. Only failures list the step. A perfect card teaches nothing.
5. Playing the three checks does not write the ledger, so the audit trail is still a separate tour.

## Round 3

Judged after the scorecard reasons, the hybrid checklist, the disagreement line, and ledger filing. This round is the core-correctness layer.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 8 | Warm-up, inference source, the gate, bad model JSON, and the public config slots are tested. A model verdict now keeps the rules decision beside it. An imported policy is still accepted when it only has an id and a rules array, so a rule with no decision can reach the live gate. The Firebase call order is convention, not a test. |
| Design | 8 | The first screen, the report card, and the Compile checklist now explain themselves. Stamps and rows are clear. The desk still reads as a well-set tool rather than a moment someone would remember. |
| Impact | 8 | A visitor can watch three checks, read why each one passed, and find them in the ledger. The people it helps are named. The live extension is still a manual load, which is acceptable once the in-browser proof is this direct. |
| Idea / originality | 8 | The red team is on the scorecard in plain language, which is the original claim. Nothing on the desk yet puts a real host and a lookalike host on the same pass so the difference from a vendor critic is obvious in one glance. |

**Total: 32 / 40** (was 30)

### Top 5 gaps

1. `isPolicy` accepts any object with an id and a rules array. A rule missing a decision can be stored and then thrown on the next click.
2. Compiler edges are untested: a PII sentence beside a real rule, an "ask" on hidden instructions, and a blank guardrail.
3. Nothing in CI fails if App Check is initialized after `getAI`, or if `PREFER_ON_DEVICE` is removed.
4. The popup treats every parsed JSON file as imported, including a file the background rejects.
5. A lookalike payment and an empty URL are specified in the engine and easy to regress without a direct test.

## Round 4

Re-score after the policy guard and the redaction split. This round is Firebase AI Logic hybrid depth.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 8.5 | The gate rejects a partial policy, redaction sentences no longer become rules, and the lookalike host case is tested. Hybrid calls are still a free-text prompt on `PREFER_ON_DEVICE`. The SDK also offers a response schema, a system instruction, cloud model params, `countTokens`, and `usageMetadata`, and HallPass uses none of them. |
| Design | 8 | The desk, scorecard, and checklist are clear. The hybrid path is a list of missing keys, not a call you can see working. |
| Impact | 8 | The three checks and the 23-row scorecard are real numbers a visitor can produce. They are not yet stated as a result on the desk. |
| Idea / originality | 8 | The red team is distinct from Chrome's critic. A single glance still has to find the comparison table to see why. |

**Total: 32.5 / 40** (was 32)

### Top 5 gaps

1. `getGenerativeModel` is only `{ mode: PREFER_ON_DEVICE }`. Cloud fallback has no system instruction and no JSON schema.
2. Compile and classify ask for JSON in prose. `responseMimeType` and `responseSchema` are the SDK's way to force that shape.
3. `usageMetadata` and `countTokens` are ignored, so a hybrid answer has no size and no proof the call was measured.
4. The cloud model is whatever the SDK defaults to. The hackathon default (`gemini-3.5-flash-lite`) is not set on `inCloudParams`.
5. Nothing fails the build if those surfaces disappear from `firebase.ts`.

## Round 5

Re-score after schema-constrained hybrid calls. This round is design and UX polish.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 9.2 | Prefer-on-device, App Check before getAI, response schema, system instruction, countTokens, usageMetadata, and the cloud model are in the client and locked by a source contract. Rules mode still grades CI. |
| Design | 8.2 | The ticket, type, and checklist are coherent. The stamp does not land, the scorecard decision is a word in a paragraph, and the drill does not say which check you are on. |
| Impact | 8.2 | The proof exists. The desk does not lead with the count of checks, denials, and asks the engine just produced. |
| Idea / originality | 8.2 | The comparison table is specific. There is no side-by-side of the real host and the lookalike, which is the line a rival critic does not draw. |

**Total: 33.8 / 40** (was 32.5)

### Top 5 gaps

1. The stamp is static. A hall pass should land when the decision changes, and stay still when the visitor asks for reduced motion.
2. Scorecard decisions are the same color as the body copy. Deny, ask, and allow should be distinguishable without reading the whole sentence.
3. The drill does not say "check 2 of 3", so Play feels like a carousel with no position.
4. The hero and the ticket compete. The check you are looking at should be named above the stamp.
5. Focus on the drill buttons is the browser default on a paper background. The navy nav already has a gold ring. The drill should match.

## Round 6

Re-score after the stamp, the check counter, and the colored decisions. This round is the demo moment.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 9.2 | Unchanged this round. The hybrid path and the rules engine are both real. |
| Design | 8.8 | The stamp lands, the drill says which check is up, and decisions have color. The page still explains the product in three cards before it shows the sharpest contrast it can produce. |
| Impact | 8.4 | A visitor can play three checks. They do not yet see the one comparison that makes the harm concrete: the real host is allowed and the lookalike is not, on the same button. |
| Idea / originality | 8.6 | The workbench is distinct in the table. The memorable demo, two hosts and one Pay now, is still buried in a scorecard row. |

**Total: 35.0 / 40** (was 33.8)

### Top 5 gaps

1. No side-by-side of `www.paypal.com` allowed and `paypa1.com` denied for the same Pay now click.
2. The comparison table is prose. The demo should be the engine's actual verdicts, not a written claim.
3. The moment is not labeled for the video. A judge scanning for ten seconds can miss it under the three steps.
4. The pair is not in the Playwright path, so a regression can delete it without CI noticing.
5. The desk still does not say how many checks the full red team runs. That number belongs next to the moment.

## Round 7

Re-score after the lookalike pair. This round is robustness.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 9.3 | The pair is produced by the same compiler and engine as the scorecard, and CI reads the two stamps. |
| Design | 9.0 | The desk now shows the contrast a video needs. The rest of the office is already a coherent paper system. |
| Impact | 8.6 | A visitor sees one denied lookalike. They still have to open the bench to learn the full pass count. |
| Idea / originality | 8.8 | The demo is a thing Chrome's critic and a runtime veto do not stage. The writeup still has to say so next to the numbers. |

**Total: 35.7 / 40** (was 35.0)

### Top 5 gaps

1. The scorecard page has no error state. A throw becomes a blank report.
2. Credential-bearing and script URLs are not in the unit tests, so a host parser regression can start matching the userinfo or the scheme.
3. A blank guardrail is only warned in the compiler. The test file does not lock the empty-rule outcome.
4. Offline is invisible. With no network the rules engine still compiles, and the policies page should say so.
5. The extension popup writes verdict reasons with innerHTML. That is the next round.

## Round 8

Re-score after the offline note, the blank-guardrail lock, and the scorecard error. This round is accessibility and performance.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 9.4 | Production typecheck now passes. Text parts carry `type: "text"`, and the Nano download race returns a tagged result instead of a closure the compiler treats as `never`. |
| Design | 9.1 | Heading order on the ticket matches the page, the comparison table has a caption and row headers, and muted text is darker on the paper. |
| Impact | 8.7 | The product is measurable. The desk still does not print the scorecard's own counts. |
| Idea / originality | 8.8 | Unchanged. The lookalike pair is the original demo. The writeup still has to put it next to the rivals. |

**Total: 36.0 / 40** (was 35.7)

Lighthouse on the production desk, mobile, `http://127.0.0.1:43129/`: performance 96, accessibility 100, best practices 100, SEO 100. The guardrails page scored accessibility 100 and best practices 100.

### Top 5 gaps

1. The extension popup interpolates `verdict.reason` into `innerHTML`. A policy reason with markup becomes HTML.
2. The content script escapes overlay text. The popup does not share that escape.
3. The extension manifest does not declare an extension-page content security policy.
4. There is no unit test that a reason containing `<img` stays text.
5. The workbench still has no one-click deploy file, which is the following docs round after security.

## Round 9

Re-score after Lighthouse. This round is security and privacy.

| Criterion | Score | Why |
| --- | --- | --- |
| Technical execution | 9.5 | The gate, the compiler, the hybrid client, and the production build agree. |
| Design | 9.1 | Unchanged. |
| Impact | 8.8 | A local ledger that never stores field values is the privacy story. The desk still does not quote the scorecard counts. |
| Idea / originality | 8.9 | The workbench is specific. The next docs pass should put the measured scorecard next to the rivals. |

**Total: 36.3 / 40** (was 36.0)

### Top 5 gaps

1. Popup reasons are HTML strings. A guardrail reason can carry markup into the extension UI.
2. The overlay escapes. The popup does not.
3. Extension pages have no declared content security policy.
4. Nothing in CI fails if `innerHTML` returns to the popup.
5. Deploy and the impact numbers are still ahead.
