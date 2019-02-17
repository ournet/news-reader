
const debug = require('debug')('ournet:news-reader:event');

import {
    NewsItem,
    NewsEvent,
    Topic,
    EventHelper,
    ArticleContentRepository,
    ArticleContentBuilder,
    NewsEventItem,
} from "@ournet/news-domain";
import { uniq, Dictionary, uniqByProperty, atonic } from "@ournet/domain";
import { logger } from "../logger";
import { inTextSearch } from "../helpers";
import { ImageHelper, ImageRepository } from "@ournet/images-domain";
import { DataService } from "../services/data-service";
import { ImagesStorageService } from "../services/images-storage-service";
import { setQuotesEvent } from "./save-news-quotes";

const MIN_TITLE_LENGTH = 25;
const MAX_TITLE_LENGTH = 140;
const MIN_IMAGE_WIDTH = 460;

export type CreateEventOptions = {
    minSearchScore: number
    minEventNews: number
}

export async function createEvent(dataService: DataService, imagesStorage: ImagesStorageService, newsItem: NewsItem, options: CreateEventOptions): Promise<NewsEvent | undefined> {

    const maxCreatedAt = new Date();
    maxCreatedAt.setHours(maxCreatedAt.getHours() - 12);

    const q = newsItem.title;

    const foundedNews = await dataService.newsRep.search({
        country: newsItem.country,
        lang: newsItem.lang,
        minScore: options.minSearchScore,
        limit: 10,
        maxCreatedAt,
        q,
        type: 'best_fields',
    });

    if (!foundedNews.length) {
        debug(`Not found news for: ${q}`);
        return;
    }

    const newsWithoutEvent: NewsItem[] = [];
    const newsWithEvent: NewsItem[] = [];

    foundedNews.forEach(item => {
        if (item.eventId) {
            newsWithEvent.push(item);
        } else {
            newsWithoutEvent.push(item);
        }
    });

    let event: NewsEvent | undefined;
    if (newsWithEvent.length) {
        event = await addNewsToEvent(dataService, newsWithEvent[0].eventId as string, newsItem);
    } else if (newsWithoutEvent.length + 1 >= options.minEventNews) {
        newsWithoutEvent.unshift(newsItem);
        event = await createNewsEvent(dataService, imagesStorage, newsWithoutEvent);
    }

    return event;
}

async function createNewsEvent(dataService: DataService, imagesStorage: ImagesStorageService, newsItems: NewsItem[]) {
    debug(`Creating event...`);

    newsItems = uniqByProperty(newsItems, 'id');

    if (!newsItems.length) {
        throw new Error(`An evvent cannot be created from 0 news`);
    }

    const title = findBestEventTitle(newsItems) as string;
    if (!title) {
        logger.warn(`Not found a goot event title`);
        return;
    }



    const allTopics = newsItems.reduce<Topic[]>((list, item) => list.concat(item.topics || []), []);
    const topics = extractEventTopics(allTopics, 5, 2);

    if (!topics.length || topics.length < 1) {
        logger.warn(`No topics for the news creating event: ${title}`);
        return;
    }

    const eventImage = await findBestEventImage(dataService.imageRep, newsItems);
    if (!eventImage) {
        logger.warn(`Not found image for event ${title}`);
        return;
    }

    const contentItem = await findEventContentItem(dataService.articleContentRep, newsItems);
    if (!contentItem) {
        logger.warn(`Not found content for event ${title}`);
        return;
    }


    const summary = findBestEventSummary(title, newsItems);
    const { imagesIds, quotesIds, videosIds } = formatEventLists(newsItems);

    let items = newsItems.filter(item => isValidEventNewsItem(item, title) && item.id !== contentItem.id);
    items = uniqByProperty(items, 'id');
    if (items.length < 1) {
        items = newsItems.slice(0, 1);
    }


    const country = newsItems[0].country;
    const lang = newsItems[0].lang;

    const event = EventHelper.build({
        title,
        summary,
        topics,
        imagesIds,
        quotesIds,
        videosIds,
        country,
        lang,
        hasContent: true,
        imageHost: eventImage.host,
        imageId: eventImage.id,
        imageSourceId: eventImage.sourceId,
        news: items.map(mapNewsItemToEventNewsItem),
        source: {
            host: contentItem.host,
            path: contentItem.path,
            id: contentItem.id,
            sourceId: contentItem.sourceId,
        },
    });

    event.countNews = newsItems.length;

    await dataService.articleContentRep.put(ArticleContentBuilder.build({
        content: contentItem.content,
        refId: event.id,
        refType: 'EVENT',
        format: contentItem.format,
        topicsMap: contentItem.topicsMap,
    }));

    await imagesStorage.copyImageToEventsById(eventImage.id);

    debug(`pre creating event...`);
    const createdEvent = await dataService.eventRep.create(event);

    debug(`pre updating news eventId...`);
    await Promise.all(newsItems.map(item => dataService.newsRep.update({ id: item.id, set: { eventId: event.id } })));

    await setQuotesEvent(dataService.quoteRep, quotesIds, event);

    debug(`Created event: ${title}`);

    return createdEvent;
}

