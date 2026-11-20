import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { requireUser, type Who } from "./access";
import { env } from "./env";

/** A NextRequest built from the incoming headers, so API helpers (grants, session) work in RSCs. */
export const pageRequest = cache(async () => new NextRequest(env.appUrl, { headers: await headers() }));

export const getPageWho = cache(async (): Promise<Who | null> => {
  try {
    return await requireUser(await pageRequest());
  } catch {
    return null;
  }
});

export async function requirePageWho(returnTo?: string): Promise<Who> {
  const who = await getPageWho();
  if (!who) redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  return who;
}
