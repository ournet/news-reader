import { Locale } from "../types";
import { Dictionary } from "@ournet/domain";
import { readStore, writeStore } from "./json-store";
import { localeKey } from "./locale-key";

/** Per-locale bookmark of the last feed item read, keyed by feed url. */

function storeName(locale: Locale) {
  return `feed-last-urls-${localeKey(locale)}.json`;
}

export async function setLastReadedFeedUrl(
  locale: Locale,
  feedUrl: string,
  lastUrl: string
) {
  const data = await readStore<Dictionary<string>>(storeName(locale), {});
  data[feedUrl] = lastUrl;
  await writeStore(storeName(locale), data);
}

export async function getLastReadedFeedUrl(locale: Locale, feedUrl: string) {
  const data = await readStore<Dictionary<string>>(storeName(locale), {});
  return data[feedUrl] || null;
}
