console.log(process.versions);

require("dotenv").config();

// must be first: caps libvips threads/cache before anything can use sharp
import "./runtime";

import { parseLocale } from "./helpers";

const locale = parseLocale(process.env.LOCALE || process.argv[2]) as Locale;

if (!locale) {
  throw new Error(`LOCALE is required!`);
}

import { logger } from "./logger";
import { DbDataConnection } from "./services/data-connection";
import { getConfigFromEnv, LIMITS } from "./config";
import { NewsReader } from "./news-reader";
import { Locale } from "./types";
import { DbDataService } from "./services/data-service";
import { acquireRunSlot } from "./run-guard";
import { setDeadline, isPastDeadline } from "./deadline";

const localeName = `${locale.lang}-${locale.country}`;
const startDate = Date.now();

function getSeconds() {
  return Math.round((Date.now() - startDate) / 1000);
}

const config = getConfigFromEnv();

async function start() {
  const connection = await DbDataConnection.create(config.MONGO_DB_CONNECTION);

  const awsOptions = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION
  };

  const dataService = new DbDataService(
    connection.mongoClient.db(),
    config.NEWS_ES_HOST,
    awsOptions
  );

  await dataService.init();

  const newsReader = new NewsReader(config, dataService);

  try {
    await newsReader.start(locale);
    await connection.close();
  } catch (e) {
    await connection.close();
    throw e;
  }
}

const runSlot = acquireRunSlot(localeName, {
  maxConcurrent: LIMITS.MAX_CONCURRENT_RUNS,
  maxLockAgeMs: LIMITS.MAX_RUN_SECONDS * 1000 * 2
});

if (!runSlot) {
  // another run of this locale (or too many other locales) is still working
  process.exit(0);
}

const release = runSlot;

setDeadline(LIMITS.MAX_RUN_SECONDS * 1000);

/**
 * Hard stop. The graceful deadline (see ./deadline) lets the pipeline stop
 * between items; this is the backstop for a request that hangs inside a native
 * or third party call and never yields.
 */
const killTimer = setTimeout(() => {
  logger.error(
    `TIMEOUT ${localeName}: killing run after ${getSeconds()}s (MAX_RUN_SECONDS=${LIMITS.MAX_RUN_SECONDS})`
  );
  release();
  process.exit(3);
}, LIMITS.MAX_RUN_SECONDS * 1000 + 30 * 1000);
killTimer.unref();

/**
 * Explicit exit. The elasticsearch client (never closed by its repository) and
 * the aws-sdk keep-alive agents leave referenced handles behind, so relying on
 * an empty event loop can keep an otherwise finished process alive for minutes.
 */
function finish(code: number) {
  release();
  logger.warn(
    `END ${localeName} in ${getSeconds()}s${
      isPastDeadline() ? " (stopped at deadline)" : ""
    }`
  );
  process.exit(code);
}

start()
  .then(() => finish(0))
  .catch((e) => {
    logger.warn(`ERROR ${localeName}: ${e.message}`, e);
    finish(1);
  });
