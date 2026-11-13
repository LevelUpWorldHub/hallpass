# HallPass demo script

A 3-minute YouTube video. Record in Chrome 139 or newer, window about 1440×900, desk already on [http://127.0.0.1:43123](http://127.0.0.1:43123). Load the extension from `extension/dist` before the last minute so the live gate is ready. If Firebase is configured, compile once before rolling so the on-device or cloud badge is honest. If it is not, say the rules badge out loud and keep moving. The scorecard does not need a model.

## Shot list

| Time | Shot | Do this | Say this |
| --- | --- | --- | --- |
| 0:00–0:20 | Desk, full frame | Land on the home page. Hold on the hall pass card that already says Denied. | Browser agents click, pay, and send inside a logged-in Chrome. HallPass is the hall monitor: you write the rule, you fail it on purpose, then you enforce it. |
| 0:20–0:45 | Guardrails | Open Guardrails. The weekday desk text is already there. Click Compile. Hold on the Rules badge, or the On-device / Cloud badge if Firebase is configured. Scroll one rule card. | This sentence compiles into a JSON policy: action, URL, field type, and a decision. Gemini Nano does that on device when Chrome has it. Cloud Gemini is the fallback. CI never needs either one. |
| 0:45–1:05 | Checkout drill | Open Red team → Checkout. Click Replay scripted agent. Hold on the Denied stamp. | Fake checkout. The scripted agent hits Pay now. The guardrail stops the payment form. The contact form and the catalog are still allowed. The scorecard checks that. |
| 1:05–1:25 | Mail | Open Mail. Replay. Hold on the Sign stamp. | Sending mail is a hall pass, not a block. The agent can read the inbox. It cannot send until someone signs. |
| 1:25–1:45 | Injection, then lookalike | Open Injection. Point at the page, which looks like a printer article. Replay. Then open Lookalike and replay. | The article hides instructions that tell the agent to submit a payment. HallPass denies the submit. Next door, paypa1.com looks like a wallet. The payment is denied. The real PayPal host is a different rule. |
| 1:45–2:10 | Scorecard | Open Test bench. Click Run scorecard. Hold on Pass and the six rows. | Six guardrails, twenty-three checks, rules only. This is the same command CI runs. You find out the policy is wrong before an agent spends money. |
| 2:10–2:35 | Extension | With the extension loaded, go back to Checkout and click Pay now. The in-page hall pass from the extension appears. Then open the popup and the Ledger. Click Export JSON only if you want the file in frame. | The extension pauses the real click. Same policy, same badge. The ledger stays in the browser. Nothing about the card number is stored. We keep the field type, not the value. |
| 2:35–3:00 | SDK, then the ribbon | Open SDK. Click Check with rules. Hold on the pass. Cut back to the desk and the Built for #BuildHybridAI line. | Other agents call hallpass.check before they act. Chrome's critic watches Gemini in Chrome. HallPass is the bench for every other agent in the building. |

## If something goes wrong on camera

- Compile shows a note about missing Firebase. That is the designed fallback. Read the note, show the Rules badge, continue.
- The extension overlay does not appear. The extension is paused, or the active policy was never pushed. Open the desk once on localhost so it posts the policy, then retry Pay now.
- A red-team replay shows Allow. You are on Tax season, or the headline step is the allowed one. Replay from Checkout, Mail, Injection, or Lookalike.

## What not to show

- Real card numbers, inboxes, or logged-in banking sessions.
- A Firebase API key or App Check debug token.
- The Devpost form. This video is the demo. Submission stays a draft until a person files it.
