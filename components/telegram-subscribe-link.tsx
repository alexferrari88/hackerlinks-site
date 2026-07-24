"use client";

import { useEffect, useState, type AnchorHTMLAttributes } from "react";

import {
  TELEGRAM_HN_SOURCE,
  TELEGRAM_SITE_SOURCE,
  telegramBotUrl,
  telegramSourceForSession,
} from "@/lib/telegram-attribution";

const SESSION_KEY = "hackerlinks-telegram-source";

type TelegramSubscribeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function TelegramSubscribeLink({ children, ...props }: TelegramSubscribeLinkProps) {
  const [href, setHref] = useState(() => telegramBotUrl(TELEGRAM_SITE_SOURCE));

  useEffect(() => {
    let storedSource: string | null = null;
    try {
      storedSource = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      // The link still works when browser storage is unavailable.
    }

    const source = telegramSourceForSession(document.referrer, storedSource);
    setHref(telegramBotUrl(source));

    if (source === TELEGRAM_HN_SOURCE) {
      try {
        window.sessionStorage.setItem(SESSION_KEY, source);
      } catch {
        // Attribution degrades to the current page when storage is unavailable.
      }
    }
  }, []);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
