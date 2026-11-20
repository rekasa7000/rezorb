"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { usePrefs } from "@/stores/prefs";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  const hydrate = usePrefs((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex items-center gap-3 rounded-full border-2 border-void bg-starlight px-5 py-2.5 text-sm font-bold text-void shadow-[4px_4px_0_var(--plasma)]",
            actionButton: "rounded-full bg-void px-3 py-1 text-xs font-bold text-starlight",
            error: "!bg-redshift",
            success: "!bg-aurora",
          },
        }}
      />
    </QueryClientProvider>
  );
}
