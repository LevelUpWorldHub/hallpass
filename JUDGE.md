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
