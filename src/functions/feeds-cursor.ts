import { Locale } from "../types";
import { readStore, writeStore } from "./json-store";
import { localeKey } from "./locale-key";

/**
 * Where the next run should start in the locale's feed list.
 *
 * A run that hits its deadline part way through used to leave the tail of the
 * list permanently unread: the loop always restarted at the first source, so
 * with 36 feeds and time for 15, the last 21 were never reached at all.
 * Starting where the previous run stopped gives every feed a turn.
 */

type Cursor = { startIndex: number };

function storeName(locale: Locale) {
  return `feed-cursor-${localeKey(locale)}.json`;
}

export async function getFeedStartIndex(locale: Locale, total: number) {
  if (total < 1) {
    return 0;
  }
  const { startIndex } = await readStore<Cursor>(storeName(locale), {
    startIndex: 0
  });
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    return 0;
  }
  return startIndex % total;
}

export async function setFeedStartIndex(
  locale: Locale,
  startIndex: number,
  total: number
) {
  if (total < 1) {
    return;
  }
  await writeStore<Cursor>(storeName(locale), {
    startIndex: ((startIndex % total) + total) % total
  });
}
