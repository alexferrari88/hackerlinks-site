import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("frontend fonts do not depend on Google responses at build time", () => {
  for (const directory of ["app", "components", "lib"]) {
    for (const entry of readdirSync(path.join(root, directory), { recursive: true })) {
      if (!/\.[jt]sx?$/.test(entry.toString())) continue;
      const source = readFileSync(path.join(root, directory, entry.toString()), "utf8");
      assert.doesNotMatch(source, /["']next\/font\/google["']/, `${directory}/${entry} fetches Google fonts during builds`);
    }
  }
});
