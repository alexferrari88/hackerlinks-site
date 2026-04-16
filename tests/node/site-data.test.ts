import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  getIssuesNewestFirst,
  getLatestIssue,
  getRepeatItems,
  loadPublicRecords,
} from "@/lib/site-data";

process.env.HACKERLINKS_PUBLIC_ROOT = path.join(process.cwd(), "data", "public");

test("latest issue matches latest manifest", () => {
  const records = loadPublicRecords();
  const latestIssue = getLatestIssue();

  assert.equal(latestIssue.id, records.manifests.latest.issue_id);
  assert.equal(getIssuesNewestFirst()[0]?.id, latestIssue.id);
});

test("repeat items loader only returns resurfaced items", () => {
  for (const item of getRepeatItems(50)) {
    assert.ok(item.times_seen > 1);
  }
});
