import { WorkplaceNotice } from "@/components/launchpad/WorkplaceNotice";

/**
 * Note: the sign-in guard deliberately lives in each page (`requirePageWho(returnTo)`), not here. A
 * layout can't see the URL it is rendering, so a guard here redirected to a bare /sign-in and every
 * deep link lost its destination. e2e/auth.spec.ts asserts that every page in this group sends an
 * anonymous visitor to sign-in with a `next` address, so a page that forgets its guard fails CI.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-starlight focus:px-4 focus:py-2 focus:text-void">
        Skip to content
      </a>
      {children}
      <WorkplaceNotice />
    </>
  );
}
