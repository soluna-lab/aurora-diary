export type LogPayload = Record<string, string | number | boolean>;

export function logEvent(name: string, payload?: LogPayload): void {
  if (typeof window === "undefined") return;
  try {
    const va = (window as unknown as Record<string, unknown>)["va"];
    if (typeof va === "function") va("event", { name, ...payload });
  } catch {}
  try {
    const key = "ad_events";
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    existing.push({ name, ts: Date.now(), ...payload });
    if (existing.length > 300) existing.splice(0, existing.length - 300);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

export function initSessionTracking(): () => void {
  const start = Date.now();
  const onUnload = () => {
    logEvent("session_end", { duration_sec: Math.round((Date.now() - start) / 1000) });
  };
  window.addEventListener("beforeunload", onUnload);
  logEvent("session_start");
  return () => window.removeEventListener("beforeunload", onUnload);
}
