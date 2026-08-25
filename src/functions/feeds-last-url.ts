import { Locale } from "../types";
import { join } from "path";
import { promises as fs } from "fs";
import { Dictionary } from "@ournet/domain";
import { logger } from "../logger";

/**
 * Per-locale bookmark of the last feed item read.
 *
 * The file is rewritten once per feed, and more than one process can be alive
 * for the same locale (a crashed run leaving a stale lock, a manual run, ...),
 * so the write has to be atomic: a plain writeFile can be observed truncated by
 * a concurrent reader, and a truncated file used to make every later run bail
 * out on JSON.parse and silently stop importing news for that locale.
 */

/** In-process cache: the file is otherwise re-read once per feed. */
const cache: Dictionary<Dictionary<string>> = {};

export async function setLastReadedFeedUrl(
  locale: Locale,
  feedUrl: string,
  lastUrl: string
) {
  const data = await readDataFile(locale);
  data[feedUrl] = lastUrl;
  await writeDataFile(locale, data);
}

export async function getLastReadedFeedUrl(locale: Locale, feedUrl: string) {
  const data = await readDataFile(locale);
  return data[feedUrl] || null;
}

async function readDataFile(locale: Locale) {
  const key = localeKey(locale);
  const cached = cache[key];
  if (cached) {
    return cached;
  }

  let data: Dictionary<string> = {};
  try {
    const content = await fs.readFile(formatFilePath(locale), "utf8");
    data = (JSON.parse(content) as Dictionary<string>) || {};
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      // a corrupt file must not stop the run: start over rather than throw
      logger.warn(`Ignoring unreadable feed bookmarks for ${key}: ${e.message}`);
    }
  }

  cache[key] = data;
  return data;
}

async function writeDataFile(locale: Locale, data: Dictionary<string>) {
  const file = formatFilePath(locale);
  const tempFile = `${file}.${process.pid}.tmp`;

  await fs.writeFile(tempFile, JSON.stringify(data), "utf8");
  // rename is atomic on the same filesystem: readers see either the old file or
  // the new one, never a half written one
  await fs.rename(tempFile, file);
}

function localeKey(locale: Locale) {
  return `${locale.lang.toLowerCase()}-${locale.country.toLowerCase()}`;
}

function formatFilePath(locale: Locale) {
  return join(
    __dirname,
    "..",
    "..",
    "data",
    `feed-last-urls-${localeKey(locale)}.json`
  );
}
