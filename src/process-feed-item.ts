
// const debug = require('debug')('ournet:news-reader');

// import { logger } from "./logger";

import {
    NewsHelper,
} from "@ournet/news-domain";
import { NewsFeedItem } from "./functions/read-news-feed";
import { OurnetDataStorage, OurnetImagesStorage } from "./types";
import { buildNewsData } from "./steps/build-news-data";
import { saveNewsTopics } from "./steps/save-news-topics";
import { ExtractTextTopicsOptions } from "./functions/extract-text-topics";
import { saveNewsQuotes } from "./steps/save-news-quotes";
import { saveArticleContent } from "./steps/save-article-content";
import { saveNewsImage } from "./steps/save-news-image";

export interface ProcessFeedItemInfo extends ExtractTextTopicsOptions {
    sourceId: string
    country: string
    lang: string
}

export async function processFeedItem(dataStorage: OurnetDataStorage,
    imagesStorage: OurnetImagesStorage,
    feedItem: NewsFeedItem, info: ProcessFeedItemInfo) {

    const newsData = await buildNewsData(feedItem, {
        country: info.country,
        lang: info.lang,
        sourceId: info.sourceId,
        minContentLength: 800,
        minSummaryLength: 400,
    });

    if (!newsData) {
        return;
    }

    const newsItem = NewsHelper.build({
        country: newsData.country,
        hasContent: !!newsData.content,
        lang: newsData.lang,
        sourceId: newsData.sourceId,
        summary: newsData.summary,
        title: newsData.title,
        url: newsData.url,
    });

    const id = newsItem.id;

    const existingNewsItem = await dataStorage.newsRep.getById(id);
    if (existingNewsItem) {
        return existingNewsItem;
    }

    if (newsData.image) {
        const image = await saveNewsImage(dataStorage.imageRep, imagesStorage, newsData.image, newsData.url);
        if (image) {
            newsItem.imageIds = [image.id];
        }
    }

    const newsTopics = await saveNewsTopics(dataStorage.topicRep, newsItem.title, newsData.content || newsData.summary, info, info);

    if (newsTopics.topics.length) {
        newsItem.topics = newsTopics.topics.slice(0, 6)
            .map(item => ({
                id: item.topic.id,
                slug: item.topic.slug,
                name: item.topic.commonName || item.topic.name,
                type: item.topic.type,
            }));
    }

    const quotesIds = await saveNewsQuotes(dataStorage.quoteRep, newsItem, newsTopics);
    if (quotesIds.length) {
        newsItem.quotesIds = quotesIds;
        newsItem.countQuotes = quotesIds.length;
    }

    if (newsData.content) {
        await saveArticleContent(dataStorage.articleContentRep, newsData.content, {
            refId: newsItem.id,
            refType: 'NEWS'
        }, newsTopics);
    }

    return dataStorage.newsRep.create(newsItem);
}
