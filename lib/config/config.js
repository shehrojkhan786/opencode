import { promises as fs } from "node:fs";
import { join } from "node:path";

const CONFIG_DIR = join(process.cwd(), ".opencode");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const PROVIDER_DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-20241022" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3" },
  vllm: { baseUrl: "http://localhost:8000/v1", model: "meta-llama/Llama-3-8B-Instruct" },
  custom: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" }
};

export async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    const provider = process.env.OPENCODE_PROVIDER || "openai";
    const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openai;
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "",
      baseUrl: process.env.OPENAI_BASE_URL || defaults.baseUrl,
      model: process.env.OPENCODE_MODEL || defaults.model,
      mode: process.env.OPENCODE_MODE || "edit",
      trusted: true
    };
  }
}

export async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}