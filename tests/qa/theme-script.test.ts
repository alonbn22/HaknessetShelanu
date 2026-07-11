import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// The pre-paint theme script is a hand-written JS string injected via
// dangerouslySetInnerHTML in the layout. tsc/next build never parse its contents,
// so a typo would ship silently and reintroduce the light-mode flash (or throw in
// the browser). Extract the exact string from source and prove it (1) parses and
// (2) sets html.dark correctly for each saved preference / OS setting.

const LAYOUT = path.join(process.cwd(), "src", "app", "[locale]", "layout.tsx");

function extractThemeScript(): string {
  const src = fs.readFileSync(LAYOUT, "utf8");
  // __html: "....."  — the string has no embedded double quotes (uses single).
  const m = src.match(/__html:\s*"([^"]*)"/);
  assert.ok(m, "could not find the pre-paint theme script (__html: \"...\") in layout.tsx");
  return m![1];
}

// Run the script against stubbed globals; return whether 'dark' ended up applied.
function runScript(
  script: string,
  opts: { theme: string | null; prefersDark?: boolean; throwStorage?: boolean },
): boolean {
  const cls = new Set<string>();
  const documentStub = {
    documentElement: {
      classList: {
        toggle(name: string, on?: boolean) {
          const state = on ?? !cls.has(name);
          if (state) cls.add(name);
          else cls.delete(name);
          return state;
        },
      },
    },
  };
  const localStorageStub = {
    getItem(k: string) {
      if (opts.throwStorage) throw new Error("storage blocked");
      return k === "theme" ? opts.theme : null;
    },
  };
  const matchMediaStub = () => ({ matches: !!opts.prefersDark });
  // Bare `localStorage`/`matchMedia`/`document` in the script → shadow as params.
  new Function("localStorage", "matchMedia", "document", script)(
    localStorageStub,
    matchMediaStub,
    documentStub,
  );
  return cls.has("dark");
}

const script = extractThemeScript();

test("theme script parses as valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(script));
});

test("saved 'dark' applies the dark class", () => {
  assert.equal(runScript(script, { theme: "dark" }), true);
});

test("saved 'light' does not apply the dark class (even if OS prefers dark)", () => {
  assert.equal(runScript(script, { theme: "light", prefersDark: true }), false);
});

test("no saved theme follows the OS preference", () => {
  assert.equal(runScript(script, { theme: null, prefersDark: true }), true);
  assert.equal(runScript(script, { theme: null, prefersDark: false }), false);
});

test("a blocked localStorage does not throw (stays light)", () => {
  assert.doesNotThrow(() => runScript(script, { theme: null, throwStorage: true }));
  assert.equal(runScript(script, { theme: null, throwStorage: true }), false);
});
