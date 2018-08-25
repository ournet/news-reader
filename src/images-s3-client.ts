import S3 = require('aws-sdk/clients/s3');
import { delay } from './helpers';
import { ImageHelper } from '@ournet/images-domain';

export type ImagesS3ClientOptions = {
    bucket: string
    newsName: string
    eventsName: string
}

export class ImagesS3Client {
    private s3: S3
    private bucket: string
    private newsName: string
    private eventsName: string

    constructor(options: ImagesS3ClientOptions, s3options?: S3.ClientConfiguration) {
        this.bucket = options.bucket;
        this.newsName = options.newsName;
        this.eventsName = options.eventsName;

        this.s3 = new S3(s3options);
    }


    copyImageToEventsById(id: string) {
        const key = formatImageKeyFromId(id, 'master');

        return this.copyToEventsByKey(key);
    }

    putImageById(id: string, body: Buffer | Blob) {
        const key = formatImageKeyFromId(id, 'master');

        return this.putImage(key, body);
    }

    private async putImage(key: string, body: Buffer | Blob) {
        await this.s3.putObject({
            Bucket: this.bucket,
            Key: key,
            CacheControl: 'public, max-age=' + (86400 * 30),
            ContentType: 'image/jpeg',
            Body: body,
            ACL: 'public-read'
        }).promise();
    }

    private copyToEventsByKey(key: string) {
        return this.copyImage(this.newsName + '/' + key, this.eventsName + '/' + key)
            .catch(async err => {
                if (err.code === 'SlowDown' && err.retryable) {
                    await delay(1000);
                    await this.copyToEventsByKey(key);
                }
                throw err;
            });
    }

    private async copyImage(sourceKey: string, targetKey: string) {
        await this.s3.copyObject({
            Bucket: this.bucket,
            Key: targetKey,
            CopySource: this.newsName + '/' + sourceKey,
            CacheControl: 'public, max-age=' + (86400 * 60),
            ContentType: 'image/jpeg',
            ACL: 'public-read'
        }).promise();
    }

}

function formatImageKeyFromId(id: string, size: 'master') {
    const format = ImageHelper.parseImageIdFormat(id);
    return `${id.substr(0, 4)}/${size}/${id}.${format}`;
}
