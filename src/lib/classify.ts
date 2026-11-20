import type { DropKind } from "./limits";

export interface Classified {
  kind: Extract<DropKind, "text" | "code" | "link">;
  language?: string;
}

const URL_RE = /^https?:\/\/[^\s<>"']+$/i;

/** Single http(s) URL on its own. */
export function isSingleUrl(text: string): boolean {
  const t = text.trim();
  if (!URL_RE.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const LANG_HINTS: Array<[string, RegExp]> = [
  ["tsx", /\b(import .* from ['"]react['"]|<\/?[A-Z][A-Za-z]*[ />]|useState\()/],
  ["typescript", /\b(interface \w+|type \w+ =|: (string|number|boolean)\b|as const)\b/],
  ["javascript", /\b(const|let|var) \w+ =|=>|function \w+\(|console\.log\(|require\(/],
  ["python", /^\s*(def \w+\(.*\):|import \w+|from \w+ import|class \w+(\(.*\))?:|print\()/m],
  ["sql", /\b(SELECT .* FROM|INSERT INTO|UPDATE \w+ SET|CREATE TABLE|DELETE FROM)\b/i],
  ["bash", /^(#!\/bin\/(ba)?sh|\$ |sudo |apt(-get)? |npm |pnpm |git |curl |cd |ls )/m],
  ["json", /^\s*[{[][\s\S]*[}\]]\s*$/],
  ["html", /<\/?(div|span|html|body|head|p|a|ul|li|script|style)[\s>]/i],
  ["css", /[.#]?[\w-]+\s*\{[^}]*:[^}]*;[^}]*\}/],
  ["go", /\bfunc \w+\(|package \w+|:= /],
  ["rust", /\bfn \w+\(|let mut |impl \w+|use std::/],
  ["java", /\bpublic (static )?(class|void)\b|System\.out\.println/],
  ["c", /#include <\w+\.h>|\bint main\(/],
];

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  if (!/^[{[]/.test(t)) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/** Heuristic classifier. The server re-validates `link`; everything else is advisory. */
export function classifyText(text: string): Classified {
  if (isSingleUrl(text)) return { kind: "link" };
  if (looksLikeJson(text)) return { kind: "code", language: "json" };

  const lines = text.split("\n");
  if (lines.length < 2 && text.length < 40) return { kind: "text" };

  for (const [lang, re] of LANG_HINTS) {
    if (lang === "json") continue;
    if (re.test(text)) {
      // Prose can contain "=>" or "git" – require some code-ish structure too.
      const structure =
        /[{};]\s*$/m.test(text) || /^\s{2,}\S/m.test(text) || /\)\s*[:{]/.test(text) || lines.length > 3;
      if (structure) return { kind: "code", language: lang };
    }
  }
  const symbolDensity = (text.match(/[{}()[\];=<>]/g)?.length ?? 0) / Math.max(text.length, 1);
  if (lines.length > 3 && symbolDensity > 0.06) return { kind: "code", language: "text" };
  return { kind: "text" };
}
