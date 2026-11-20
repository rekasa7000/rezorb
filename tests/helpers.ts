import { NextRequest } from "next/server";
import { getAuth } from "@/server/auth";
import { __resetMemoryLimits } from "@/server/ratelimit";

const ORIGIN = "http://localhost:3000";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** A simulated browser/device: its own cookie jar and user agent. */
export class Device {
  jar = new Map<string, string>();
  constructor(public ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36") {}

  cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorb(res: Response) {
    for (const sc of res.headers.getSetCookie()) {
      const [pair, ...attrs] = sc.split(";");
      const eq = pair!.indexOf("=");
      const name = pair!.slice(0, eq).trim();
      const value = pair!.slice(eq + 1).trim();
      const maxAge = attrs.find((a) => a.trim().toLowerCase().startsWith("max-age="));
      if (value === "" || (maxAge && Number(maxAge.split("=")[1]) <= 0)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  req(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      "user-agent": this.ua,
      origin: ORIGIN,
      cookie: this.cookieHeader(),
      "x-forwarded-for": "203.0.113.7",
      ...extra,
    };
    let init: RequestInit & { duplex?: string } = { method, headers };
    if (body !== undefined) {
      if (body instanceof Uint8Array || typeof body === "string") init.body = body as BodyInit;
      else {
        headers["content-type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      init.duplex = "half";
    }
    return new NextRequest(new URL(path, ORIGIN), init as never);
  }

  async call(handler: Handler, method: string, path: string, params: Record<string, string> = {}, body?: unknown) {
    const res = await handler(this.req(method, path, body), { params: Promise.resolve(params) });
    this.absorb(res);
    return res;
  }

  /** Calls Better Auth directly (sign-up, sign-in, pairing…). */
  async auth(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {
      "user-agent": this.ua,
      origin: ORIGIN,
      cookie: this.cookieHeader(),
      "x-forwarded-for": "203.0.113.7",
      "content-type": "application/json",
    };
    const res = await getAuth().handler(
      new Request(new URL(`/api/auth${path}`, ORIGIN), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
    );
    this.absorb(res);
    return res;
  }

  async signUp(email: string, password = "correct horse battery", name = "Test User") {
    const res = await this.auth("POST", "/sign-up/email", { email, password, name });
    if (!res.ok) throw new Error(`signUp failed: ${res.status} ${await res.text()}`);
    return res;
  }

  async signIn(email: string, password = "correct horse battery") {
    const res = await this.auth("POST", "/sign-in/email", { email, password });
    if (!res.ok) throw new Error(`signIn failed: ${res.status} ${await res.text()}`);
    return res;
  }
}

let n = 0;
export const uniqueEmail = (prefix = "user") => `${prefix}-${Date.now()}-${n++}@example.test`;

export async function newUser(prefix = "user") {
  const email = uniqueEmail(prefix);
  const d = new Device();
  await d.signUp(email);
  return { email, device: d };
}

/** A second device for an existing account (separate cookie jar). */
export async function secondDevice(email: string, ua?: string) {
  const d = new Device(ua ?? "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15");
  await d.signIn(email);
  return d;
}

export const resetLimits = () => __resetMemoryLimits();

export async function json<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
