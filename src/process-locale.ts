const debug = require("debug")("ournet:news-reader");

import { DataService } from "./services/data-service";
import { ImagesStorageService } from "./services/images-storage-service";
import { TextTopicsService } from "./services/text-topics-service";
import { Locale } from "./types";
import { readSources } from "news-sources";
import { processFeed } from "./process-feed";
import { createEvent } from "./steps/create-event";
import { Config, isValidLocale } from "./config";
import { logger } from "./logger";
import { isPastDeadline } from "./deadline";
import { getFeedStartIndex, setFeedStartIndex } from "./functions/feeds-cursor";
import { NewsFeed, NewsSource } from "./functions/read-news-feed";

export async function processLocale(
  dataService: DataService,
  imagesStorage: ImagesStorageService,
  topicsService: TextTopicsService,
  locale: Locale,
  config: Config
) {
  if (!isValidLocale(locale)) {
    throw new Error(`Invalid locale: ${locale.lang}-${locale.country}`);
  }
  debug(`getting sources for ${locale.country}`);
  const sources = await readSources(locale.country);
  debug(`got sources for ${locale.country}`);
  const processFeedMinDate = new Date();
  processFeedMinDate.setMinutes(
    processFeedMinDate.getMinutes() - config.NEWS_PAST_MINUTES
  );

  // one flat list, so the run can start where the previous one stopped
  const feeds: { source: NewsSource; feed: NewsFeed }[] = [];
  for (const source of sources) {
    for (const feed of source.feeds) {
      if (feed.language === locale.lang) {
        feeds.push({ source, feed });
      }
    }
  }

  const totalFeeds = feeds.length;
  const startIndex = await getFeedStartIndex(locale, totalFeeds);

  let processedFeeds = 0;
  let totalNews = 0;
  let totalEvents = 0;
  const startedAt = Date.now();

  logger.info(
    `${totalFeeds} feeds to read for ${locale.lang}-${locale.country}, starting at #${startIndex}`
  );

  for (let i = 0; i < totalFeeds; i++) {
    const { source, feed } = feeds[(startIndex + i) % totalFeeds];

    if (isPastDeadline()) {
      // the next cron tick resumes from here rather than from the top, so the
      // tail of the list is not starved
      logger.warn(
        `Deadline reached with ${totalFeeds - processedFeeds} feeds left`
      );
      break;
    }

    processedFeeds++;
    const feedStartedAt = Date.now();
    debug(`Start processing feed: ${source.id}, ${feed.url}`);
    const items = await processFeed(
      dataService,
      imagesStorage,
      topicsService,
      feed,
      source,
      {
        minDate: processFeedMinDate
      }
    );
    debug(`${items.length} items readed`);
    totalNews += items.length;

    let events = 0;
    for (const item of items) {
      if (isPastDeadline()) {
        break;
      }
      try {
        const event = await createEvent(dataService, imagesStorage, item, {
          minEventNews: config.MIN_EVENT_NEWS,
          minSearchScore: config.NEWS_SEARCH_MIN_SCORE
        });
        if (event) {
          events++;
        }
      } catch (e: any) {
        logger.error(`Error on createEvent: ${e.message}`, e);
      }
    }
    totalEvents += events;

    // one line per feed: a run is otherwise silent for minutes, which makes
    // "still working" and "stuck" look identical from the outside
    logger.info(
      `[${processedFeeds}/${totalFeeds}] ${source.id} news=${items.length} events=${events} ${seconds(
        feedStartedAt
      )}s rss=${rssMb()}MB`
    );
  }

  await setFeedStartIndex(locale, startIndex + processedFeeds, totalFeeds);

  summarize();

  function summarize() {
    logger.info(
      `DONE ${locale.lang}-${locale.country}: ${processedFeeds}/${totalFeeds} feeds, ` +
        `${totalNews} news, ${totalEvents} events in ${seconds(startedAt)}s, rss=${rssMb()}MB`
    );
  }
}

function seconds(since: number) {
  return Math.round((Date.now() - since) / 1000);
}

function rssMb() {
  return Math.round(process.memoryUsage().rss / 1048576);
}
