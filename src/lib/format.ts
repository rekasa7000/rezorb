export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function relativeTime(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const s = Math.round((now - t) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function timeLeft(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const s = Math.round((t - now) / 1000);
  if (s <= 0) return "expired";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Middle-truncate a filename, keeping the extension: "quarterly_re…port.pdf". */
export function middleTruncate(name: string, max = 28): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
  const stem = ext ? name.slice(0, dot) : name;
  const keep = max - ext.length - 1;
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;
  return `${stem.slice(0, head)}…${tail > 0 ? stem.slice(-tail) : ""}${ext}`;
}

/** Strip path separators/control chars; keep it printable and short. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);
  return cleaned || "file";
}
