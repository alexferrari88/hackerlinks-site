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
