import { describe, expect, it } from "vitest";
import { formatBytes, middleTruncate, relativeTime, sanitizeFileName, timeLeft } from "./format";

describe("format", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });
  it("middle-truncates keeping the extension", () => {
    const out = middleTruncate("quarterly_revenue_report_final.pdf", 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith(".pdf")).toBe(true);
    expect(out).toContain("…");
    expect(middleTruncate("short.txt", 20)).toBe("short.txt");
  });
  it("sanitizes file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(sanitizeFileName("a\u0000b\nc.txt")).toBe("abc.txt");
    expect(sanitizeFileName("   ")).toBe("file");
    expect(sanitizeFileName(".hidden")).toBe("hidden");
  });
  it("renders relative and remaining time", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(relativeTime("2026-01-01T11:55:00Z", now)).toBe("5m ago");
    expect(timeLeft("2026-01-01T13:30:00Z", now)).toBe("1h");
    expect(timeLeft("2026-01-01T11:00:00Z", now)).toBe("expired");
  });
});
