import { requirePageWho } from "@/server/page-session";
import { WorkplaceNotice } from "@/components/launchpad/WorkplaceNotice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageWho();
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
