"use client";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { usePrefs } from "@/stores/prefs";

/** One-time per-device notice (PRD §3.2): we position Rezorb as personal-device sync. */
export function WorkplaceNotice() {
  const { hydrated, noticeAccepted, set } = usePrefs();
  const open = hydrated && !noticeAccepted;
  return (
    <Dialog open={open} onClose={() => set({ noticeAccepted: true })} title="Before you start">
      <p className="text-moondust">
        Rezorb is for moving your own things between your own devices. If this is a work computer, your organization&apos;s data policies still apply.
      </p>
      <Button className="mt-6 w-full" size="lg" onClick={() => set({ noticeAccepted: true })} data-testid="notice-ok">
        Got it
      </Button>
    </Dialog>
  );
}
