import type { DropDTO } from "./dto";

/**
 * Keeps a drop list newest-first (UUIDv7 ids sort by time) and de-duplicated by id.
 * An optimistic placeholder (`tmp_<clientId>`) is replaced by the real drop, which
 * inherits its `clientKey` so React keeps the same element (no exit/enter flicker).
 */
export function upsertDrop(list: DropDTO[], drop: DropDTO, clientId?: string): DropDTO[] {
  const replaced = list.filter((d) => d.id === drop.id || (clientId && d.id === `tmp_${clientId}`));
  const clientKey = drop.clientKey ?? replaced.find((d) => d.clientKey)?.clientKey ?? clientId;
  const next = { ...drop, ...(clientKey ? { clientKey } : {}) };
  const rest = list.filter((d) => !replaced.includes(d));
  rest.push(next);
  return rest.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)).sort(tmpFirst);
}

export function removeDrops(list: DropDTO[], ids: string[]): DropDTO[] {
  const s = new Set(ids);
  return list.filter((d) => !s.has(d.id));
}

/** Optimistic placeholders always render at the top until the server answers. */
const tmpFirst = (a: DropDTO, b: DropDTO) => Number(b.id.startsWith("tmp_")) - Number(a.id.startsWith("tmp_"));

export function tmpTextDrop(spaceId: string, clientId: string, text: string, kind: DropDTO["kind"], lifetimeMs: number): DropDTO {
  const now = new Date();
  return {
    id: `tmp_${clientId}`,
    spaceId,
    kind,
    status: "ready",
    text,
    sizeBytes: new Blob([text]).size,
    sourceDevice: null,
    pinned: false,
    clientKey: clientId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + lifetimeMs).toISOString(),
  };
}

export const isTmp = (d: DropDTO) => d.id.startsWith("tmp_");
