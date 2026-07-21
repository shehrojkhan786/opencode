export const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  yellow: "\x1b[33m"
};

export function logInfo(msg) {
  console.log(`${COLORS.cyan}[info]${COLORS.reset} ${msg}`);
}
export function logSuccess(msg) {
  console.log(`${COLORS.green}[ok]${COLORS.reset} ${msg}`);
}
export function logError(msg) {
  console.error(`${COLORS.red}[error]${COLORS.reset} ${msg}`);
}
