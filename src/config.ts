import { Dictionary } from "@ournet/domain";
import { Locale } from "./types";

const VALID_LOCALES: Dictionary<string[]> = {
  ro: ["ro", "md"],
  ru: ["ru", "md"],
  bg: ["bg"],
  en: ["in"],
  it: ["it"],
  cs: ["cz"],
  hu: ["hu"],
  es: ["es"]
};

export function isValidLocale(locale: Locale) {
  return (
    VALID_LOCALES[locale.lang] &&
    VALID_LOCALES[locale.lang].includes(locale.country)
  );
}

function envInt(name: string, defaultValue: number) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const value = parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

/**
 * Resource limits.
 *
 * Separate from `Config` because these are never required: each one has a
 * default that works, and they exist so a box running several locales at once
 * can be tuned without a deploy. `Config` is the credentials and thresholds the
 * app cannot start without, and it is validated as such.
 *
 * Read once at load, so anything that sets them must do so before requiring
 * this module (dotenv is called first in app.ts).
 */
export const LIMITS = {
  /** Soft cap on a single run. Keep it below the cron interval for the locale. */
  MAX_RUN_SECONDS: envInt("MAX_RUN_SECONDS", 600),

  /** Max news-reader processes allowed to run at the same time, all locales. */
  MAX_CONCURRENT_RUNS: envInt("MAX_CONCURRENT_RUNS", 2),

  /** Budget for a single article, end to end. */
  ITEM_TIMEOUT_MS: envInt("ITEM_TIMEOUT_MS", 1000 * 90),

  /** Default total time an outgoing request may take, connect to last byte. */
  HTTP_TIMEOUT_MS: envInt("HTTP_TIMEOUT_MS", 1000 * 10),

  /** Hard cap on a downloaded web page or feed. */
  MAX_PAGE_BYTES: envInt("MAX_PAGE_BYTES", 1024 * 1024 * 3),

  /** Hard cap on a downloaded image. */
  MAX_IMAGE_BYTES: envInt("MAX_IMAGE_BYTES", 1024 * 1024 * 8),

  /** libvips worker threads. Its own default is one per CPU, per process. */
  SHARP_CONCURRENCY: envInt("SHARP_CONCURRENCY", 1),

  /**
   * Articles fetched at once within a feed. The work is network bound - our own
   * HTTP is ~360ms of a ~4s article, the rest is entitizer, dynamo, ES and S3 -
   * so this buys wall clock cheaply. Every article in a batch hits the *same*
   * host, though, and past 5 the sites start throttling and it gets slower, so
   * the useful range is 1 to 5.
   */
  FEED_ITEM_CONCURRENCY: envInt("FEED_ITEM_CONCURRENCY", 3)
};

export interface Config {
  S3_IMAGES_NEWS_NAME: string;
  S3_IMAGES_EVENTS_NAME: string;

  S3_IMAGES_BUCKET: string;

  MONGO_DB_CONNECTION: string;

  NEWS_ES_HOST: string;
  NEWS_SEARCH_MIN_SCORE: number;

  MIN_EVENT_NEWS: number;

  ENTITIZER_URL: string;

  ENTITIZER_KEY: string;

  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;

  NEWS_PAST_MINUTES: number;
}

const S3_IMAGES_NEWS_NAME = "news";
const S3_IMAGES_EVENTS_NAME = "events";
const S3_IMAGES_BUCKET = "news.ournetcdn.net";

export function getConfigFromEnv(): Config {
  const config: Config = {
    S3_IMAGES_EVENTS_NAME:
      process.env.S3_IMAGES_EVENTS_NAME || S3_IMAGES_EVENTS_NAME,
    S3_IMAGES_NEWS_NAME: process.env.S3_IMAGES_NEWS_NAME || S3_IMAGES_NEWS_NAME,
    S3_IMAGES_BUCKET: process.env.S3_IMAGES_BUCKET || S3_IMAGES_BUCKET,
    MONGO_DB_CONNECTION: process.env.MONGO_DB_CONNECTION || "",
    NEWS_ES_HOST: process.env.NEWS_ES_HOST || "",
    NEWS_SEARCH_MIN_SCORE:
      (process.env.NEWS_SEARCH_MIN_SCORE &&
        parseFloat(process.env.NEWS_SEARCH_MIN_SCORE)) ||
      0,
    MIN_EVENT_NEWS:
      (process.env.MIN_EVENT_NEWS && parseFloat(process.env.MIN_EVENT_NEWS)) ||
      0,
    ENTITIZER_URL: process.env.ENTITIZER_URL || "",
    ENTITIZER_KEY: process.env.ENTITIZER_KEY || "",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
    AWS_REGION: process.env.AWS_REGION || "",
    NEWS_PAST_MINUTES:
      (process.env.NEWS_PAST_MINUTES &&
        parseInt(process.env.NEWS_PAST_MINUTES)) ||
      60
  };

  validateConfig(config);

  return config;
}

function validateConfig(config: Config) {
  if (!config.MONGO_DB_CONNECTION) {
    throw new Error("TOPICS_DB_CONNECTION is required!");
  }
  if (!config.NEWS_ES_HOST) {
    throw new Error("NEWS_ES_HOST is required!");
  }

  if (
    !config.NEWS_SEARCH_MIN_SCORE ||
    Number.isNaN(config.NEWS_SEARCH_MIN_SCORE) ||
    config.NEWS_SEARCH_MIN_SCORE < 0
  ) {
    throw new Error("NEWS_SEARCH_MIN_SCORE is required!");
  }

  if (
    !config.MIN_EVENT_NEWS ||
    Number.isNaN(config.MIN_EVENT_NEWS) ||
    config.MIN_EVENT_NEWS < 2
  ) {
    throw new Error("MIN_EVENT_NEWS is required!");
  }

  if (!config.ENTITIZER_URL) {
    throw new Error("ENTITIZER_URL is required!");
  }

  if (!config.ENTITIZER_KEY) {
    throw new Error("ENTITIZER_KEY is required!");
  }
}
