import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Argument, Command } from "commander";
import { fail } from "../client.js";

type Shell = "zsh" | "bash" | "fish";
const SHELLS = ["zsh", "bash", "fish"] as const;

const MARKER = "# tstation completion";

const SCRIPTS: Record<Shell, string> = {
  zsh: `#compdef tstation
_tstation() {
  local -a candidates
  candidates=("\${(@f)$(tstation __complete "\${words[@]:1:$((CURRENT-1))}" 2>/dev/null)}")
  [[ -n "\${candidates[1]}" ]] && compadd -- "\${candidates[@]}"
}
if [ "\${funcstack[1]}" = "_tstation" ]; then
  _tstation "$@"
elif (( \${+functions[compdef]} )); then
  compdef _tstation tstation
fi
`,
  bash: `_tstation() {
  local IFS=$'\\n'
  COMPREPLY=($(tstation __complete "\${COMP_WORDS[@]:1:COMP_CWORD}" 2>/dev/null))
}
complete -F _tstation tstation
`,
  fish: `function __tstation_complete
    set -l tokens (commandline -opc)
    tstation __complete $tokens[2..-1] (commandline -ct) 2>/dev/null
end
complete -c tstation -f -a "(__tstation_complete)"
`,
};

function configBase(): string {
  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
}

function detectShell(explicit?: string): Shell {
  const shell = explicit ?? path.basename(process.env.SHELL ?? "");
  if (!(SHELLS as readonly string[]).includes(shell)) {
    fail(`cannot detect shell from $SHELL — specify one of: ${SHELLS.join(", ")}`);
  }
  return shell as Shell;
}

function install(shell: Shell): void {
  if (shell === "fish") {
    const target = path.join(configBase(), "fish", "completions", "tstation.fish");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, SCRIPTS.fish);
    console.log(`Installed ${target}`);
    console.log("Completions load automatically in new fish sessions.");
    return;
  }

  const scriptPath = path.join(configBase(), "tstation", `completion.${shell}`);
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(scriptPath, SCRIPTS[shell]);

  const rc =
    shell === "zsh"
      ? path.join(process.env.ZDOTDIR ?? os.homedir(), ".zshrc")
      : path.join(os.homedir(), ".bashrc");
  const existing = fs.existsSync(rc) ? fs.readFileSync(rc, "utf8") : "";
  if (existing.includes(MARKER)) {
    console.log(`Updated ${scriptPath} (${rc} already sources it)`);
  } else {
    fs.appendFileSync(rc, `\n${MARKER}\n[ -f "${scriptPath}" ] && source "${scriptPath}"\n`);
    console.log(`Installed ${scriptPath} and added a source line to ${rc}`);
  }
  console.log(`Restart your shell or run: source ${rc}`);
  if (shell === "zsh") {
    console.log("Note: requires compinit, which most zsh setups load by default.");
  }
}

export function completionCommand(): Command {
  const completion = new Command("completion")
    .description("Print or install shell tab-completion")
    .addArgument(new Argument("[shell]", "shell to print the script for (default: detect from $SHELL)").choices([...SHELLS]))
    .action((shell?: string) => {
      process.stdout.write(SCRIPTS[detectShell(shell)]);
    });

  completion
    .command("install")
    .description("install completion into your shell config (detects $SHELL)")
    .addArgument(new Argument("[shell]", "shell to install for").choices([...SHELLS]))
    .action((shell?: string) => install(detectShell(shell)));

  return completion;
}
