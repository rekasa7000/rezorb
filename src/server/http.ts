import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "./env";
import { log } from "./log";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const E = {
  unauthenticated: () => new AppError(401, "UNAUTHENTICATED", "Sign in to continue."),
  badCredentials: (details?: Record<string, unknown>) =>
    new AppError(401, "BAD_CREDENTIALS", "That name and PIN didn't open a Space.", details),
  spaceLocked: () => new AppError(403, "SPACE_LOCKED", "This Space is locked on this device."),
  forbidden: (code = "FORBIDDEN", message = "Not allowed.") => new AppError(403, code, message),
  notFound: (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found.`),
  conflict: (code: string, message: string) => new AppError(409, code, message),
  tooLarge: (message = "That's too large.") => new AppError(413, "TOO_LARGE", message),
  invalid: (message: string, code = "VALIDATION", details?: Record<string, unknown>) =>
    new AppError(422, code, message, details),
  sealed: (until: Date) =>
    new AppError(423, "SPACE_SEALED", "Too many tries. This Space is sealed.", {
      until: until.toISOString(),
    }),
  rateLimited: (resetSeconds: number) =>
    new AppError(429, "RATE_LIMITED", "Slow down a little.", undefined, {
      "Retry-After": String(Math.max(1, resetSeconds)),
    }),
};

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: maps errors to the API.md error shape. */
export function api<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, details: err.details } },
          { status: err.status, headers: err.headers },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION",
              message: err.issues[0]?.message ?? "Invalid request.",
              details: { issues: err.issues.map((i) => ({ path: i.path, message: i.message })) },
            },
          },
          { status: 422 },
        );
      }
      log.error({ err: serializeErr(err), path: req.nextUrl.pathname }, "unhandled api error");
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Something went wrong on our side." } },
        { status: 500 },
      );
    }
  };
}

function serializeErr(err: unknown) {
  return err instanceof Error ? { name: err.name, message: err.message } : { message: String(err) };
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF defence in depth (cookies are also SameSite=Lax). See docs/SECURITY.md T10. */
export function assertSameOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients (tests, cron) don't send Origin; browsers always do on mutations.
    return;
  }
  const allowed = new Set([new URL(env.appUrl).origin, req.nextUrl.origin]);
  if (!allowed.has(origin)) throw new AppError(403, "BAD_ORIGIN", "Cross-origin request blocked.");
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw E.invalid("Body must be valid JSON.");
  }
  return schema.parse(body);
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
