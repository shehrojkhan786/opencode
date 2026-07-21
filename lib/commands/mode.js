import { loadConfig, saveConfig } from "../config/config.js";
import { logInfo, logSuccess, logError } from "../../utils/logger.js";

export async function run(args) {
  const targetMode = args[0]?.toLowerCase();
  if (!["plan", "edit", "auto"].includes(targetMode)) {
    logError("Usage: opencode mode <plan|edit|auto>");
    process.exit(1);
  }

  const config = await loadConfig();
  config.mode = targetMode;
  await saveConfig(config);
  logSuccess(`Execution mode switched to [${targetMode.toUpperCase()}]`);
}