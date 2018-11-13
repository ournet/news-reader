
const debug = require('debug')('ournet:news-reader');

import { logger } from "../logger";
import { WebImage, exploreWebImage } from "../functions/explore-web-image";
import { NewsFeedItem } from "../functions/read-news-feed";
import { WebPage, exploreWebPage } from "../functions/explore-web-page";
import { IMAGE_MIN_WIDTH, IMAGE_MIN_HEIGHT } from "@ournet/images-domain";
import { NEWS_MIN_SUMMARY_LENGTH, NEWS_MAX_SUMMARY_LENGTH } from "@ournet/news-domain";
// import { atonic } from "@ournet/domain";
// import { inTextSearch } from "../helpers";

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
}

export async function buildNewsData(feedItem: NewsFeedItem, options: BuildNewsDataOptions) {
    // debug(`pre get web page ${feedItem.link}`);

    const page = await getWebPage(feedItem, options.lang);
    if (!page) {
        debug(`NO web page ${feedItem.link}`);
        return;
    }

    // debug(`post get web page ${page.url}`);

    let summary = page.description || '';
    const minSummaryLength = NEWS_MIN_SUMMARY_LENGTH;
    if (summary.length < minSummaryLength) {
        if (feedItem.summary && feedItem.summary.length > minSummaryLength) {
            summary = feedItem.summary;
        } else if (feedItem.content && feedItem.content.length > minSummaryLength) {
            summary = feedItem.content;
        } else if (page.text && page.text.length > minSummaryLength) {
            summary = page.text;
        }
    }

    if (summary.length < NEWS_MIN_SUMMARY_LENGTH) {
        logger.warn(`News summary too small`);
        return;
    }

    let content = feedItem.content || '';
    const minContentLength = NEWS_MAX_SUMMARY_LENGTH;
    if (page.text && content.length < minContentLength && page.text.length > content.length) {
        content = page.text;
    }
    if (feedItem.summary && content.length < minContentLength && feedItem.summary.length > content.length) {
        content = feedItem.summary;
    }

    const title = (page.title.length < 50 || page.title.length > 250) ? feedItem.title : page.title;

    const newsData: NewsData = {
        country: options.country,
        lang: options.lang,
        sourceId: options.sourceId,
        publishedAt: (feedItem.pubdate || new Date()).toISOString(),
        summary,
        title,
        url: page.url,
        content: content.length > minContentLength ? content : undefined,
    };
    if (page.image) {
        try {
            newsData.image = await exploreWebImage(page.image);
        } catch (e) {
            logger.error('Error on getting web image: ' + e.message, e);
        }
        if (newsData.image && (newsData.image.width < IMAGE_MIN_WIDTH || newsData.image.height < IMAGE_MIN_HEIGHT)) {
            delete newsData.image;
        }
    }

    return newsData;
}


async function getWebPage(newsItem: NewsFeedItem, lang: string): Promise<WebPage | undefined> {
    let page: WebPage;
    try {
        page = await exploreWebPage(newsItem.link, lang);
    } catch (e) {
        logger.error(`Error on exploring web page: ${newsItem.link}`, e);
        return
    }

    if (newsItem.title.length < page.title.length) {
        page.title = newsItem.title;
    }

    // if (newsItem.link !== page.url && inTextSearch(atonic(newsItem.title))(atonic(page.title)) < 0.65) {
    //     logger.error(`Inavlid page title: ${newsItem.title} <> ${page.title}`);
    //     return
    // }

    if (newsItem.summary && (!page.description || page.description.length < newsItem.summary.length)) {
        page.description = newsItem.summary;
    }

    if (newsItem.content && (!page.text || page.text.length < newsItem.content.length)) {
        page.text = newsItem.content;
    }

    return page;
}
