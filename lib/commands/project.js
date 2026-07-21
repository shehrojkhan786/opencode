import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { logInfo, logSuccess, logError } from "../../utils/logger.js";

export async function run(args) {
  const subCmd = args[0]?.toLowerCase();
  const name = args.slice(1).join(" ");
  const parentDir = resolve(process.cwd(), "..");

  if (subCmd === "create") {
    if (!name) {
      logError("Usage: opencode project create <project-name>");
      return;
    }
    const projectPath = join(process.cwd(), name);
    await fs.mkdir(join(projectPath, ".opencode"), { recursive: true });
    await fs.mkdir(join(projectPath, "src"), { recursive: true });
    await fs.writeFile(
      join(projectPath, "package.json"),
      JSON.stringify({ name, version: "0.1.0", main: "src/index.js" }, null, 2),
      "utf8"
    );
    await fs.writeFile(join(projectPath, "src", "index.js"), `console.log("Hello from ${name}!");\n`, "utf8");
    logSuccess(`Project "${name}" created successfully at ${projectPath}`);
    return;
  }

  if (subCmd === "list" || subCmd === "ls" || !subCmd) {
    try {
      const items = await fs.readdir(process.cwd(), { withFileTypes: true });
      let projects = items.filter(i => i.isDirectory() && !i.name.startsWith(".")).map(i => i.name);
      
      if (name) {
        const kw = name.toLowerCase();
        projects = projects.filter(p => p.toLowerCase().includes(kw));
      }

      if (!projects.length) {
        logInfo(name ? `No projects matching "${name}".` : "No projects found in current directory.");
        return;
      }

      console.log("\n=== Projects ===");
      projects.forEach(p => console.log(`  📁 ${p}`));
      console.log();
    } catch (e) {
      logError(`Failed to list projects: ${e.message}`);
    }
    return;
  }

  if (subCmd === "resume") {
    if (!name) {
      logError("Usage: opencode project resume <project-name|keyword>");
      return;
    }
    const items = await fs.readdir(process.cwd(), { withFileTypes: true });
    const projects = items.filter(i => i.isDirectory() && !i.name.startsWith(".")).map(i => i.name);
    const match = projects.find(p => p.toLowerCase().includes(name.toLowerCase()));

    if (!match) {
      logError(`No project matching "${name}" found.`);
      return;
    }

    logSuccess(`Resumed project "${match}". Workspace ready at ./${match}`);
    return;
  }

  logError("Usage: opencode project <create|list|resume> [name|keyword]");
}