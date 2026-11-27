"use client";
import { create } from "zustand";

/** Per-device preferences (DESIGN §10). Stored in localStorage, always guarded. */
export type Theme = "dark" | "light" | "system";
export type View = "grid" | "float";

export interface Prefs {
  theme: Theme;
  calm: boolean;
  view: View;
  noticeAccepted: boolean;
  /** Opt-in: a browser notification (never the content) when something arrives while the tab is hidden. */
  notify: boolean;
}

export const PREFS_KEY = "rz-prefs";
const defaults: Prefs = { theme: "dark", calm: false, view: "grid", noticeAccepted: false, notify: false };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) } : defaults;
  } catch {
    return defaults;
  }
}

function apply(p: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.calm = String(p.calm);
}

interface Store extends Prefs {
  hydrated: boolean;
  hydrate: () => void;
  set: (patch: Partial<Prefs>) => void;
}

export const usePrefs = create<Store>((set, get) => ({
  ...defaults,
  hydrated: false,
  hydrate: () => {
    const p = load();
    apply(p);
    set({ ...p, hydrated: true });
  },
  set: (patch) => {
    set(patch);
    const { theme, calm, view, noticeAccepted, notify } = get();
    const next = { theme, calm, view, noticeAccepted, notify };
    apply(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* private mode: preferences just won't persist */
    }
  },
}));

/** Inline script that sets theme/calm before first paint, avoiding a flash. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}');var r=document.documentElement;r.dataset.theme=p.theme||'dark';r.dataset.calm=String(!!p.calm);}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.dataset.calm='false';}})();`;
