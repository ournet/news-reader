
// const debug = require('debug')('ournet:news-reader');

import { readNewsFeed, NewsFeedItem, NewsSource, NewsFeed } from "./functions/read-news-feed";
import { logger } from "./logger";
import { processFeedItem } from "./process-feed-item";
import { OurnetDataStorage, OurnetImagesStorage } from "./types";
import { NewsItem } from "@ournet/news-domain";
import { setLastReadedFeedUrl } from "./functions/feeds-last-url";

export async function processFeed(dataStorage: OurnetDataStorage, imagesStorage: OurnetImagesStorage, feed: NewsFeed, source: NewsSource) {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() - 2);

    let newsFeedItems: NewsFeedItem[];
    try {
        newsFeedItems = await readNewsFeed(feed, source, minDate)
    } catch (e) {
        logger.error(`Error on reading news feed: ${feed.url}`, e);
        return
    }

    if (!newsFeedItems.length) {
        return;
    }

    for (const newsFeedItem of newsFeedItems) {
        let newsItem: NewsItem | undefined;

        try {
            newsItem = await processFeedItem(dataStorage, imagesStorage, newsFeedItem, {
                country: source.country,
                lang: feed.language,
                sourceId: source.id,
            });
        } catch (e) {
            logger.error(`error on process feed item: ${e.message}`);
            continue;
        }
        if (!newsItem) {
            continue;
        }

    }

    await setLastReadedFeedUrl({ lang: feed.language, country: source.country },
        feed.url, newsFeedItems[newsFeedItems.length - 1].link);
}
