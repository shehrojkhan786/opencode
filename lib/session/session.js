import { promises as fs } from "node:fs";
import { join } from "node:path";

const SESSION_DIR = join(process.cwd(), ".opencode", "sessions");
const MAX_HISTORY_TOKENS = 80000; // ~80k tokens safety ceiling

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 3.5);
}

function estimateHistoryTokens(history) {
  return history.reduce((sum, msg) => {
    let tokens = estimateTokens(msg.content);
    if (msg.tool_calls) tokens += estimateTokens(JSON.stringify(msg.tool_calls));
    return sum + tokens;
  }, 0);
}

export class Session {
  constructor(id = "default") {
    this.id = id;
    this.history = [];
    this.mode = "edit";
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  static async listSessions(keyword = "") {
    try {
      await fs.mkdir(SESSION_DIR, { recursive: true });
      const files = await fs.readdir(SESSION_DIR);
      const jsonFiles = files.filter(f => f.endsWith(".json"));
      const sessions = [];

      for (const f of jsonFiles) {
        try {
          const content = await fs.readFile(join(SESSION_DIR, f), "utf8");
          const parsed = JSON.parse(content);
          const userMsgs = (parsed.history || []).filter(m => m.role === "user");
          const lastPrompt = userMsgs.length ? userMsgs[userMsgs.length - 1].content : "Empty session";
          const id = parsed.id || f.replace(".json", "");

          sessions.push({
            id,
            mode: parsed.mode || "edit",
            messageCount: (parsed.history || []).length,
            lastPrompt,
            createdAt: parsed.createdAt || "unknown",
            updatedAt: parsed.updatedAt || "unknown"
          });
        } catch {}
      }

      if (keyword) {
        const kw = keyword.toLowerCase();
        return sessions.filter(s => s.id.toLowerCase().includes(kw) || s.lastPrompt.toLowerCase().includes(kw));
      }
      return sessions;
    } catch {
      return [];
    }
  }

  static async clearSession(id = "default") {
    try {
      const session = new Session(id);
      session.history = [];
      await session.save();
      return true;
    } catch {
      return false;
    }
  }

  static async load(id = "default") {
    const session = new Session(id);
    try {
      const data = await fs.readFile(join(SESSION_DIR, `${id}.json`), "utf8");
      const parsed = JSON.parse(data);
      session.history = parsed.history || [];
      session.mode = parsed.mode || "edit";
      session.createdAt = parsed.createdAt || session.createdAt;
      session.updatedAt = parsed.updatedAt || session.updatedAt;
    } catch {}
    return session;
  }

  compactHistory() {
    const currentTokens = estimateHistoryTokens(this.history);
    if (currentTokens <= MAX_HISTORY_TOKENS) return;

    // Keep system prompt (index 0), last 20 messages, and compact everything in between
    const systemMsg = this.history[0]?.role === "system" ? this.history[0] : null;
    const keepRecent = 20;
    const recentMessages = this.history.slice(-keepRecent);
    const middleMessages = systemMsg
      ? this.history.slice(1, -keepRecent)
      : this.history.slice(0, -keepRecent);

    // Summarize old messages into a compact context note
    const userPrompts = middleMessages
      .filter(m => m.role === "user")
      .map(m => (m.content || "").slice(0, 100))
      .join("; ");

    const toolActions = middleMessages
      .filter(m => m.role === "assistant" && m.tool_calls)
      .flatMap(m => m.tool_calls.map(tc => tc.function?.name || "unknown"))
      .join(", ");

    const compactNote = {
      role: "user",
      content: `[CONTEXT COMPACTED] Previous conversation covered: ${userPrompts || "various tasks"}. Tools used: ${toolActions || "none"}. Continue from the most recent context below.`
    };

    this.history = [
      ...(systemMsg ? [systemMsg] : []),
      compactNote,
      ...recentMessages
    ];
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    await fs.mkdir(SESSION_DIR, { recursive: true });
    await fs.writeFile(
      join(SESSION_DIR, `${this.id}.json`),
      JSON.stringify({
        id: this.id,
        mode: this.mode,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        history: this.history
      }, null, 2),
      "utf8"
    );
  }

  addMessage(role, content, toolCalls = null) {
    const msg = { role, content };
    if (toolCalls) msg.tool_calls = toolCalls;
    this.history.push(msg);
  }

  addToolResult(toolCallId, name, result) {
    // Truncate very large tool results to prevent context explosion
    let content = typeof result === "string" ? result : JSON.stringify(result);
    if (content.length > 15000) {
      content = content.slice(0, 14000) + `\n...[TRUNCATED ${content.length - 14000} chars]`;
    }
    this.history.push({
      role: "tool",
      tool_call_id: toolCallId,
      name,
      content
    });
  }
}