async function addNewsToEvent(dataService: DataService, eventId: string, newsItem: NewsItem) {
    debug(`Adding new news to event: ${eventId}`);

    const event = await dataService.eventRep.getById(eventId);

    if (!event) {
        throw new Error(`Not found event=${eventId}`);
    }

    await dataService.newsRep.update({
        id: newsItem.id,
        set: {
            eventId,
        }
    });

    let limit = event.countNews + 2;
    limit = limit > 100 ? 100 : limit;

    const eventNews = await dataService.newsRep.latestByEvent({ eventId, country: event.country, lang: event.lang, limit },
        { fields: ['id', 'imagesIds', 'quotesIds', 'videoId'] });

    const { imagesIds, quotesIds, videosIds } = formatEventLists(eventNews);


    const setEvent: Partial<NewsEvent> = {
        countNews: event.countNews + 1,
        countImages: imagesIds.length,
        countQuotes: quotesIds.length,
        countVideos: videosIds.length,
    };
    if (quotesIds.length) {
        setEvent.quotesIds = quotesIds;
    }
    if (videosIds.length) {
        setEvent.videosIds = videosIds;
    }
    if (imagesIds.length) {
        setEvent.imagesIds = imagesIds;
    }

    if (event.items.length < 5 && isValidEventNewsItem(newsItem, event.title) && newsItem.id !== event.source.id) {
        event.items.push(mapNewsItemToEventNewsItem(newsItem));
        event.items = uniqByProperty(event.items, 'id');
        setEvent.items = event.items;
    }

    const updatedEvent = await dataService.eventRep.update({
        id: eventId,
        set: setEvent,
    });

    await setQuotesEvent(dataService.quoteRep, quotesIds, event);

    debug(`Updated event: ${event.title}`);

    return updatedEvent;
}

function isValidEventNewsItem(item: NewsItem, eventTitle: string) {
    return item.title.length > MIN_TITLE_LENGTH && item.title.length < MAX_TITLE_LENGTH
        && !atonic(item.title.toLowerCase()).startsWith(atonic(eventTitle.slice(0, 30).toLowerCase()));
}

async function findEventContentItem(contentRep: ArticleContentRepository, newsItems: NewsItem[]) {

    const contentItem = newsItems.find(item => item.hasContent);
    if (!contentItem) {
        return;
    }

    const content = await contentRep.getById(ArticleContentBuilder.createId({ refId: contentItem.id, refType: 'NEWS' }));
    if (!content) {
        return;
    }

    return {
        id: contentItem.id,
        host: contentItem.urlHost,
        path: contentItem.urlPath,
        sourceId: contentItem.sourceId,
        content: content.content,
        format: content.format,
        topicsMap: content.topicsMap,
    }
}

