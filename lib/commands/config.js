import { loadConfig, saveConfig, PROVIDER_DEFAULTS } from "../config/config.js";
import { logInfo, logSuccess } from "../../utils/logger.js";

export async function run(args) {
  const config = await loadConfig();

  if (args.includes("--show")) {
    console.log(JSON.stringify({ ...config, apiKey: config.apiKey ? "***" : "not set" }, null, 2));
    return;
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--key" && args[i + 1]) config.apiKey = args[++i];
    if (args[i] === "--model" && args[i + 1]) config.model = args[++i];
    if ((args[i] === "--url" || args[i] === "--baseUrl") && args[i + 1]) config.baseUrl = args[++i];
    if (args[i] === "--mode" && args[i + 1]) config.mode = args[++i];
    if (args[i] === "--provider" && args[i + 1]) {
      const p = args[++i].toLowerCase();
      config.provider = p;
      if (PROVIDER_DEFAULTS[p]) {
        config.baseUrl = PROVIDER_DEFAULTS[p].baseUrl;
        config.model = PROVIDER_DEFAULTS[p].model;
      }
    }
  }

  await saveConfig(config);
  logSuccess("Configuration updated.");
}