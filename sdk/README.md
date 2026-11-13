# hallpass.check

Tiny hook for agent builders. The rules engine is deterministic. Hybrid review is optional and lives in the workbench, where Firebase AI Logic can run.

```js
import { check, compile } from "./hallpass.mjs";

const policy = compile("Never submit a payment form.");

const verdict = await check(
  {
    type: "form_submit",
    url: "https://shop.example/checkout",
    buttonText: "Pay now",
    fieldTypes: ["payment"],
  },
  { policy, mode: "rules" },
);

if (verdict.decision === "deny") throw new Error(verdict.reason);
```

`sdk/hallpass.js` is the same API on `window.hallpass` for a page that cannot import modules.

Pass `mode: "hybrid"` and a `classify(action, policy)` function when you have a model. If that function throws, `check` returns the rules verdict and says so.

Field metadata is types and names. Do not put card numbers, message bodies, or other values on the action. HallPass decides whether the action may proceed. It does not redact page content.
