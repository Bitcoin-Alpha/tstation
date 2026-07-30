import fs from "node:fs";
import { Command } from "commander";
import type { GlobalOpts } from "./client.js";
import { DEFAULT_API_URL } from "./client.js";
import { authCommand } from "./commands/auth.js";
import { postsCommand } from "./commands/posts.js";
import { transcriptsCommand } from "./commands/transcripts.js";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

const program = new Command("tstation")
  .description(
    "Command-line client for the Turing Station public API.\n\n" +
      "Works without authentication for publicly visible content. Create an API key\n" +
      'at https://turingstation.nl/settings and run "tstation auth login" to\n' +
      "unlock the content your membership includes.",
  )
  .version(pkg.version)
  .option("--api-url <url>", `API base URL (default ${DEFAULT_API_URL})`)
  .option("--api-key <key>", "API key (overrides $TSTATION_API_KEY and stored config)")
  .option("--json", "print raw JSON responses");

const globals = () => program.opts<GlobalOpts>();

program.addCommand(postsCommand(globals));
program.addCommand(transcriptsCommand(globals));
program.addCommand(authCommand(globals));

program.parseAsync().catch((err: unknown) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
