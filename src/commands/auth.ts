import { Command } from "commander";
import { apiFail, fail, makeClient, resolveApiKey, resolveApiUrl, type GlobalOpts } from "../client.js";
import { configPath, loadConfig, removeConfig, saveConfig } from "../config.js";

const CTRL_C = "\u0003";
const CTRL_D = "\u0004";
const BACKSPACE = "\u007f";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stderr.write(question);
    const { stdin } = process;
    let input = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n" || ch === CTRL_D) {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stderr.write("\n");
        resolve(input);
      } else if (ch === CTRL_C) {
        stdin.setRawMode?.(false);
        process.stderr.write("\n");
        process.exit(130);
      } else if (ch === BACKSPACE || ch === "\b") {
        input = input.slice(0, -1);
      } else {
        input += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function maskKey(key: string): string {
  return key.length <= 8 ? "****" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function authCommand(globals: () => GlobalOpts): Command {
  const auth = new Command("auth").description("Manage API key authentication");

  auth
    .command("login")
    .description("Verify and store an API key")
    .option("--key <key>", "API key (prompted for if omitted)")
    .action(async (o: Record<string, string>) => {
      const g = globals();
      const key = (o.key ?? (await promptHidden("API key: "))).trim();
      if (!key) fail("no API key provided");

      const { data, error, response } = await makeClient(g, key).GET("/content/posts", {
        params: { query: { limit: 1 } },
      });
      if (response.status === 401 || response.status === 403) {
        fail(`API key rejected (HTTP ${response.status})`);
      }
      if (!data) apiFail(error, response);

      saveConfig({ ...loadConfig(), api_key: key });
      console.log(`API key verified and saved to ${configPath()}`);
    });

  auth
    .command("status")
    .description("Show the active API key and its source")
    .action(() => {
      const g = globals();
      console.log(`API URL: ${resolveApiUrl(g)}`);
      const { key, source } = resolveApiKey(g);
      if (!key) {
        console.log('Not authenticated (public content only). Run "tstation auth login" to add an API key.');
        return;
      }
      console.log(`API key: ${maskKey(key)} (from ${source})`);
    });

  auth
    .command("logout")
    .description("Remove the stored API key")
    .action(() => {
      const cfg = loadConfig();
      if (!cfg.api_key) fail("no stored API key");
      delete cfg.api_key;
      if (Object.keys(cfg).length === 0) {
        removeConfig();
      } else {
        saveConfig(cfg);
      }
      console.log("Stored API key removed.");
    });

  return auth;
}
