import { spawn } from "child_process";
import { logInfo, logError } from "../../utils/logger.js";

export async function run(args) {
  if (args.length === 0) {
    logError("Usage: opencode run <script> [args...]");
    process.exit(1);
  }

  const script = args[0];
  const scriptArgs = args.slice(1);
  const child = spawn("node", [script, ...scriptArgs], { stdio: "inherit" });

  child.on("close", code => {
    logInfo(`Script exited with code ${code}`);
    process.exit(code);
  });
}
