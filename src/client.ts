import createClient from "openapi-fetch";
import type { components, paths } from "./generated/content.js";
import { loadConfig } from "./config.js";

export const DEFAULT_API_URL = "https://api.turingstation.nl";

export type AppError = components["schemas"]["AppError"];

export interface GlobalOpts {
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export function resolveApiUrl(opts: GlobalOpts): string {
  return opts.apiUrl ?? process.env.TSTATION_API_URL ?? loadConfig().api_url ?? DEFAULT_API_URL;
}

export function resolveApiKey(opts: GlobalOpts): { key?: string; source?: "flag" | "env" | "config" } {
  if (opts.apiKey) return { key: opts.apiKey, source: "flag" };
  if (process.env.TSTATION_API_KEY) return { key: process.env.TSTATION_API_KEY, source: "env" };
  const key = loadConfig().api_key;
  if (key) return { key, source: "config" };
  return {};
}

export function makeClient(opts: GlobalOpts, keyOverride?: string) {
  const key = keyOverride ?? resolveApiKey(opts).key;
  return createClient<paths>({
    baseUrl: resolveApiUrl(opts),
    headers: key ? { "X-API-Key": key } : undefined,
  });
}

export function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

export function apiFail(error: AppError | undefined, response: Response): never {
  if (typeof error === "string") fail(`${error} (HTTP ${response.status})`);
  if (error) {
    // Some middleware errors (e.g. auth) use a plain {"error": "..."} body instead of AppError.
    const message = error.message || error.title || (error as { error?: string }).error;
    if (message) {
      const detail = error.detail && error.detail !== message ? ` — ${error.detail}` : "";
      fail(`${message}${detail} (HTTP ${response.status})`);
    }
  }
  fail(`unexpected response (HTTP ${response.status})`);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function table(header: string[], rows: string[][]): string {
  const all = [header, ...rows];
  const widths = header.map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  return all
    .map((r) => r.map((cell, i) => (i === r.length - 1 ? cell : (cell ?? "").padEnd(widths[i]))).join("  "))
    .join("\n");
}
