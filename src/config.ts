import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface Config {
  api_key?: string;
  api_url?: string;
}

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(base, "tstation", "config.json");
}

export function loadConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8")) as Config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

export function saveConfig(cfg: Config): void {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
}

export function removeConfig(): void {
  fs.rmSync(configPath(), { force: true });
}
