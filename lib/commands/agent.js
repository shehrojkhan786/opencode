import { loadConfig } from "../config/config.js";
import { Session } from "../session/session.js";
import { LLMProvider } from "../providers/index.js";
import { AgentEngine } from "../agents/engine.js";
import { logInfo, logError } from "../../utils/logger.js";

export async function run(args) {
  const prompt = args.join(" ");
  if (!prompt) {
    logError("Usage: opencode agent <prompt>");
    process.exit(1);
  }

  const config = await loadConfig();
  const session = await Session.load("default");
  const provider = new LLMProvider(config);
  const engine = new AgentEngine(provider, session);

  try {
    await engine.runLoop(prompt, config.mode || "edit");
  } catch (err) {
    logError(`Agent execution error: ${err.message}`);
  }
}