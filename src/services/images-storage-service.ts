// const debug = require('debug')('ournet:news-reader:service');

import S3 from "aws-sdk/clients/s3";
import { delay } from "../helpers";
import { ImageStorageHelper } from "@ournet/images-domain";

export interface ImagesStorageService {
  copyImageToEventsById(id: string): Promise<void>;
  putImageById(id: string, body: Buffer, contentType: string): Promise<void>;
}

export type S3ImagesStorageOptions = {
  bucket: string;
  newsName: string;
  eventsName: string;
};

export class S3ImagesStorage implements ImagesStorageService {
  private s3: S3;
  private bucket: string;
  private newsName: string;
  private eventsName: string;

  constructor(
    options: S3ImagesStorageOptions,
    s3options?: S3.ClientConfiguration
  ) {
    this.bucket = options.bucket;
    this.newsName = options.newsName;
    this.eventsName = options.eventsName;

    this.s3 = new S3(s3options);
  }

  copyImageToEventsById(id: string) {
    const key = ImageStorageHelper.formatImageKeyFromId(id);

    return this.copyToEventsByKey(key);
  }

  putImageById(id: string, body: Buffer, contentType: string) {
    const key =
      this.newsName + "/" + ImageStorageHelper.formatImageKeyFromId(id);

    return this.putImage(key, body, contentType);
  }

  private async putImage(key: string, body: Buffer, contentType: string) {
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        CacheControl: "public, max-age=" + 86400 * 30,
        ContentType: contentType,
        Body: body,
        ACL: "public-read"
      })
      .promise();
  }

  private async copyToEventsByKey(key: string) {
    try {
      return this.copyImage(
        this.newsName + "/" + key,
        this.eventsName + "/" + key
      );
    } catch (err: any) {
      if (err.code === "SlowDown" && err.retryable) {
        await delay(1000);
        await this.copyToEventsByKey(key);
      } else {
        throw err;
      }
    }
  }

  private async copyImage(sourceKey: string, targetKey: string) {
    // debug(`Copying images from ${this.bucket + '/' + sourceKey} to ${targetKey}`);
    await this.s3
      .copyObject({
        Bucket: this.bucket,
        Key: targetKey,
        CopySource: this.bucket + "/" + sourceKey,
        CacheControl: "public, max-age=" + 86400 * 60,
        // ContentType: 'image/jpeg',
        ACL: "public-read"
      })
      .promise();
  }
}
