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

  let processedFeeds = 0;
  const totalFeeds = sources.reduce(
    (count, source) =>
      count + source.feeds.filter((f) => f.language === locale.lang).length,
    0
  );

  for (const source of sources) {
    for (const feed of source.feeds) {
      if (feed.language !== locale.lang) {
        continue;
      }
      if (isPastDeadline()) {
        // the next cron tick picks these feeds up; running past our slot only
        // means overlapping with it
        logger.warn(
          `Deadline reached, stopping after ${processedFeeds}/${totalFeeds} feeds`
        );
        return;
      }
      processedFeeds++;
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
      for (const item of items) {
        if (isPastDeadline()) {
          break;
        }
        try {
          await createEvent(dataService, imagesStorage, item, {
            minEventNews: config.MIN_EVENT_NEWS,
            minSearchScore: config.NEWS_SEARCH_MIN_SCORE
          });
        } catch (e: any) {
          logger.error(`Error on createEvent: ${e.message}`, e);
        }
      }
      debug(`Processed feed: ${source.id}, ${feed.url}`);
    }
  }
}
