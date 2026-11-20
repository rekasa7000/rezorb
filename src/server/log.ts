/**
 * Minimal structured logger. Never log content (text, file names, PINs).
 * IDs, kinds, sizes and durations only. See docs/SECURITY.md §5.
 */
type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const min = (process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === "test" ? "error" : "info");

function emit(level: Level, obj: Record<string, unknown> | string, msg?: string) {
  if (order[level] < order[min]) return;
  const rec = typeof obj === "string" ? { msg: obj } : { ...obj, msg };
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...rec });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  debug: (o: Record<string, unknown> | string, m?: string) => emit("debug", o, m),
  info: (o: Record<string, unknown> | string, m?: string) => emit("info", o, m),
  warn: (o: Record<string, unknown> | string, m?: string) => emit("warn", o, m),
  error: (o: Record<string, unknown> | string, m?: string) => emit("error", o, m),
};
