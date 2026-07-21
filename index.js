#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { logError } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function printHelp() {
  console.log(`
OpenCode AI CLI – Agentic Developer Assistant

Usage:
  opencode <command> [options]

Commands:
  agent <prompt>       Execute an AI agent task in current workspace
  project <create|ls|resume> Manage, create, and resume workspace projects
  session <ls|resume|restart> Manage, resume, or restart chat sessions
  goal <objective>     Track & execute long-running multi-session project goals
  trust [--off]        Toggle workspace trust mode (unbarred execution)
  mode <plan|edit|auto> Set current execution mode (plan, edit, auto)
  config [options]      Configure API keys, models, and endpoints
  init                 Scaffold a new OpenCode project
  run <script>         Run a project script
  help                 Display this help menu
`);
}

import { promises as fs } from "fs";

async function getAvailableCommands() {
  try {
    const commandsDir = join(__dirname, "lib", "commands");
    const files = await fs.readdir(commandsDir);
    return files
      .filter(f => f.endsWith(".js"))
      .map(f => f.replace(".js", "").toLowerCase());
  } catch {
    return ["agent", "project", "session", "goal", "trust", "mode", "config", "init", "run"];
  }
}

async function startREPL() {
  const readline = await import("readline");
  const { run: agentRun } = await import("./lib/commands/agent.js");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36mopencode>\x1b[0m "
  });

  console.log("Welcome to OpenCode Interactive Shell! (Type 'exit' or Ctrl+C to quit)\n");
  rl.prompt();

  rl.on("line", async (line) => {
    let input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === "exit" || input === "quit") { process.exit(0); }

    // Strip leading slash if user typed /command
    if (input.startsWith("/")) {
      input = input.slice(1);
    }

    const parts = input.split(" ");
    const firstWord = parts[0].toLowerCase();
    const availableCommands = await getAvailableCommands();

    try {
      if (firstWord === "help") {
        printHelp();
      } else if (availableCommands.includes(firstWord) && firstWord !== "agent") {
        const commandPath = join(__dirname, "lib", "commands", `${firstWord}.js`);
        const { run } = await import(`file://${commandPath}`);
        await run(parts.slice(1));
      } else {
        await agentRun(parts);
      }
    } catch (e) {
      logError(e.message);
    }
    console.log();
    rl.prompt();
  });
}

const [, , cmd, ...args] = process.argv;

if (!cmd) {
  startREPL();
} else if (cmd === "help" || cmd === "--help" || cmd === "-h") {
  printHelp();
  process.exit(0);
} else {
  (async () => {
    try {
      const availableCommands = await getAvailableCommands();
      let commandName = cmd;
      let commandArgs = args;

      // Dynamically resolve command or route to AI agent
      if (!availableCommands.includes(cmd.toLowerCase())) {
        commandName = "agent";
        commandArgs = [cmd, ...args];
      }

      const commandPath = join(__dirname, "lib", "commands", `${commandName}.js`);
      const { run } = await import(`file://${commandPath}`);
      await run(commandArgs);
    } catch (e) {
      logError(`Execution failed: ${e.message}`);
      process.exit(1);
    }
  })();
}