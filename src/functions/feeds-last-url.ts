import { Locale } from "../types";
import { join } from "path";
import { readFile, writeFile } from "fs";
import { tmpdir } from "os";
import { Dictionary } from "@ournet/domain";

export function setLastReadedFeedUrl(
  locale: Locale,
  feedUrl: string,
  lastUrl: string
) {
  return writeDataFile(locale, feedUrl, lastUrl);
}

export async function getLastReadedFeedUrl(locale: Locale, feedUrl: string) {
  const data = await readDataFile(locale);
  return data[feedUrl] || null;
}

function readDataFile(locale: Locale) {
  return new Promise<Dictionary<string>>((resolve, reject) => {
    const file = formatFilePath(locale);
    readFile(file, "utf8", (error, content) => {
      if (error) {
        return resolve({});
      }
      try {
        const data: Dictionary<string> = JSON.parse(content);

        resolve(data || {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function writeDataFile(locale: Locale, feedUrl: string, lastUrl: string) {
  const data = await readDataFile(locale);
  data[feedUrl] = lastUrl;
  return new Promise<void>((resolve, reject) => {
    const file = formatFilePath(locale);
    writeFile(file, JSON.stringify(data), "utf8", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function formatFilePath(locale: Locale) {
  return join(
    tmpdir(),
    "news-reader",
    `feed-last-urls-${locale.lang.toLowerCase()}-${locale.country.toLowerCase()}.json`
  );
}
