
// const debug = require('debug')('ournet:news-reader');

import { logger } from "../logger";
import { WebImage, exploreWebImage } from "../functions/explore-web-image";
import { NewsFeedItem } from "../functions/read-news-feed";
import { WebPage, exploreWebPage } from "../functions/explore-web-page";
import { IMAGE_MIN_WIDTH, IMAGE_MIN_HEIGHT } from "@ournet/images-domain";
const inTextSearch = require('in-text-search');

export interface NewsData {
    country: string
    lang: string
    sourceId: string
    publishedAt: string
    summary: string
    title: string
    url: string
    content?: string
    image?: WebImage
}

export type BuildNewsDataOptions = {
    sourceId: string
    country: string
    lang: string
    minContentLength: number
    minSummaryLength: number
}

export async function buildNewsData(feedItem: NewsFeedItem, options: BuildNewsDataOptions) {

    const page = await getWebPage(feedItem);
    if (!page) {
        return;
    }

    let summary = page.description || '';
    const minSummaryLength = options.minSummaryLength;
    if (summary.length < minSummaryLength) {
        if (feedItem.summary && feedItem.summary.length > minSummaryLength) {
            summary = feedItem.summary;
        } else if (feedItem.content && feedItem.content.length > minSummaryLength) {
            summary = feedItem.content;
        } else if (page.text && page.text.length > minSummaryLength) {
            summary = page.text;
        }
    }

    let content = feedItem.content || '';
    const minContentLength = options.minContentLength;
    if (page.text && content.length < minContentLength && page.text.length > content.length) {
        content = page.text;
    }
    if (feedItem.summary && content.length < minContentLength && feedItem.summary.length > content.length) {
        content = feedItem.summary;
    }

    const newsData: NewsData = {
        country: options.country,
        lang: options.lang,
        sourceId: options.sourceId,
        publishedAt: feedItem.pubdate.toISOString(),
        summary,
        title: page.title,
        url: page.url,
        content: content.length > minContentLength ? content : undefined,
    };
    if (page.image) {
        try {
            newsData.image = await exploreWebImage(page.image);
        } catch (e) {
            logger.error('Error on getting web image: ' + e.message);
        }
        if (newsData.image && (newsData.image.width < IMAGE_MIN_WIDTH || newsData.image.height < IMAGE_MIN_HEIGHT)) {
            delete newsData.image;
        }
    }

    return newsData;
}


async function getWebPage(newsItem: NewsFeedItem): Promise<WebPage | undefined> {
    let page: WebPage;
    try {
        page = await exploreWebPage(newsItem.link);
    } catch (e) {
        logger.error(`Error on exploring web page: ${newsItem.link}`, e);
        return
    }

    if (inTextSearch(newsItem.title).search(page.title) < 0.7) {
        logger.error(`Inavlid page title: ${newsItem.title} <> ${page.title}`);
        return
    }

    if (newsItem.summary && (!page.description || page.description.length < newsItem.summary.length)) {
        page.description = newsItem.summary;
    }

    if (newsItem.content && (!page.text || page.text.length < newsItem.content.length)) {
        page.text = newsItem.content;
    }

    return page;
}
