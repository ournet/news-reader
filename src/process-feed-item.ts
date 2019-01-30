
const debug = require('debug')('ournet:news-reader');

import {
    NewsHelper, Topic,
} from "@ournet/news-domain";
import { NewsFeedItem } from "./functions/read-news-feed";
import { buildNewsData } from "./steps/build-news-data";
import { saveNewsTopics } from "./steps/save-news-topics";
import { TextTopicsService } from "./services/text-topics-service";
import { saveNewsQuotes } from "./steps/save-news-quotes";
import { saveArticleContent } from "./steps/save-article-content";
import { saveNewsImage } from "./steps/save-news-image";
import { DataService } from "./services/data-service";
import { ImagesStorageService } from "./services/images-storage-service";
import { logger } from "./logger";
import { saveNewsVideo } from "./steps/save-news-video";

export interface ProcessFeedItemInfo {
    sourceId: string
    country: string
    lang: string
}

export async function processFeedItem(dataService: DataService, imagesStorage: ImagesStorageService,
    topicsService: TextTopicsService, feedItem: NewsFeedItem, info: ProcessFeedItemInfo) {

    // debug(`pre build news data: ${feedItem.link}`);

    const newsData = await buildNewsData(feedItem, {
        country: info.country,
        lang: info.lang,
        sourceId: info.sourceId,
    });

    if (!newsData) {
        return;
    }

    // debug(`post build news data: ${newsData.url}`);

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

    const existingNewsItem = await dataService.newsRep.getById(id);
    if (existingNewsItem) {
        logger.warn(`News already exists: ${existingNewsItem.id}`);
        return;
        // return existingNewsItem;
    }

    const newsTopics = await saveNewsTopics(dataService.topicRep, topicsService, newsItem.title, newsData.content || newsData.summary, info);

    if (newsTopics.topics.length) {
        newsItem.topics = newsTopics.topics.slice(0, 6)
            .map<Topic>(item => ({
                id: item.topic.id,
                slug: item.topic.slug,
                name: item.topic.commonName || item.topic.name,
                type: item.topic.type,
                abbr: item.topic.abbr,
            }));
    } else {
        logger.warn(`News without topics: ${newsData.url}`);
        return;
    }

    if (newsData.image) {
        const image = await saveNewsImage(dataService.imageRep, imagesStorage, newsData.image, newsData.url, newsData.lang);
        if (image) {
            newsItem.imagesIds = [image.id];
        }
    }

    if (newsData.video) {
        const video = await saveNewsVideo(dataService.videoRep, newsData.video);
        if (video) {
            newsItem.videoId = video.id;
        } else {
            debug(`Not saved video`, newsData.video);
        }
    }

    const quotesIds = await saveNewsQuotes(dataService.quoteRep, newsItem, newsTopics);
    if (quotesIds.length) {
        newsItem.quotesIds = quotesIds;
        newsItem.countQuotes = quotesIds.length;
    }

    if (newsData.content) {
        await saveArticleContent(dataService.articleContentRep, newsData.content, {
            refId: newsItem.id,
            refType: 'NEWS'
        }, newsTopics);
    }

    const createdItem = await dataService.newsRep.create(newsItem);

    if (newsItem.videoId) {
        if (!createdItem.videoId) {
            debug(`Not video on create`, newsData.video);
        } else {
            debug(`News with video`, createdItem.id);
        }
    }

    return createdItem;
}
