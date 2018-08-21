import { NewsFeed, NewsSource } from "../types";
import { readFeed, FeedReaderItem } from "../feed-reader";
import { logger } from "../logger";
import { getLastReadedFeedUrl } from "../feeds-last-url";
import { sanitizeNewsText, sanitizeNewsTitle } from "../sanitizer";

export async function readNewsFeed(feed: NewsFeed, source: NewsSource, minDate: Date) {
    let feedReaderItems: FeedReaderItem[] = []
    try {
        feedReaderItems = await readFeed(feed.url);
    } catch (e) {
        logger.error(`Error on reading feed: ${feed.url}`, e);
        return [];
    }

    if (!feedReaderItems || !feedReaderItems.length) {
        logger.warn(`Empty feed: ${feed.url}`);
        return [];
    }

    const lastUrl = await getLastReadedFeedUrl({ lang: feed.language, country: source.country }, feed.url);
    if (lastUrl) {
        const lastUrlIndex = feedReaderItems.findIndex(item => item.link === lastUrl);
        if (lastUrlIndex > -1) {
            feedReaderItems = feedReaderItems.slice(0, lastUrlIndex);
        }
    }

    feedReaderItems.reverse();

    const items: NewsFeedItem[] = [];
    for (const feedItem of feedReaderItems) {
        const newsItem: NewsFeedItem = {
            title: sanitizeNewsTitle(feedItem.title),
            link: feedItem.link,
            pubdate: feedItem.pubdate || feedItem.date || new Date(),
        };

        if (newsItem.pubdate < minDate) {
            continue;
        }

        let summary = sanitizeNewsText(feedItem.description || feedItem.summary || '');

        newsItem.summary = summary;
        if (feedItem.content || feedItem.description) {
            let content = sanitizeNewsText(feedItem.content || feedItem.description || '');
            if (content !== summary) {
                newsItem.content = content;
            }
        }

        items.push(newsItem);
    }
    return items;
}

export type NewsFeedItem = {
    title: string
    link: string
    pubdate: Date
    summary?: string
    content?: string
}
