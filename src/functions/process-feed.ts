
const debug = require('debug')('ournet:news-reader');

import { readNewsFeed, NewsFeedItem, NewsSource, NewsFeed } from "./read-news-feed";
import { logger } from "../logger";
import { WebPage, exploreWebPage } from "./explore-web-page";
import { Image, ImageHelper } from "@ournet/images-domain";
import { WebImage, exploreWebImage } from "./explore-web-image";
import { uniq } from "@ournet/domain";
import { URL } from "url";
import { NewsItem } from "@ournet/news-domain";
const inTextSearch = require('in-text-search');

export async function processFeed(feed: NewsFeed, source: NewsSource) {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() - 2);

    let newsFeedItems: NewsFeedItem[];
    try {
        newsFeedItems = await readNewsFeed(feed, source, minDate)
    } catch (e) {
        logger.error(`Error on reading news feed: ${feed.url}`, e);
        return
    }

    for (const newsFeedItem of newsFeedItems) {
        const page = await getWebPage(newsFeedItem);
        if (!page) {
            continue;
        }

        if (page.image) {
            const host = new URL(page.url).host;
            const image = await processImage(page.image, host);

        }
    }
}

async function processNewsItem(page: WebPage, image?: Image): Promise<NewsItem | undefined> {
    if (page.text && page.text.length > 500) {
        await articleContentRep.
    }
}

async function processImage(url: string, host: string): Promise<Image | undefined> {
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
        await putImageById(id, webImage.data);
    }

    if (!existingImage) {
        return await imageRep.create(image);
    }

    return await imageRep.update({
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
