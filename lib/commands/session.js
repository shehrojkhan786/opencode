import { Session } from "../session/session.js";
import { logInfo, logSuccess, logError } from "../../utils/logger.js";

export async function run(args) {
  const subCmd = args[0]?.toLowerCase();
  const target = args.slice(1).join(" ");

  if (subCmd === "list" || subCmd === "ls" || !subCmd) {
    const sessions = await Session.listSessions(target);
    if (!sessions.length) {
      logInfo(target ? `No sessions matching "${target}".` : "No saved sessions found.");
      return;
    }
    console.log("\n=== Available Sessions ===");
    sessions.forEach(s => {
      console.log(`  [${s.id}] (${s.mode.toUpperCase()}) - ${s.messageCount} messages`);
      console.log(`      Last: "${s.lastPrompt.slice(0, 70)}..."`);
    });
    console.log();
    return;
  }

  if (subCmd === "resume") {
    if (!target) {
      logError("Usage: opencode session resume <id|keyword>");
      return;
    }
    const matches = await Session.listSessions(target);
    if (!matches.length) {
      logError(`No session matching "${target}".`);
      return;
    }
    const targetSession = matches[0];
    logSuccess(`Resumed session "${targetSession.id}" (${targetSession.messageCount} messages)`);
    console.log(`Run "opencode \"<prompt>\"" to continue chatting in this session.`);
    return;
  }

  if (subCmd === "restart" || subCmd === "reset") {
    const idToRestart = target || "default";
    await Session.clearSession(idToRestart);
    logSuccess(`Session "${idToRestart}" restarted. History cleared.`);
    return;
  }

  logError("Usage: opencode session <list|resume|restart> [keyword]");
}