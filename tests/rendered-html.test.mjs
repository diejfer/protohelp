import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders Protohelp", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Protohelp/);
  assert.match(html, /protohelp/i);
  assert.match(html, /Nuevo proyecto/);
  assert.match(html, /Lista de corte/);
});

test("keeps the project local-first", async () => {
  const editor = await readFile(new URL("../app/ProtohelpEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /localStorage/);
  assert.match(editor, /pitchX/);
  assert.match(editor, /pitchY/);
  assert.match(editor, /wireLength/);
});
