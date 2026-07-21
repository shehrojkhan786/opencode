import { toolDefinitions, executeTool } from "../tools/index.js";
import { MODES } from "../modes/index.js";
import { resolveSystemPrompt, transformUserPrompt } from "../prompts/index.js";
import { loadConfig } from "../config/config.js";
import { Session } from "../session/session.js";
import { logInfo, logSuccess, logError } from "../../utils/logger.js";
import readline from "node:readline";

export class AgentEngine {
  constructor(provider, session) {
    this.provider = provider;
    this.session = session;
  }

  async promptUserConfirm(actionDescription) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(res => {
      rl.question(`\x1b[33m[confirm]\x1b[0m Allow action: "${actionDescription}"? (y/N): `, ans => {
        rl.close();
        res(ans.trim().toLowerCase() === "y" || ans.trim().toLowerCase() === "yes");
      });
    });
  }

  async runLoop(rawUserPrompt, mode = "edit") {
    const config = await loadConfig();
    const isUnbarred = config.trusted || mode === "auto";
    const modeConfig = MODES[mode] || MODES.edit;
    this.session.mode = mode;

    // Load default reasoning system prompt silently in background
    if (this.session.history.length === 0 || this.session.history[0].role !== "system") {
      const sysMsg = await resolveSystemPrompt("coder", mode);
      this.session.history.unshift(sysMsg);
    }

    const transformedPrompt = transformUserPrompt(rawUserPrompt);
    this.session.addMessage("user", transformedPrompt);

    const activeTools = toolDefinitions.filter(t => modeConfig.allowedTools.includes(t.name));

    let maxSteps = 10;
    while (maxSteps-- > 0) {
      const message = await this.provider.chatCompletion(this.session.history, activeTools);
      
      this.session.history.push(message);

      if (message.content) {
        console.log(`\x1b[36m[agent]:\x1b[0m ${message.content}`);
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        await this.session.save();
        return message.content;
      }

      for (const call of message.tool_calls) {
        const fnName = call.function.name;
        let fnArgs = {};
        try { fnArgs = JSON.parse(call.function.arguments); } catch {}

        logInfo(`Requested tool: ${fnName} -> ${JSON.stringify(fnArgs)}`);

        if (!isUnbarred && mode === "edit" && ["write_file", "run_command"].includes(fnName)) {
          const allowed = await this.promptUserConfirm(`${fnName} ${JSON.stringify(fnArgs)}`);
          if (!allowed) {
            this.session.addToolResult(call.id, fnName, "User denied execution of this action.");
            logError(`Action ${fnName} denied by user.`);
            continue;
          }
        }

        try {
          let result;
          if (fnName === "spawn_subagent") {
            logInfo(`Spawning sub-agent [${fnArgs.role || "coder"}] for sub-task...`);
            const subSession = new Session(`subagent-${Date.now()}`);
            const subEngine = new AgentEngine(this.provider, subSession);
            result = await subEngine.runLoop(fnArgs.prompt, mode);
          } else {
            result = await executeTool(fnName, fnArgs);
          }

          this.session.addToolResult(call.id, fnName, result);
          logSuccess(`Tool ${fnName} executed successfully.`);
        } catch (err) {
          this.session.addToolResult(call.id, fnName, `Error: ${err.message}`);
          logError(`Tool ${fnName} failed: ${err.message}`);
        }
      }

      await this.session.save();
    }
  }
}