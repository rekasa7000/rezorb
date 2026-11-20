import type { Accent, DropKind, Lifetime } from "./limits";

export interface SpaceDTO {
  id: string;
  slug: string;
  name: string;
  accent: Accent;
  defaultLifetime: Lifetime;
  dropCount: number;
  lastActivityAt: string;
  unlockedHere: boolean;
}

export interface DropDTO {
  id: string;
  spaceId: string;
  kind: DropKind;
  status: "uploading" | "ready";
  text?: string;
  /** True when `text` was omitted for size; fetch the drop to read it. */
  textOmitted?: boolean;
  language?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  thumbUrl?: string;
  sourceDevice: { id: string; label: string; kind: string } | null;
  pinned: boolean;
  createdAt: string;
  expiresAt: string;
  /** Client-only: stable React key so an optimistic card becomes the real one without re-mounting. */
  clientKey?: string;
}

export interface DeviceDTO {
  id: string;
  label: string;
  kind: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface ApiError {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export type RealtimeEvent =
  | { name: "drop.created"; data: { drop: DropDTO; clientId?: string } }
  | { name: "drop.updated"; data: { drop: DropDTO } }
  | { name: "drop.burned"; data: { ids: string[]; reason: "deleted" | "expired" } }
  | { name: "space.updated"; data: { space: Pick<SpaceDTO, "id" | "name" | "accent" | "defaultLifetime"> } }
  | { name: "space.relocked"; data: { pinVersion: number; byDeviceId: string } }
  | { name: "space.deleted"; data: Record<string, never> }
  | { name: "space.sealed"; data: { until: string } };
