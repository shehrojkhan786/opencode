import { promises as fs } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config/config.js";
import { Session } from "../session/session.js";
import { LLMProvider } from "../providers/index.js";
import { AgentEngine } from "../agents/engine.js";
import { logInfo, logSuccess, logError } from "../../utils/logger.js";

const GOAL_FILE = join(process.cwd(), ".opencode", "goal.json");

async function loadGoal() {
  try {
    const data = await fs.readFile(GOAL_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveGoal(goal) {
  await fs.mkdir(join(process.cwd(), ".opencode"), { recursive: true });
  await fs.writeFile(GOAL_FILE, JSON.stringify(goal, null, 2), "utf8");
}

export async function run(args) {
  if (args.includes("--status")) {
    const currentGoal = await loadGoal();
    if (!currentGoal) {
      logInfo("No active goal found in this workspace.");
    } else {
      console.log("\n=== Active Goal ===");
      console.log(`Objective: ${currentGoal.objective}`);
      console.log(`Status: ${currentGoal.status}`);
      console.log(`Updated: ${currentGoal.updatedAt}`);
      if (currentGoal.tasks && currentGoal.tasks.length) {
        console.log("\nTask Checklist:");
        currentGoal.tasks.forEach((t, i) => {
          console.log(`  [${t.done ? "x" : " "}] ${i + 1}. ${t.title}`);
        });
      }
    }
    return;
  }

  if (args.includes("--clear")) {
    try {
      await fs.unlink(GOAL_FILE);
      logSuccess("Goal cleared.");
    } catch {
      logInfo("No active goal to clear.");
    }
    return;
  }

  const prompt = args.join(" ");
  if (!prompt) {
    logError("Usage: opencode goal \"<long-term objective>\" | --status | --clear");
    process.exit(1);
  }

  let goalObj = await loadGoal();
  if (!goalObj || goalObj.objective !== prompt) {
    goalObj = {
      objective: prompt,
      status: "in-progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [
        { title: "Analyze project context & requirements", done: false },
        { title: "Execute incremental implementation steps", done: false },
        { title: "Verify changes and validate workspace", done: false }
      ]
    };
    await saveGoal(goalObj);
    logSuccess(`Goal initialized: "${prompt}"`);
  }

  const config = await loadConfig();
  const session = await Session.load("goal-session");
  const provider = new LLMProvider(config);
  const engine = new AgentEngine(provider, session);

  logInfo("Executing task iteration against active goal...");
  const goalPrompt = `Active Goal: "${goalObj.objective}". Continue implementation, updating workspace files as needed until complete.`;
  
  try {
    await engine.runLoop(goalPrompt, config.mode || "auto");
    goalObj.updatedAt = new Date().toISOString();
    await saveGoal(goalObj);
  } catch (err) {
    logError(`Goal iteration failed: ${err.message}`);
  }
}