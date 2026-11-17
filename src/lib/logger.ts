/**
 * Structured JSON logging to stdout/stderr (collected by Vercel / any log drain).
 * Never log secrets, full proof files, or full customer records.
 */
type Level = "info" | "warn" | "error";

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6).join("\n") };
  return { message: String(err) };
}

function log(level: Level, event: string, data?: Record<string, unknown>) {
  const entry = { level, event, time: new Date().toISOString(), ...data };
  if (entry && "error" in entry) entry.error = serializeError(entry.error);
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
};
