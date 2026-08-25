import { join } from "path";
import { promises as fs } from "fs";
import { logger } from "../logger";

/**
 * Small per-locale JSON files under ./data.
 *
 * Writes go through a temp file and a rename, because more than one process can
 * be alive for the same locale (a manual run next to a cron one, a reclaimed
 * lock) and a plain writeFile can be observed truncated by a concurrent reader.
 * A file that is unreadable is treated as empty rather than fatal: losing a
 * bookmark costs one duplicate pass, throwing used to stop the locale for good.
 */

const cache: { [file: string]: any } = {};

function filePath(name: string) {
  return join(__dirname, "..", "..", "data", name);
}

export async function readStore<T>(name: string, empty: T): Promise<T> {
  if (name in cache) {
    return cache[name] as T;
  }

  let data = empty;
  try {
    data = JSON.parse(await fs.readFile(filePath(name), "utf8")) || empty;
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      logger.warn(`Ignoring unreadable ${name}: ${e.message}`);
    }
  }

  cache[name] = data;
  return data;
}

export async function writeStore<T>(name: string, data: T) {
  cache[name] = data;

  const file = filePath(name);
  const tempFile = `${file}.${process.pid}.tmp`;

  await fs.writeFile(tempFile, JSON.stringify(data), "utf8");
  // rename is atomic on the same filesystem: a reader sees either the old file
  // or the new one, never a half written one
  await fs.rename(tempFile, file);
}
