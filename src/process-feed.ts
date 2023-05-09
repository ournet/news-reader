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

  for (const newsFeedItem of newsFeedItems) {
    let newsItem: NewsItem | undefined;

    try {
      newsItem = await processFeedItem(
        dataService,
        imagesStorage,
        topicsService,
        newsFeedItem,
        {
          country: source.country,
          lang: feed.language,
          sourceId: source.id
        }
      );
    } catch (e: any) {
      logger.error(
        `error on process feed item: ${e.message}, ${newsFeedItem.link}`,
        e
      );
      continue;
    }
    if (!newsItem) {
      continue;
    }

    newsItems.push(newsItem);

    debug(`Saved news: ${newsItem.urlHost}${newsItem.urlPath}`);
  }

  await setLastReadedFeedUrl(
    { lang: feed.language, country: source.country },
    feed.url,
    newsFeedItems[newsFeedItems.length - 1].link
  );

  return newsItems;
}
