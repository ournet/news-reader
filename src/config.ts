import { Dictionary } from "@ournet/domain";
import { Locale } from "./types";

const VALID_LOCALES: Dictionary<string[]> = {
    ro: ['ro', 'md'],
    ru: ['ru', 'md'],
    bg: ['bg'],
};

export function isValidLocale(locale: Locale) {
    return VALID_LOCALES[locale.lang] && VALID_LOCALES[locale.lang].includes(locale.country);
}

export interface Config {
    S3_IMAGES_NEWS_NAME: string
    S3_IMAGES_EVENTS_NAME: string

    S3_IMAGES_BUCKET: string

    MONGO_DB_CONNECTION: string

    NEWS_ES_HOST: string
    NEWS_SEARCH_MIN_SCORE: number

    MIN_EVENT_NEWS: number

    ENTITIZER_URL: string

    ENTITIZER_KEY: string

    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_REGION: string

    NEWS_PAST_MINUTES: number
}

const S3_IMAGES_NEWS_NAME = 'news';
const S3_IMAGES_EVENTS_NAME = 'events';
const S3_IMAGES_BUCKET = 'news.ournetcdn.net';

export function getConfigFromEnv(): Config {
    const config: Config = {
        S3_IMAGES_EVENTS_NAME: process.env.S3_IMAGES_EVENTS_NAME || S3_IMAGES_EVENTS_NAME,
        S3_IMAGES_NEWS_NAME: process.env.S3_IMAGES_NEWS_NAME || S3_IMAGES_NEWS_NAME,
        S3_IMAGES_BUCKET: process.env.S3_IMAGES_BUCKET || S3_IMAGES_BUCKET,
        MONGO_DB_CONNECTION: process.env.MONGO_DB_CONNECTION || '',
        NEWS_ES_HOST: process.env.NEWS_ES_HOST || '',
        NEWS_SEARCH_MIN_SCORE: process.env.NEWS_SEARCH_MIN_SCORE
            && parseFloat(process.env.NEWS_SEARCH_MIN_SCORE) || 0,
        MIN_EVENT_NEWS: process.env.MIN_EVENT_NEWS
            && parseFloat(process.env.MIN_EVENT_NEWS) || 0,
        ENTITIZER_URL: process.env.ENTITIZER_URL || '',
        ENTITIZER_KEY: process.env.ENTITIZER_KEY || '',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
        AWS_REGION: process.env.AWS_REGION || '',
        NEWS_PAST_MINUTES: process.env.NEWS_PAST_MINUTES
            && parseInt(process.env.NEWS_PAST_MINUTES) || 60,
    };

    validateConfig(config);

    return config;
}

function validateConfig(config: Config) {
    if (!config.MONGO_DB_CONNECTION) {
        throw new Error('TOPICS_DB_CONNECTION is required!');
    }
    if (!config.NEWS_ES_HOST) {
        throw new Error('NEWS_ES_HOST is required!');
    }

    if (!config.NEWS_SEARCH_MIN_SCORE || config.NEWS_SEARCH_MIN_SCORE === NaN || config.NEWS_SEARCH_MIN_SCORE < 0) {
        throw new Error('NEWS_SEARCH_MIN_SCORE is required!');
    }

    if (!config.MIN_EVENT_NEWS || config.MIN_EVENT_NEWS === NaN || config.MIN_EVENT_NEWS < 2) {
        throw new Error('MIN_EVENT_NEWS is required!');
    }

    if (!config.ENTITIZER_URL) {
        throw new Error('ENTITIZER_URL is required!');
    }

    if (!config.ENTITIZER_KEY) {
        throw new Error('ENTITIZER_KEY is required!');
    }
}