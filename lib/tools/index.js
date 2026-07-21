import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const toolDefinitions = [
  {
    name: "read_file",
    description: "Read content of a file from the workspace, optionally between line numbers",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to file" },
        start_line: { type: "integer", description: "Optional starting line (1-indexed)" },
        end_line: { type: "integer", description: "Optional ending line (1-indexed)" }
      },
      required: ["path"]
    }
  },
  {
    name: "replace_file_content",
    description: "Replace exact target string or code block inside a file with replacement content",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to file" },
        target: { type: "string", description: "Exact text/code block to replace" },
        replacement: { type: "string", description: "New text/code to insert" }
      },
      required: ["path", "target", "replacement"]
    }
  },
  {
    name: "grep_search",
    description: "Search for a text or pattern across workspace files",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or regex pattern" },
        path: { type: "string", description: "Sub-directory to search in (defaults to workspace root)" }
      },
      required: ["query"]
    }
  },
  {
    name: "write_file",
    description: "Create or overwrite a complete file in the workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to file" },
        content: { type: "string", description: "Content to write" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_dir",
    description: "List contents of a directory in workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to directory" }
      },
      required: []
    }
  },
  {
    name: "run_command",
    description: "Execute a terminal shell command",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command line to execute" }
      },
      required: ["command"]
    }
  },
  {
    name: "spawn_subagent",
    description: "Spawn an independent sub-agent to execute a dedicated sub-task concurrently",
    parameters: {
      type: "object",
      properties: {
        role: { type: "string", description: "Sub-agent role profile (coder, architect, reviewer)" },
        prompt: { type: "string", description: "Dedicated sub-task objective" }
      },
      required: ["role", "prompt"]
    }
  }
];

export async function executeTool(name, args, cwd = process.cwd()) {
  switch (name) {
    case "read_file": {
      const targetPath = resolve(cwd, args.path);
      const content = await fs.readFile(targetPath, "utf8");
      if (args.start_line || args.end_line) {
        const lines = content.split("\n");
        const start = (args.start_line || 1) - 1;
        const end = args.end_line || lines.length;
        return lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join("\n");
      }
      return content;
    }
    case "replace_file_content": {
      const targetPath = resolve(cwd, args.path);
      const content = await fs.readFile(targetPath, "utf8");
      if (!content.includes(args.target)) {
        throw new Error(`Target content not found in ${args.path}. Ensure exact line and spacing match.`);
      }
      const updated = content.replace(args.target, args.replacement);
      await fs.writeFile(targetPath, updated, "utf8");
      return `Successfully replaced content in ${args.path}`;
    }
    case "grep_search": {
      const searchDir = resolve(cwd, args.path || ".");
      const isWin = process.platform === "win32";
      const cmd = isWin
        ? `findstr /S /N /C:"${args.query.replace(/"/g, '\\"')}" *`
        : `grep -rn "${args.query.replace(/"/g, '\\"')}" .`;
      try {
        const { stdout } = await execAsync(cmd, { cwd: searchDir, shell: true });
        const lines = stdout.trim().split("\n").slice(0, 100);
        return lines.join("\n") || "No matches found.";
      } catch {
        return "No matches found.";
      }
    }
    case "write_file": {
      const targetPath = resolve(cwd, args.path);
      await fs.mkdir(resolve(targetPath, ".."), { recursive: true });
      await fs.writeFile(targetPath, args.content, "utf8");
      return `Successfully wrote file to ${args.path}`;
    }
    case "list_dir": {
      const targetPath = resolve(cwd, args.path || ".");
      const files = await fs.readdir(targetPath, { withFileTypes: true });
      return files.map(f => `${f.isDirectory() ? "[DIR]" : "[FILE]"} ${f.name}`).join("\n");
    }
    case "run_command": {
      const { stdout, stderr } = await execAsync(args.command, { cwd, shell: true });
      return (stdout + (stderr ? "\n[STDERR]:\n" + stderr : "")).trim();
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}