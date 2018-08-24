import S3 = require('aws-sdk/clients/s3');
import { delay } from './helpers';
import { S3_IMAGES_BUCKET, S3_IMAGES_NEWS_NAME, S3_IMAGES_EVENTS_NAME } from './config';
import { ImageHelper } from '@ournet/images-domain';

const s3 = new S3();

export function copyImageToEventsById(id: string) {
    const key = formatImageKeyFromId(id, 'master');

    return copyToEventsByKey(key);
}

export function putImageById(id: string, body: Buffer | Blob) {
    const key = formatImageKeyFromId(id, 'master');

    return putImage(key, body);
}

async function putImage(key: string, body: Buffer | Blob) {
    await s3.putObject({
        Bucket: S3_IMAGES_BUCKET,
        Key: key,
        CacheControl: 'public, max-age=' + (86400 * 30),
        ContentType: 'image/jpeg',
        Body: body,
        ACL: 'public-read'
    }).promise();
}

function copyToEventsByKey(key: string) {
    return copyImage(S3_IMAGES_NEWS_NAME + '/' + key, S3_IMAGES_EVENTS_NAME + '/' + key)
        .catch(async err => {
            if (err.code === 'SlowDown' && err.retryable) {
                await delay(1000);
                await copyToEventsByKey(key);
            }
            throw err;
        });
}

async function copyImage(sourceKey: string, targetKey: string) {
    await s3.copyObject({
        Bucket: S3_IMAGES_BUCKET,
        Key: targetKey,
        CopySource: S3_IMAGES_BUCKET + '/' + sourceKey,
        CacheControl: 'public, max-age=' + (86400 * 60),
        ContentType: 'image/jpeg',
        ACL: 'public-read'
    }).promise();
}

function formatImageKeyFromId(id: string, size: 'master') {
    const format = ImageHelper.parseImageIdFormat(id);
    return `${id.substr(0, 4)}/${size}/${id}.${format}`;
}
