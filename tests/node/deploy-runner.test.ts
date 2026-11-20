import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-cloudflare-pages.yml", "utf8");

test("Cloudflare deployment stays on Ubuntu 26.04", () => {
  assert.match(workflow, /^    runs-on: ubuntu-26\.04\s*$/m);
  assert.doesNotMatch(workflow, /runs-on: ubuntu-latest/);
});

test("deployment uses managed portable Python instead of Ubuntu-specific toolcache builds", () => {
  assert.match(workflow, /uses: astral-sh\/setup-uv@[a-f0-9]{40}/);
  assert.match(workflow, /UV_MANAGED_PYTHON: "true"/);
  assert.match(workflow, /activate-environment: true/);
  assert.doesNotMatch(workflow, /actions\/setup-python/);
  assert.match(workflow, /name: Verify deployment runtime/);
  assert.match(workflow, /name: Test Python/);
  assert.match(workflow, /python -m unittest discover -s tests\s*$/m);
});
