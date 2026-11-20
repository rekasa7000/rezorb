import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isProd } from "./env";
import { LIMITS } from "@/lib/limits";

/**
 * Object storage (ADR-0005). Cloudflare R2 in production via presigned URLs, so
 * file bytes never pass through a Vercel function. In local dev without R2
 * credentials, a filesystem-backed stand-in serves the same contract through
 * /api/dev-storage (never enabled in production).
 */

export interface PresignedPut {
  url: string;
  headers: Record<string, string>;
}

export interface Storage {
  presignPut(key: string, contentType: string): Promise<PresignedPut>;
  presignGet(opts: {
    key: string;
    fileName?: string;
    contentType?: string;
    inline: boolean;
  }): Promise<string>;
  head(key: string): Promise<{ size: number } | null>;
  deleteKeys(keys: string[]): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  createMultipart(key: string, contentType: string): Promise<string>;
  presignPart(key: string, uploadId: string, partNumber: number): Promise<string>;
  completeMultipart(key: string, uploadId: string, parts: Array<{ partNumber: number; etag: string }>): Promise<void>;
  abortMultipart(key: string, uploadId: string): Promise<void>;
}

export const blobKey = (userId: string, spaceId: string, dropId: string) =>
  `u/${userId}/s/${spaceId}/d/${dropId}/blob`;
export const thumbKey = (userId: string, spaceId: string, dropId: string) =>
  `u/${userId}/s/${spaceId}/d/${dropId}/thumb.webp`;
export const spacePrefix = (userId: string, spaceId: string) => `u/${userId}/s/${spaceId}/`;
export const userPrefix = (userId: string) => `u/${userId}/`;

// ───────────────────────────── R2 ─────────────────────────────

function r2Storage(cfg: NonNullable<typeof env.r2>): Storage {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    // R2 doesn't support the SDK's default flexible checksums on presigned URLs.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = cfg.bucket;
  return {
    async presignPut(key, contentType) {
      const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), {
        expiresIn: LIMITS.presignPutSeconds,
      });
      return { url, headers: { "Content-Type": contentType } };
    },
    presignGet({ key, fileName, contentType, inline }) {
      const disposition = inline
        ? "inline"
        : `attachment; filename*=UTF-8''${encodeURIComponent(fileName ?? "download")}`;
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket,
          Key: key,
          ResponseContentDisposition: disposition,
          ResponseContentType: inline ? contentType : "application/octet-stream",
        }),
        { expiresIn: LIMITS.presignGetSeconds },
      );
    },
    async head(key) {
      try {
        const r = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: Number(r.ContentLength ?? 0) };
      } catch {
        return null;
      }
    },
    async deleteKeys(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
    async deletePrefix(prefix) {
      let token: string | undefined;
      do {
        const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
        const keys = (r.Contents ?? []).map((o) => o.Key!).filter(Boolean);
        if (keys.length) await this.deleteKeys(keys);
        token = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (token);
    },
    async createMultipart(key, contentType) {
      const r = await s3.send(new CreateMultipartUploadCommand({ Bucket, Key: key, ContentType: contentType }));
      return r.UploadId!;
    },
    presignPart(key, uploadId, partNumber) {
      return getSignedUrl(s3, new UploadPartCommand({ Bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), {
        expiresIn: LIMITS.presignPutSeconds,
      });
    },
    async completeMultipart(key, uploadId, parts) {
      await s3.send(
        new CompleteMultipartUploadCommand({
          Bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: [...parts].sort((a, b) => a.partNumber - b.partNumber).map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
          },
        }),
      );
    },
    async abortMultipart(key, uploadId) {
      try {
        await s3.send(new AbortMultipartUploadCommand({ Bucket, Key: key, UploadId: uploadId }));
      } catch {
        /* already gone */
      }
    },
  };
}

// ─────────────────── Local filesystem stand-in (dev/test only) ───────────────────

export const DEV_ROOT = path.resolve(process.cwd(), ".dev-storage");

interface DevToken {
  op: "put" | "get" | "part";
  key: string;
  exp: number;
  ct?: string;
  fn?: string;
  inline?: boolean;
  uploadId?: string;
  part?: number;
}

const devSign = (payload: string) => createHmac("sha256", env.grantSecret).update(payload).digest("base64url");

function devToken(t: Omit<DevToken, "exp">, ttlSec: number): string {
  const body = Buffer.from(JSON.stringify({ ...t, exp: Date.now() + ttlSec * 1000 })).toString("base64url");
  return `${body}.${devSign(body)}`;
}

export function readDevToken(token: string): DevToken | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(devSign(body));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const t = JSON.parse(Buffer.from(body, "base64url").toString()) as DevToken;
  return t.exp > Date.now() ? t : null;
}

/** Resolves an object key to a path inside DEV_ROOT, rejecting traversal. */
export function devPath(key: string): string {
  const p = path.resolve(DEV_ROOT, key);
  if (!p.startsWith(DEV_ROOT + path.sep)) throw new Error("bad key");
  return p;
}

export const devPartPath = (key: string, uploadId: string, n: number) =>
  devPath(`${key}.upload-${uploadId}.part-${String(n).padStart(5, "0")}`);

function devStorage(): Storage {
  const url = (token: string) => `/api/dev-storage/${token}`;
  return {
    async presignPut(key, contentType) {
      return { url: url(devToken({ op: "put", key, ct: contentType }, LIMITS.presignPutSeconds)), headers: { "Content-Type": contentType } };
    },
    async presignGet({ key, fileName, contentType, inline }) {
      return url(devToken({ op: "get", key, fn: fileName, ct: contentType, inline }, LIMITS.presignGetSeconds));
    },
    async head(key) {
      try {
        const st = await fs.stat(devPath(key));
        return { size: st.size };
      } catch {
        return null;
      }
    },
    async deleteKeys(keys) {
      await Promise.all(keys.map((k) => fs.rm(devPath(k), { force: true })));
    },
    async deletePrefix(prefix) {
      await fs.rm(devPath(prefix.replace(/\/$/, "")), { recursive: true, force: true });
    },
    async createMultipart() {
      return crypto.randomUUID();
    },
    async presignPart(key, uploadId, partNumber) {
      return url(devToken({ op: "part", key, uploadId, part: partNumber }, LIMITS.presignPutSeconds));
    },
    async completeMultipart(key, uploadId, parts) {
      const target = devPath(key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const handle = await fs.open(target, "w");
      try {
        for (const p of [...parts].sort((a, b) => a.partNumber - b.partNumber)) {
          const pp = devPartPath(key, uploadId, p.partNumber);
          await handle.appendFile(await fs.readFile(pp));
          await fs.rm(pp, { force: true });
        }
      } finally {
        await handle.close();
      }
    },
    async abortMultipart(key, uploadId) {
      const dir = path.dirname(devPath(key));
      const names = await fs.readdir(dir).catch(() => [] as string[]);
      await Promise.all(
        names.filter((n) => n.includes(`.upload-${uploadId}.`)).map((n) => fs.rm(path.join(dir, n), { force: true })),
      );
    },
  };
}

let instance: Storage | undefined;

export function getStorage(): Storage {
  if (instance) return instance;
  const r2 = env.r2;
  if (r2) return (instance = r2Storage(r2));
  if (isProd()) throw new Error("R2_* environment variables are required in production.");
  return (instance = devStorage());
}

export const usingDevStorage = () => !env.r2 && !isProd();

/** Test seam. */
export function __setStorage(s: Storage | undefined) {
  instance = s;
}
