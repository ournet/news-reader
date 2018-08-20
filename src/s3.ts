import S3 = require('aws-sdk/clients/s3');
import { delay } from './helpers';
import { S3_IMAGES_BUCKET } from './config';
import { ImageHelper } from '@ournet/images-domain';

const s3 = new S3();

export function copyImageToStoriesById(id: string) {
    const key = formatImageKeyFromId(id, 'master');

    copyToStoriesByKey(key);
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

function copyToStoriesByKey(key: string) {
    return copyImage('news/' + key, 'stories/' + key)
        .catch(async err => {
            if (err.code === 'SlowDown' && err.retryable) {
                await delay(1000);
                await copyToStoriesByKey(key);
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
