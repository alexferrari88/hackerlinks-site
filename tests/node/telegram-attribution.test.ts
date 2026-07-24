import test from "node:test";
import assert from "node:assert/strict";

import {
  TELEGRAM_HN_SOURCE,
  TELEGRAM_SITE_SOURCE,
  telegramBotUrl,
  telegramSourceForSession,
  telegramSourceFromReferrer,
} from "../../lib/telegram-attribution";

test("Telegram attribution recognizes Hacker News referrals", () => {
  assert.equal(
    telegramSourceFromReferrer("https://news.ycombinator.com/item?id=123"),
    TELEGRAM_HN_SOURCE,
  );
});

test("Telegram attribution treats blank, invalid, and internal referrals as site traffic", () => {
  assert.equal(telegramSourceFromReferrer(""), TELEGRAM_SITE_SOURCE);
  assert.equal(telegramSourceFromReferrer("not a URL"), TELEGRAM_SITE_SOURCE);
  assert.equal(
    telegramSourceFromReferrer("https://hackerlinks.cc/archive/"),
    TELEGRAM_SITE_SOURCE,
  );
});

test("Telegram attribution retains an HN source across internal navigation", () => {
  assert.equal(
    telegramSourceForSession("https://hackerlinks.cc/archive/", TELEGRAM_HN_SOURCE),
    TELEGRAM_HN_SOURCE,
  );
  assert.equal(
    telegramSourceForSession("https://news.ycombinator.com/item?id=123", TELEGRAM_SITE_SOURCE),
    TELEGRAM_HN_SOURCE,
  );
  assert.equal(
    telegramSourceForSession("https://hackerlinks.cc/", "untrusted-value"),
    TELEGRAM_SITE_SOURCE,
  );
});

test("Telegram deep links contain only the bounded acquisition source", () => {
  assert.equal(
    telegramBotUrl(TELEGRAM_HN_SOURCE),
    "https://t.me/hn_links_bot?start=hackerlinks_hn_2026",
  );
  assert.equal(
    telegramBotUrl(TELEGRAM_SITE_SOURCE),
    "https://t.me/hn_links_bot?start=hackerlinks_site",
  );
});
