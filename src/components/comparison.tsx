const ROWS: { topic: string; cells: string[] }[] = [
  {
    topic: "What it is",
    cells: [
      "A workbench to author, test, and enforce guardrails for any browser agent",
      "A built-in Gemini critic that checks whether Gemini in Chrome's next action matches the user's task",
      "A local browser-automation agent whose loop checks plain-English rules before it acts",
      "A CLI and extension that drive your real Chrome, with approval gates on sensitive sites and payment fields",
    ],
  },
  {
    topic: "Whose agent",
    cells: [
      "Any agent that hits the DOM or calls hallpass.check: Gemini in Chrome, Playwright, computer-use, veto-browse, chrome-use, a custom extension",
      "Gemini in Chrome",
      "veto-browse's own planner and navigator",
      "Agents that call the chrome-use CLI",
    ],
  },
  {
    topic: "Who writes the rules",
    cells: [
      "You, in plain English. Hybrid inference compiles them to JSON. The rules engine enforces them.",
      "Google's critic model, plus Chrome's prompts on purchases, messages, and sensitive sites",
      "You, in plain English, compiled to Veto rules with your own model key",
      "A maintained sensitive-site list, plus an action-policy file or Chrome enterprise policy",
    ],
  },
  {
    topic: "Test before you trust it",
    cells: [
      "Bundled red-team pages and a pass/fail scorecard, including a rules-only run for CI",
      "Chrome's own red team. There is no authoring bench for your rules.",
      "The product is the agent. It is not a guardrail test bench.",
      "The product is the driver. It is not a guardrail test bench.",
    ],
  },
  {
    topic: "Inference",
    cells: [
      "Firebase AI Logic hybrid: Gemini Nano on-device, cloud Gemini fallback, rules engine when no model is configured",
      "Gemini inside Chrome",
      "Bring-your-own cloud models",
      "Your agent. The gates themselves are deterministic.",
    ],
  },
  {
    topic: "Enforcement",
    cells: [
      "Allow, deny, or a one-action hall pass. Local audit log you can export.",
      "Veto and replan. The user confirms high-stakes steps.",
      "Block or require approval inside the agent loop",
      "Allow once, always allow on this site, or decline",
    ],
  },
];

const HEADS = ["HallPass", "Chrome User Alignment Critic", "veto-browse", "chrome-use"];

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/70">
            <th className="p-3 font-medium"> </th>
            {HEADS.map((head) => (
              <th key={head} className="p-3 font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.topic} className="border-b border-border align-top last:border-0">
              <th className="p-3 font-medium whitespace-nowrap">{row.topic}</th>
              {row.cells.map((cell, index) => (
                <td key={HEADS[index]} className="p-3 leading-6 text-muted-foreground">
                  <span className="text-foreground">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
