
export const S3_IMAGES_NEWS_NAME = 'news';
export const S3_IMAGES_EVENTS_NAME = 'events';

export const S3_IMAGES_BUCKET = process.env.S3_IMAGES_BUCKET || '';

if (!S3_IMAGES_BUCKET) {
    throw new Error('S3_IMAGES_BUCKET is required!');
}

export const TOPICS_DB_CONNECTION = process.env.TOPICS_DB_CONNECTION || '';

if (!TOPICS_DB_CONNECTION) {
    throw new Error('TOPICS_DB_CONNECTION is required!');
}

export const NEWS_ES_HOST = process.env.NEWS_ES_HOST || '';
if (!NEWS_ES_HOST) {
    throw new Error('NEWS_ES_HOST is required!');
}

export const NEWS_SEARCH_MIN_SCORE = process.env.NEWS_SEARCH_MIN_SCORE
    && parseFloat(process.env.NEWS_SEARCH_MIN_SCORE) || 0;

if (!NEWS_SEARCH_MIN_SCORE || NEWS_SEARCH_MIN_SCORE === NaN || NEWS_SEARCH_MIN_SCORE < 0) {
    throw new Error('NEWS_SEARCH_MIN_SCORE is required!');
}

export const MIN_EVENT_NEWS = process.env.MIN_EVENT_NEWS
    && parseFloat(process.env.MIN_EVENT_NEWS) || 0;

if (!MIN_EVENT_NEWS || MIN_EVENT_NEWS === NaN || MIN_EVENT_NEWS < 2) {
    throw new Error('MIN_EVENT_NEWS is required!');
}

export const ENTITIZER_URL = process.env.ENTITIZER_URL || '';

if (!ENTITIZER_URL) {
    throw new Error('ENTITIZER_URL is required!');
}

export const ENTITIZER_KEY = process.env.ENTITIZER_KEY || '';

if (!ENTITIZER_KEY) {
    throw new Error('ENTITIZER_KEY is required!');
}
