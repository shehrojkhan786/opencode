import { loadConfig, saveConfig } from "../config/config.js";
import { logSuccess, logInfo } from "../../utils/logger.js";

export async function run(args) {
  const config = await loadConfig();
  if (args.includes("--off") || args.includes("--disable")) {
    config.trusted = false;
    await saveConfig(config);
    logInfo("Workspace trust disabled. Confirmation prompts active.");
  } else {
    config.trusted = true;
    await saveConfig(config);
    logSuccess("Workspace marked as trusted! Agent will run unbarred without confirmation prompts.");
  }
}