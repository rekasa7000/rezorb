import { describe, expect, it } from "vitest";
import type { DropDTO } from "./dto";
import { removeDrops, tmpTextDrop, upsertDrop } from "./drop-cache";

const mk = (id: string, extra: Partial<DropDTO> = {}): DropDTO => ({
  id, spaceId: "s", kind: "text", status: "ready", text: id, sizeBytes: 1, sourceDevice: null, pinned: false,
  createdAt: "2026-01-01T00:00:00Z", expiresAt: "2026-01-02T00:00:00Z", ...extra,
});

describe("drop cache", () => {
  it("keeps newest first and de-duplicates by id", () => {
    let l: DropDTO[] = [];
    l = upsertDrop(l, mk("0002"));
    l = upsertDrop(l, mk("0001"));
    l = upsertDrop(l, mk("0003"));
    l = upsertDrop(l, mk("0002", { pinned: true }));
    expect(l.map((d) => d.id)).toEqual(["0003", "0002", "0001"]);
    expect(l.find((d) => d.id === "0002")?.pinned).toBe(true);
  });

  it("swaps an optimistic card for the real one and keeps its React key", () => {
    let l: DropDTO[] = [mk("0001")];
    l = upsertDrop(l, tmpTextDrop("s", "abc", "hello", "text", 1000));
    expect(l[0]!.id).toBe("tmp_abc");
    l = upsertDrop(l, mk("0009", { text: "hello" }), "abc");
    expect(l.map((d) => d.id)).toEqual(["0009", "0001"]);
    expect(l[0]!.clientKey).toBe("abc"); // same key => no exit/enter animation
  });

  it("keeps the key when the realtime echo arrives after the POST response", () => {
    let l: DropDTO[] = [tmpTextDrop("s", "abc", "hi", "text", 1000)];
    l = upsertDrop(l, mk("0009"), "abc"); // POST response
    l = upsertDrop(l, mk("0009")); // realtime echo, no clientId this time
    expect(l).toHaveLength(1);
    expect(l[0]!.clientKey).toBe("abc");
  });

  it("works when the realtime echo wins the race against the POST response", () => {
    let l: DropDTO[] = [tmpTextDrop("s", "abc", "hi", "text", 1000)];
    l = upsertDrop(l, mk("0009"), "abc"); // echo carries clientId
    l = upsertDrop(l, mk("0009"), "abc"); // then the response
    expect(l).toHaveLength(1);
    expect(l[0]!.clientKey).toBe("abc");
  });

  it("removes by id", () => {
    expect(removeDrops([mk("1"), mk("2")], ["1"]).map((d) => d.id)).toEqual(["2"]);
  });
});
