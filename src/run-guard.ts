import {
  openSync,
  writeSync,
  closeSync,
  readFileSync,
  unlinkSync,
  mkdirSync,
  readdirSync
} from "fs";
import { join } from "path";
import { logger } from "./logger";

const LOCKS_DIR = join(__dirname, "..", "data", "locks");

/** A lock older than this is considered stale (its owner died without cleanup). */
const DEFAULT_MAX_LOCK_AGE_MS = 1000 * 60 * 60;

type LockInfo = { pid: number; startedAt: number; name: string };

function ensureLocksDir() {
  try {
    mkdirSync(LOCKS_DIR, { recursive: true });
  } catch (e) {
    /* already exists */
  }
}

function lockFile(name: string) {
  return join(LOCKS_DIR, `${name}.lock`);
}

function readLock(file: string): LockInfo | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as LockInfo;
  } catch (e) {
    return undefined;
  }
}

function isRunning(pid: number) {
  if (!pid || pid === process.pid) {
    return false;
  }
  try {
    // signal 0 does not kill, it only probes for existence/permission
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === "EPERM";
  }
}

function isAlive(info: LockInfo | undefined, maxAgeMs: number) {
  if (!info) {
    return false;
  }
  if (Date.now() - info.startedAt > maxAgeMs) {
    return false;
  }
  return isRunning(info.pid);
}

/** Number of live locks, ignoring the one named `exclude`. */
function countLiveLocks(exclude: string, maxAgeMs: number) {
  ensureLocksDir();
  let count = 0;
  for (const entry of readdirSync(LOCKS_DIR)) {
    if (!entry.endsWith(".lock") || entry === `${exclude}.lock`) {
      continue;
    }
    const file = join(LOCKS_DIR, entry);
    const info = readLock(file);
    if (isAlive(info, maxAgeMs)) {
      count++;
    } else if (info) {
      // clean up after a crashed run so it does not occupy a slot forever
      try {
        unlinkSync(file);
      } catch (e) {
        /* raced with another process */
      }
    }
  }
  return count;
}

export type RunGuardOptions = {
  /** Max number of news-reader processes allowed to run at the same time. */
  maxConcurrent?: number;
  /** Locks older than this are treated as abandoned. */
  maxLockAgeMs?: number;
};

/**
 * Guarantees (a) only one run per locale and (b) a global cap on how many
 * locales run at once. Returns a release function, or `undefined` when the run
 * must be skipped.
 *
 * Cron fires each locale on a fixed interval but a run has no fixed duration,
 * so without this a slow run is simply joined by the next one, and the next,
 * until the box runs out of memory.
 */
export function acquireRunSlot(
  name: string,
  options: RunGuardOptions = {}
): (() => void) | undefined {
  const maxAgeMs = options.maxLockAgeMs || DEFAULT_MAX_LOCK_AGE_MS;
  const file = lockFile(name);

  ensureLocksDir();

  const existing = readLock(file);
  if (isAlive(existing, maxAgeMs)) {
    logger.warn(
      `SKIP ${name}: previous run still active (pid=${existing?.pid}, started ${Math.round(
        (Date.now() - (existing as LockInfo).startedAt) / 1000
      )}s ago)`
    );
    return undefined;
  }
  if (existing) {
    logger.warn(`Removing stale lock for ${name} (pid=${existing.pid})`);
    try {
      unlinkSync(file);
    } catch (e) {
      /* raced */
    }
  }

  if (options.maxConcurrent && options.maxConcurrent > 0) {
    const live = countLiveLocks(name, maxAgeMs);
    if (live >= options.maxConcurrent) {
      logger.warn(
        `SKIP ${name}: ${live} run(s) already active, max is ${options.maxConcurrent}`
      );
      return undefined;
    }
  }

  let fd: number;
  try {
    // 'wx' fails if the file exists: this is the atomic part of the lock
    fd = openSync(file, "wx");
  } catch (e: any) {
    logger.warn(`SKIP ${name}: lost the race for the lock (${e.code})`);
    return undefined;
  }

  const info: LockInfo = { pid: process.pid, startedAt: Date.now(), name };
  writeSync(fd, JSON.stringify(info));
  closeSync(fd);

  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    try {
      unlinkSync(file);
    } catch (e) {
      /* already gone */
    }
  };

  // best effort: also drop the lock on abnormal termination
  process.once("exit", release);
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });

  return release;
}
