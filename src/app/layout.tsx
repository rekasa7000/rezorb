import type { Metadata, Viewport } from "next";
import { accent, display, mono, ui } from "./fonts";
import { PREFS_BOOT_SCRIPT } from "@/stores/prefs";
import { Providers } from "./providers";
import { CosmosLayers } from "@/components/cosmos/CosmosLayers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Rezorb — Throw it into space. Catch it on the other side.", template: "%s · Rezorb" },
  description:
    "A private floating Space between your own devices. Paste on one, catch it on the other. Text, AI answers, screenshots and files, nothing to install.",
  applicationName: "Rezorb",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07040f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-calm="false"
      suppressHydrationWarning
      className={`${display.variable} ${accent.variable} ${ui.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body className="bg-void text-starlight antialiased">
        <CosmosLayers />
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
