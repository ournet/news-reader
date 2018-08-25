
const debug = require('debug')('ournet:news-reader');

import { logger } from "./logger";
import { Image, ImageHelper, ImageRepository } from "@ournet/images-domain";
import { uniq } from "@ournet/domain";
import { URL } from "url";
import {
    BuildNewsParams,
    ArticleContentRepository,
    NewsHelper,
    ArticleContentBuilder,
    TopicLocationMap,
} from "@ournet/news-domain";
import { NewsFeedItem } from "./functions/read-news-feed";
import { OurnetDataStorage, OurnetImagesStorage } from "./types";
import { exploreWebImage, WebImage } from "./functions/explore-web-image";
import { exploreWebPage, WebPage } from "./functions/explore-web-page";
import { extractTextTopics } from "./functions/extract-text-topics";
import { TopicHelper, SaveTopicsUseCase } from "@ournet/topics-domain";
const inTextSearch = require('in-text-search');

export async function processFeedItem(dataStorage: OurnetDataStorage,
    imagesStorage: OurnetImagesStorage,
    feedItem: NewsFeedItem, context: { sourceId: string, country: string, lang: string }) {

    const page = await getWebPage(feedItem);
    if (!page) {
        return;
    }

    let summary = page.description || '';
    const minSummaryLength = 200;
    if (summary.length < minSummaryLength) {
        if (feedItem.summary && feedItem.summary.length > minSummaryLength) {
            summary = feedItem.summary;
        } else if (feedItem.content && feedItem.content.length > minSummaryLength) {
            summary = feedItem.content;
        } else if (page.text && page.text.length > minSummaryLength) {
            summary = page.text;
        }
    }

    const newsItemParams: BuildNewsParams = {
        country: context.country,
        hasContent: false,
        lang: context.lang,
        sourceId: context.sourceId,
        publishedAt: feedItem.pubdate.toISOString(),
        summary,
        title: page.title,
        url: page.url,
    };

    if (page.image) {
        const host = new URL(page.url).host;
        const image = await processImage(dataStorage.imageRep, imagesStorage, page.image, host);
        if (image) {
            newsItemParams.imageIds = [image.id];
        }
    }

    const newsItem = NewsHelper.build(newsItemParams);

    const id = newsItem.id;

    const existingNewsItem = await dataStorage.newsRep.getById(id);
    if (existingNewsItem) {
        return existingNewsItem;
    }

    let content = feedItem.content || '';
    const minContentLength = 800;
    if (page.text && content.length < minContentLength && page.text.length > content.length) {
        content = page.text;
    }
    if (feedItem.summary && content.length < minContentLength && feedItem.summary.length > content.length) {
        content = feedItem.summary;
    }

    const topicTexts = [newsItem.title];
    if (content.length > minContentLength) {
        newsItem.hasContent = true;
        topicTexts.push(content);
    } else {
        newsItem.hasContent = false;
        topicTexts.push(summary);
    }

    const topicText = topicTexts.join('\n').trim();

    const textTopics = (await extractTextTopics(context, topicText)).slice(0, 6);
    if (textTopics.length) {
        const saveTopics = new SaveTopicsUseCase(dataStorage.topicRep);
        const topics = await saveTopics.execute(textTopics.map(item => item.topic));
        newsItem.topics = topics.map(item => ({ id: item.id, type: item.type, name: item.commonName || item.name, slug: TopicHelper.parseSlugFromId(item.id), abbr: item.abbr }));
    }

    if (newsItem.hasContent) {
        const contentStartIndex = newsItem.title.length;
        const topicLocationMap: TopicLocationMap = textTopics.reduce<TopicLocationMap>((map, current) => {
            const index = current.input.find(it => it.index > contentStartIndex);
            if (index) {
                map[TopicHelper.build(current.topic).id] = { index: index.index, length: index.text.length };
            }

            return map;
        }, {});
        await processArticleContent(dataStorage.articleContentRep, newsItem.id, content,
            Object.keys(topicLocationMap).length > 0 ? topicLocationMap : undefined);
    }

    return dataStorage.newsRep.create(newsItem);
}

async function processArticleContent(articleContentRep: ArticleContentRepository, refId: string, text: string, topicsMap?: TopicLocationMap) {
    const content = ArticleContentBuilder.build({
        content: text,
        refId: refId,
        refType: 'NEWS',
        topicsMap,
    });

    return articleContentRep.put(content);
}


async function processImage(imageRep: ImageRepository, imagesStorage: OurnetImagesStorage,
    url: string, host: string): Promise<Image | undefined> {
    let webImage: WebImage;
    try {
        webImage = await exploreWebImage(url);
    } catch (e) {
        logger.error(`Error on exploring web image: ${url}`, e);
        return
    }

    const image = ImageHelper.build({
        color: webImage.color,
        format: webImage.format,
        hash: webImage.hash,
        height: webImage.height,
        host,
        length: webImage.length,
        width: webImage.width,
    });

    const id = image.id;

    const existingImage = await imageRep.getById(id);

    if (existingImage && existingImage.hosts.includes(image.hosts[0])) {
        debug(`The image already used the host: ${host}`);
        return;
    }

    const minStorageDate = new Date();
    minStorageDate.setDate(minStorageDate.getDate() - 7);
    const isOld = existingImage && (existingImage.updatedAt || existingImage.createdAt) < minStorageDate.toISOString();

    if (!existingImage || isOld) {
        await imagesStorage.putImageById(id, webImage.data);
    }

    if (!existingImage) {
        return imageRep.create(image);
    }

    return imageRep.update({
        id,
        set: {
            hosts: uniq(existingImage.hosts.concat(image.hosts)),
            expiresAt: image.expiresAt,
            updatedAt: new Date().toISOString(),
        }
    });
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
