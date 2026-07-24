"use client";

import { useEffect, useState, type AnchorHTMLAttributes } from "react";

import {
  TELEGRAM_SITE_SOURCE,
  telegramBotUrl,
  telegramSourceFromReferrer,
} from "@/lib/telegram-attribution";

type TelegramSubscribeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function TelegramSubscribeLink({ children, ...props }: TelegramSubscribeLinkProps) {
  const [href, setHref] = useState(() => telegramBotUrl(TELEGRAM_SITE_SOURCE));

  useEffect(() => {
    const source = telegramSourceFromReferrer(document.referrer);
    setHref(telegramBotUrl(source));
  }, []);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
