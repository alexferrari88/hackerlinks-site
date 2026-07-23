import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";

import {
  getIssuesNewestFirst,
  getLatestIssue,
  getRepeatItems,
  getSameDiscussionItems,
  issueHref,
  itemHref,
  loadPublicRecords,
  type ItemRecord,
  type MentionRecord,
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

test("public href helpers emit trailing-slash canonicals", () => {
  assert.equal(issueHref("2026-04-21"), "/issues/2026-04-21/");
  assert.equal(itemHref("claude-code"), "/items/claude-code/");
});

function item(slug: string, mentionIds: string[]): ItemRecord {
  return {
    id: slug,
    slug,
    name: slug,
    thing_url: null,
    summary: "Summary",
    why_included: "Why",
    first_seen_at: "2026-07-01T00:00:00Z",
    last_seen_at: "2026-07-04T00:00:00Z",
    times_seen: mentionIds.length,
    latest_mention_id: mentionIds.at(-1) ?? "",
    mention_ids: mentionIds,
  };
}

function mention(
  id: string,
  itemId: string,
  storyId: string | null,
  seenAt: string,
): MentionRecord {
  return {
    id,
    issue_id: seenAt.slice(0, 10),
    item_id: itemId,
    seen_at: seenAt,
    hn_url: `https://news.ycombinator.com/item?id=${storyId ?? "0"}`,
    source_story_id: storyId,
    source_story_title: storyId ? `Story ${storyId}` : null,
    evidence: "Evidence",
  };
}

test("same-discussion items exclude the current item, deduplicate repeats, and sort deterministically", () => {
  const current = item("current", ["current-shared", "current-other"]);
  const alpha = item("alpha", ["alpha-shared"]);
  const beta = item("beta", ["beta-old", "beta-latest"]);
  const unrelated = item("unrelated", ["unrelated-mention"]);
  const mentions = {
    "current-shared": mention("current-shared", "current", "42", "2026-07-01T00:00:00Z"),
    "current-other": mention("current-other", "current", "84", "2026-07-02T00:00:00Z"),
    "alpha-shared": mention("alpha-shared", "alpha", "42", "2026-07-04T00:00:00Z"),
    "beta-old": mention("beta-old", "beta", "42", "2026-07-03T00:00:00Z"),
    "beta-latest": mention("beta-latest", "beta", "84", "2026-07-04T00:00:00Z"),
    "unrelated-mention": mention("unrelated-mention", "unrelated", "99", "2026-07-05T00:00:00Z"),
  };

  const results = getSameDiscussionItems(current, {
    items: { current, alpha, beta, unrelated },
    mentions,
  });

  assert.deepEqual(
    results.map(({ item: relatedItem, latestSharedMention }) => [
      relatedItem.slug,
      latestSharedMention.id,
    ]),
    [
      ["alpha", "alpha-shared"],
      ["beta", "beta-latest"],
    ],
  );
});

test("mention schema accepts exact citations and rejects malformed direct-comment URLs", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(process.cwd(), "schemas", "mention.schema.json"), "utf8"));
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  const cited = {
    ...mention("cited", "bento", "49008211", "2026-07-23T03:17:07Z"),
    rank: 1,
    is_repeat: false,
    evidence_sources: [{
      comment_id: "49010177",
      comment_url: "https://news.ycombinator.com/item?id=49008211#49010177",
      author: "vonnieda",
      excerpt: "This is really clever.",
      kind: "recommendation",
      context: "first_hand_use",
      parent_comment_id: null,
    }],
  };

  assert.equal(validate(cited), true, JSON.stringify(validate.errors));
  assert.equal(validate({
    ...cited,
    evidence_sources: [{
      ...cited.evidence_sources[0],
      comment_url: "https://news.ycombinator.com/item?id=49010177",
    }],
  }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...cited, evidence_sources: undefined }), true, JSON.stringify(validate.errors));
  assert.equal(validate({
    ...cited,
    evidence_sources: [{ ...cited.evidence_sources[0], comment_url: "https://example.com/item?id=49008211#49010177" }],
  }), false);
});
