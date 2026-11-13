import { formatScorecard, runScorecard } from "../src/hallpass/scorecard";

const card = runScorecard();
process.stdout.write(`${formatScorecard(card)}\n`);
if (!card.pass) process.exit(1);
