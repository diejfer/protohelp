import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds a GitHub Pages entry point", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Protohelp/);
  assert.match(html, /\/protohelp\/assets\//);
});

test("keeps the project local-first", async () => {
  const editor = await readFile(new URL("../app/ProtohelpEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /localStorage/);
  assert.match(editor, /pitchX/);
  assert.match(editor, /pitchY/);
  assert.match(editor, /wireLength/);
});
