import { describe, expect, it } from "vitest";
import { classifyText, isSingleUrl } from "./classify";

describe("classifyText", () => {
  it("detects single URLs only", () => {
    expect(classifyText("https://example.com/a?b=1").kind).toBe("link");
    expect(classifyText("  http://localhost:3000/x  ").kind).toBe("link");
    expect(classifyText("see https://example.com for more").kind).toBe("text");
    expect(isSingleUrl("javascript:alert(1)")).toBe(false);
    expect(isSingleUrl("ftp://example.com")).toBe(false);
  });
  it("treats plain prose as text", () => {
    expect(classifyText("Remember to send the report to Sam before Friday.").kind).toBe("text");
    expect(classifyText("Here's the answer:\nUse a map, then filter. It reads clearer.\nHope that helps.").kind).toBe("text");
  });
  it("detects code and a language", () => {
    expect(classifyText('{"a":1,"b":[1,2]}')).toEqual({ kind: "code", language: "json" });
    const py = "def add(a, b):\n    return a + b\n\nprint(add(1, 2))";
    expect(classifyText(py)).toEqual({ kind: "code", language: "python" });
    const ts = "interface User {\n  id: string;\n  name: string;\n}\nconst u: User = { id: '1', name: 'a' };";
    expect(classifyText(ts).kind).toBe("code");
    expect(classifyText("SELECT id, name FROM users WHERE id = 1;\n-- done").language).toBe("sql");
  });
});
