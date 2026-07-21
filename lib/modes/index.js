export const MODES = {
  plan: {
    name: "plan",
    description: "Read-only planning mode. Analyzes code and suggests changes without mutating files.",
    allowedTools: ["read_file", "list_dir", "grep_search"]
  },
  edit: {
    name: "edit",
    description: "Interactive pair programming mode. Suggests changes and asks for user confirmation.",
    allowedTools: ["read_file", "replace_file_content", "write_file", "list_dir", "grep_search", "run_command", "spawn_subagent"]
  },
  auto: {
    name: "auto",
    description: "Autonomous execution mode. Executes tools and code changes directly.",
    allowedTools: ["read_file", "replace_file_content", "write_file", "list_dir", "grep_search", "run_command", "spawn_subagent"]
  }
};