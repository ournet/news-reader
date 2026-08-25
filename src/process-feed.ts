const debug = require("debug")("ournet:news-reader");

import {
  readNewsFeed,
  NewsFeedItem,
  NewsSource,
  NewsFeed
} from "./functions/read-news-feed";
import { logger } from "./logger";
import { processFeedItem } from "./process-feed-item";
import { NewsItem } from "@ournet/news-domain";
import { setLastReadedFeedUrl } from "./functions/feeds-last-url";
import { DataService } from "./services/data-service";
import { ImagesStorageService } from "./services/images-storage-service";
import { TextTopicsService } from "./services/text-topics-service";
import { isPastDeadline } from "./deadline";
import { withTimeout } from "./functions/with-timeout";
import { LIMITS } from "./config";

export type ProcessFeedOptions = {
  minDate: Date;
};

export async function processFeed(
  dataService: DataService,
  imagesStorage: ImagesStorageService,
  topicsService: TextTopicsService,
  feed: NewsFeed,
  source: NewsSource,
  options: ProcessFeedOptions
) {
  let newsFeedItems: NewsFeedItem[];
  try {
    newsFeedItems = await readNewsFeed(feed, source, options.minDate);
  } catch (e) {
    logger.error(`Error on reading news feed: ${feed.url}`, e);
    return [];
  }

  if (!newsFeedItems.length) {
    return [];
  }

  const newsItems: NewsItem[] = [];
  // items are ordered oldest first, so this is the newest one we got through
  let lastProcessedLink: string | undefined;

  for (const newsFeedItem of newsFeedItems) {
    if (isPastDeadline()) {
      logger.warn(`Deadline reached while reading feed: ${feed.url}`);
      break;
    }

    let newsItem: NewsItem | undefined;

    try {
      newsItem = await withTimeout(
        processFeedItem(
          dataService,
          imagesStorage,
          topicsService,
          newsFeedItem,
          {
            country: source.country,
            lang: feed.language,
            sourceId: source.id
          }
        ),
        // a single article must never stall the whole locale: everything it
        // does is bounded already, but third party code can still sit there
        LIMITS.ITEM_TIMEOUT_MS,
        `process feed item: ${newsFeedItem.link}`
      );
    } catch (e: any) {
      logger.error(
        `error on process feed item: ${e.message}, ${newsFeedItem.link}`,
        e
      );
      continue;
    } finally {
      // advance the bookmark on failures too, otherwise a permanently broken
      // article is re-fetched on every single run from now on
      lastProcessedLink = newsFeedItem.link;
    }
    if (!newsItem) {
      continue;
    }

    newsItems.push(newsItem);

    debug(`Saved news: ${newsItem.urlHost}${newsItem.urlPath}`);
  }

  if (lastProcessedLink) {
    await setLastReadedFeedUrl(
      { lang: feed.language, country: source.country },
      feed.url,
      lastProcessedLink
    );
  }

  return newsItems;
}