async function findBestEventImage(imageRep: ImageRepository, newsItems: NewsItem[]) {
    const imageItems = newsItems.filter(item => item.imagesIds && item.imagesIds.length
        && ImageHelper.parseImageOrientationFromId(item.imagesIds[0]) === 'LANGSCAPE');

    if (!imageItems.length) {
        return;
    }

    const ids = uniq(imageItems.reduce<string[]>((list, item) => list.concat(item.imagesIds || []), []));

    const images = await imageRep.getByIds(ids);

    const image = images.sort((a, b) => b.width - a.width)[0];

    if (image.width < MIN_IMAGE_WIDTH) {
        return;
    }

    const item = imageItems.find(item => item.imagesIds && item.imagesIds.includes(image.id) || false);
    if (!item) {
        logger.error(`Not found item by image id!!!`);
        return;
    }

    return {
        host: item.urlHost,
        sourceId: item.sourceId,
        id: image.id,
    }
}

function formatEventLists(newsItems: NewsItem[]) {
    let imagesIds: string[] = [];
    let quotesIds: string[] = [];
    let videosIds: string[] = [];

    newsItems.forEach(item => {
        if (item.imagesIds) {
            imagesIds = imagesIds.concat(item.imagesIds);
        }
        if (item.videoId) {
            videosIds.push(item.videoId);
        }
        if (item.quotesIds) {
            quotesIds = quotesIds.concat(item.quotesIds);
        }
    });

    imagesIds = uniq(imagesIds);
    quotesIds = uniq(quotesIds);
    videosIds = uniq(videosIds);

    return {
        imagesIds,
        quotesIds,
        videosIds,
    }
}

function findBestEventSummary(title: string, newsItems: NewsItem[]) {
    const search = inTextSearch(title);

    const data = newsItems.map(item => ({ summary: item.summary, score: search(item.summary) }))
        .sort((a, b) => b.score - a.score);

    debug(`select summary from`, data);

    return data[0].summary;
}

function findBestEventTitle(newsItems: NewsItem[]) {
    const titles = newsItems.map(item => item.title)
        .filter(title => title.length > MIN_TITLE_LENGTH && title.length < MAX_TITLE_LENGTH);
    if (!titles.length) {
        return;
    }
    if (titles.length === 1) {
        return titles[0];
    }

    const sympolsList = ['.', '?', '!', '(', ')', '[', ']', '{', '}', ';', ':', '"', '“', '”', '‘', '’', '«', '»', '/', '\\'];
    const wordSlitRegex = /[\s,:;?!.()\[\]{}"“”‘’«»/\\-]+/g;

    const titlesData = titles.map(title => {
        let score = 0;
        for (const char of title) {
            if (sympolsList.includes(char)) {
                score--;
            }
        }
        const words = title.trim().split(wordSlitRegex);
        words.forEach(word => {
            if (word.toUpperCase() === word && word.toLowerCase() !== word) {
                score--;
            }
        });

        return {
            score, title,
        }
    }).sort((a, b) => b.score - a.score);

    debug(`select 1st from titles`, titlesData);

    const title = titlesData[0].title;

    if (title === title.toUpperCase()) {
        return undefined;
    }

    return title;
}

function extractEventTopics(topics: Topic[], limit: number, minScore: number = 2) {
    minScore = minScore && minScore > 0 ? minScore : 2;

    const topicsMap = topics.reduce<Dictionary<{ score: number, topic: Topic }>>((map, topic) => {
        if (!map[topic.id]) {
            map[topic.id] = { score: 0, topic };
        }
        map[topic.id].score++;
        return map;
    }, {});

    return Object.keys(topicsMap)
        .map(id => topicsMap[id])
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.topic);
}

function mapNewsItemToEventNewsItem(item: NewsItem) {
    const eventItem: NewsEventItem = {
        host: item.urlHost,
        id: item.id,
        path: item.urlPath,
        publishedAt: item.publishedAt,
        sourceId: item.sourceId,
        title: item.title,
    }

    return eventItem;
}
