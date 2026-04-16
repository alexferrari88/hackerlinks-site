import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020";

import { SITE_BASE_PATH } from "@/lib/site-config";

export interface MentionRecord {
  id: string;
  issue_id: string;
  item_id: string;
  seen_at: string;
  hn_url: string;
  source_story_id: string | null;
  source_story_title: string | null;
  evidence: string;
  rank?: number | null;
  is_repeat?: boolean;
}

export interface ItemRecord {
  id: string;
  slug: string;
  name: string;
  thing_url: string | null;
  summary: string;
  why_included: string;
  first_seen_at: string;
  last_seen_at: string;
  times_seen: number;
  latest_mention_id: string;
  mention_ids: string[];
}

export interface IssueRecord {
  id: string;
  date: string;
  generated_at: string;
  headline: string;
  summary: {
    items_surfaced: number;
    stories_processed: number | null;
    stories_attempted: number | null;
  };
  mention_ids: string[];
}

interface ArchiveManifest {
  issues: Array<{
    id: string;
    date: string;
    headline: string;
    item_count: number;
  }>;
}

interface LatestManifest {
  issue_id: string;
  generated_at: string;
  item_count: number;
}

export interface PublicRecords {
  issues: Record<string, IssueRecord>;
  items: Record<string, ItemRecord>;
  mentions: Record<string, MentionRecord>;
  manifests: {
    archive: ArchiveManifest;
    latest: LatestManifest;
  };
}

export interface IssueListing {
  issue: IssueRecord;
  mentions: MentionRecord[];
  previewNames: string[];
}

const ajv = new Ajv2020({ allErrors: true });
const schemaCache = new Map<string, ReturnType<Ajv2020["compile"]>>();
const recordsCache = new Map<string, PublicRecords>();
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function publicRoot() {
  return process.env.HACKERLINKS_PUBLIC_ROOT || path.join(REPO_ROOT, "data", "public");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function listJsonFiles(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => path.join(dirPath, fileName));
}

function loadSchema(name: string) {
  if (!schemaCache.has(name)) {
    const schemaPath = path.join(REPO_ROOT, "schemas", `${name}.schema.json`);
    schemaCache.set(name, ajv.compile(readJsonFile(schemaPath)));
  }

  return schemaCache.get(name)!;
}

function validateRecord(name: string, value: unknown) {
  const validate = loadSchema(name);
  const valid = validate(value);

  if (!valid) {
    const details = (validate.errors || [])
      .map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    throw new Error(`Invalid ${name} record: ${details}`);
  }
}

function loadDirectory<T>(dirName: string, schemaName: string) {
  const directory = path.join(publicRoot(), dirName);
  const entries: Record<string, T> = {};

  for (const filePath of listJsonFiles(directory)) {
    const record = readJsonFile<T>(filePath);
    validateRecord(schemaName, record);
    entries[path.basename(filePath, ".json")] = record;
  }

  return entries;
}

export function loadPublicRecords(): PublicRecords {
  const root = publicRoot();

  if (!recordsCache.has(root)) {
    recordsCache.set(root, {
      issues: loadDirectory<IssueRecord>("issues", "issue"),
      items: loadDirectory<ItemRecord>("items", "item"),
      mentions: loadDirectory<MentionRecord>("mentions", "mention"),
      manifests: {
        archive: readJsonFile<ArchiveManifest>(path.join(root, "manifests", "archive.json")),
        latest: readJsonFile<LatestManifest>(path.join(root, "manifests", "latest.json")),
      },
    });
  }

  return recordsCache.get(root)!;
}

export function getIssuesNewestFirst() {
  return Object.values(loadPublicRecords().issues).sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestIssue() {
  const latest = getIssuesNewestFirst()[0];
  if (!latest) {
    throw new Error("No issues found in data/public");
  }
  return latest;
}

export function getIssueByDate(date: string) {
  return loadPublicRecords().issues[date] || null;
}

export function getItemBySlug(slug: string) {
  return loadPublicRecords().items[slug] || null;
}

export function getMentionsForIssue(issue: IssueRecord) {
  const { mentions } = loadPublicRecords();
  return issue.mention_ids
    .map((mentionId) => mentions[mentionId])
    .filter((mention): mention is MentionRecord => Boolean(mention));
}

export function getMentionsForItem(item: ItemRecord) {
  const { mentions } = loadPublicRecords();
  return item.mention_ids
    .map((mentionId) => mentions[mentionId])
    .filter((mention): mention is MentionRecord => Boolean(mention))
    .sort((a, b) => {
      const byDate = b.seen_at.localeCompare(a.seen_at);
      if (byDate !== 0) {
        return byDate;
      }
      return b.id.localeCompare(a.id);
    });
}

export function getIssueListing(issue: IssueRecord): IssueListing {
  const records = loadPublicRecords();
  const mentions = getMentionsForIssue(issue);
  const previewNames: string[] = [];

  for (const mention of mentions) {
    const item = records.items[mention.item_id];
    if (item && !previewNames.includes(item.name)) {
      previewNames.push(item.name);
    }
    if (previewNames.length >= 5) {
      break;
    }
  }

  return { issue, mentions, previewNames };
}

export function getRecentItems(limit = 8) {
  return Object.values(loadPublicRecords().items)
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at))
    .slice(0, limit);
}

export function getRepeatItems(limit = 8) {
  return Object.values(loadPublicRecords().items)
    .filter((item) => item.times_seen > 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => b.times_seen - a.times_seen)
    .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))
    .slice(0, limit);
}

export function getPreviousAndNextIssue(issue: IssueRecord) {
  const issues = getIssuesNewestFirst().slice().reverse();
  const index = issues.findIndex((entry) => entry.id === issue.id);
  return {
    previousIssue: index > 0 ? issues[index - 1] : null,
    nextIssue: index >= 0 && index < issues.length - 1 ? issues[index + 1] : null,
  };
}

export function getItemForMention(mention: MentionRecord) {
  return loadPublicRecords().items[mention.item_id];
}

export function getThreadCount(issue: IssueRecord) {
  const threadIds = new Set(
    getMentionsForIssue(issue)
      .map((mention) => mention.source_story_id)
      .filter((storyId): storyId is string => Boolean(storyId)),
  );

  return threadIds.size;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function relativeTimeLabel(issue: IssueRecord) {
  return `Issue / ${issue.date}`;
}

export function domainFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function itemHref(slug: string) {
  return `${SITE_BASE_PATH}/items/${slug}`;
}

export function issueHref(date: string) {
  return `${SITE_BASE_PATH}/issues/${date}`;
}
