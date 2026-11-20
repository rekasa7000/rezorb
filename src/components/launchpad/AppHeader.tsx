"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { Wordmark } from "@/components/cosmos/Orb";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";
import { usePrefs } from "@/stores/prefs";

export function AppHeader({ email }: { email: string }) {
  const router = useRouter();
  const { calm, set } = usePrefs();
  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <header className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-5 sm:px-8">
      <Link href="/spaces" className="text-starlight" aria-label="Rezorb home">
        <Wordmark />
      </Link>
      <span className="ml-auto hidden text-sm text-dim sm:inline">{email}</span>
      <Button variant="ghost" size="icon" aria-label={calm ? "Turn Calm mode off" : "Turn Calm mode on"} aria-pressed={calm} onClick={() => set({ calm: !calm })}>
        {calm ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
      </Button>
      <Link href="/settings" aria-label="Settings" className="grid size-11 place-items-center rounded-xl text-moondust hover:bg-hull/60 hover:text-starlight">
        <Settings size={20} strokeWidth={1.75} />
      </Link>
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
        <LogOut size={20} strokeWidth={1.75} />
      </Button>
    </header>
  );
}
