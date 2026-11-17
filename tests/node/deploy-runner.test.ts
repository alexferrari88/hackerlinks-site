import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Cloudflare deployment pins the runner compatible with the Python runtime", () => {
  const workflow = readFileSync(".github/workflows/deploy-cloudflare-pages.yml", "utf8");
  // Python 3.14.3 has Ubuntu 24.04 binaries, but none for Ubuntu 26.04.
  // Do not let ubuntu-latest silently change the deployment's platform.
  assert.match(workflow, /^    runs-on: ubuntu-24\.04\s*$/m);
  assert.doesNotMatch(workflow, /runs-on: ubuntu-latest/);
});
