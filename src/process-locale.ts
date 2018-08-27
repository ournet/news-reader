
const debug = require('debug')('ournet:news-reader');

import { DataService } from "./services/data-service";
import { ImagesStorageService } from "./services/images-storage-service";
import { TextTopicsService } from "./services/text-topics-service";
import { Locale } from "./types";
import { readSources } from 'news-sources';
import { processFeed } from "./process-feed";


export async function processLocale(dataService: DataService, imagesStorage: ImagesStorageService,
    topicsService: TextTopicsService, locale: Locale) {

    const sources = await readSources(locale.country);

    for (const source of sources) {
        for (const feed of source.feeds) {
            if (feed.language !== locale.lang) {
                continue;
            }
            debug(`Start processing feed: ${source.id}, ${feed.url}`);
            await processFeed(dataService, imagesStorage, topicsService, feed, source);
            debug(`Processed feed: ${source.id}, ${feed.url}`);
        }
    }
}