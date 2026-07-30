import type { Command, Option } from "commander";

function optionsOf(cmd: Command): Option[] {
  const opts: Option[] = [];
  for (let c: Command | null = cmd; c; c = c.parent) opts.push(...c.options);
  return opts;
}

function findOption(cmd: Command, word: string): Option | undefined {
  return optionsOf(cmd).find((o) => o.long === word || o.short === word);
}

/**
 * Compute completion candidates for the words typed after "tstation".
 * The last word is the (possibly empty) prefix being completed.
 */
export function completeWords(root: Command, words: string[]): string[] {
  const prefix = words[words.length - 1] ?? "";
  let cmd: Command = root;
  let sawPositional = false;
  let pendingValue: Option | undefined;

  for (const word of words.slice(0, -1)) {
    if (pendingValue) {
      pendingValue = undefined;
      continue;
    }
    if (word.startsWith("-")) {
      const opt = findOption(cmd, word);
      if (opt && (opt.required || opt.optional)) pendingValue = opt;
      continue;
    }
    const next = cmd.commands.find((c) => c.name() === word || c.aliases().includes(word));
    if (next) cmd = next;
    else sawPositional = true;
  }

  let candidates: string[];
  if (pendingValue) {
    candidates = pendingValue.argChoices ?? [];
  } else if (prefix.startsWith("-")) {
    candidates = optionsOf(cmd)
      .map((o) => o.long)
      .filter((l): l is string => Boolean(l));
    candidates.push("--help");
  } else {
    candidates = cmd.commands.map((c) => c.name());
    if (!sawPositional) candidates.push(...(cmd.registeredArguments[0]?.argChoices ?? []));
  }
  return [...new Set(candidates)].filter((c) => c.startsWith(prefix)).sort();
}
