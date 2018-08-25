
import { readFeed, FeedReaderItem } from "./feed-reader";
import { logger } from "../logger";
import { getLastReadedFeedUrl } from "./feeds-last-url";
import { sanitizeNewsText, sanitizeNewsTitle } from "./sanitizer";
import { extractTextFromHtml } from "../helpers";

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
            title: sanitizeNewsTitle(extractTextFromHtml(feedItem.title)),
            link: feedItem.link,
            pubdate: feedItem.pubdate || feedItem.date || new Date(),
        };

        if (newsItem.pubdate < minDate) {
            continue;
        }

        const summary = sanitizeNewsText(extractTextFromHtml(feedItem.description || feedItem.summary || ''));

        newsItem.summary = summary && summary.trim();
        if (feedItem.content || feedItem.description) {
            const content = sanitizeNewsText(extractTextFromHtml(feedItem.content || feedItem.description || ''));
            if (content !== summary) {
                newsItem.content = content && content.trim();
            }
        }

        items.push(newsItem);
    }
    return items;
}

export type NewsSource = {
    id: string
    name: string
    url: string
    country: string
}

export type NewsFeed = {
    url: string
    language: string
}

export type NewsFeedItem = {
    title: string
    link: string
    pubdate: Date
    summary?: string
    content?: string
}
