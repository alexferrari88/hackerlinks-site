export const TELEGRAM_SITE_SOURCE = "hackerlinks_site";
export const TELEGRAM_HN_SOURCE = "hackerlinks_hn_2026";

export type TelegramSource = typeof TELEGRAM_SITE_SOURCE | typeof TELEGRAM_HN_SOURCE;

export function telegramSourceFromReferrer(referrer: string): TelegramSource {
  try {
    return new URL(referrer).hostname.toLowerCase() === "news.ycombinator.com"
      ? TELEGRAM_HN_SOURCE
      : TELEGRAM_SITE_SOURCE;
  } catch {
    return TELEGRAM_SITE_SOURCE;
  }
}

export function telegramSourceForSession(referrer: string, storedSource: string | null): TelegramSource {
  const referralSource = telegramSourceFromReferrer(referrer);
  if (referralSource === TELEGRAM_HN_SOURCE) {
    return TELEGRAM_HN_SOURCE;
  }
  return storedSource === TELEGRAM_HN_SOURCE ? TELEGRAM_HN_SOURCE : TELEGRAM_SITE_SOURCE;
}

export function telegramBotUrl(source: TelegramSource): string {
  const url = new URL("https://t.me/hn_links_bot");
  url.searchParams.set("start", source);
  return url.toString();
}
