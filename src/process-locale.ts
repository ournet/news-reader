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

  for (const source of sources) {
    for (const feed of source.feeds) {
      if (feed.language !== locale.lang) {
        continue;
      }
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
