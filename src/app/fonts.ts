import { Instrument_Serif, JetBrains_Mono, Space_Grotesk, Unbounded } from "next/font/google";

export const display = Unbounded({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-display", display: "swap" });
export const accent = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-accent", display: "swap" });
export const ui = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ui", display: "swap" });
export const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-mono", display: "swap" });
