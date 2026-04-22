import test from "node:test";
import assert from "node:assert/strict";

import { onRequest } from "../../functions/[[path]].js";

test("www host redirects permanently to apex and preserves path and query", async () => {
  const response = await onRequest({
    request: new Request("https://www.hackerlinks.cc/items/tailscale?ref=hn"),
    next: async () => new Response("next"),
  });

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://hackerlinks.cc/items/tailscale?ref=hn",
  );
});

test("apex host falls through to static asset handling", async () => {
  const response = await onRequest({
    request: new Request("https://hackerlinks.cc/items/tailscale?ref=hn"),
    next: async () => new Response("ok", { status: 200 }),
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
});

test("pages.dev production host redirects permanently to apex", async () => {
  const response = await onRequest({
    request: new Request("https://hackerlinks.pages.dev/items/tailscale/"),
    next: async () => new Response("next"),
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://hackerlinks.cc/items/tailscale/");
});

test("preview hosts are returned with noindex headers", async () => {
  const response = await onRequest({
    request: new Request("https://feature-branch.pages.dev/about/"),
    next: async () => new Response("preview", { status: 200 }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("internal text artifacts are returned with noindex headers", async () => {
  const response = await onRequest({
    request: new Request("https://hackerlinks.cc/items/claude-code/index.txt"),
    next: async () => new Response("artifact", { status: 200 }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("llms.txt stays indexable", async () => {
  const response = await onRequest({
    request: new Request("https://hackerlinks.cc/llms.txt"),
    next: async () => new Response("llms", { status: 200 }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), null);
});
