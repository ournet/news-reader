import {
  ImageFormat,
  getImageSizeByName,
  getImageMasterSizeName,
  ImageFormatHelper
} from "@ournet/images-domain";
import sharp from "sharp";
import { getImageColor } from "./image-color2";
import { getImageHash } from "./image-hash";
import { download } from "./http";
import { LIMITS } from "../config";

const MIN_IMAGE_BYTES = 5000;

export async function exploreWebImage(imageUrl: string) {
  const { buffer, url } = await download(imageUrl, {
    timeout: 1000 * 5,
    totalTimeout: 1000 * 15,
    maxBytes: LIMITS.MAX_IMAGE_BYTES,
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
      accept: "image/jpeg,image/png,image/webp"
    }
  });

  if (buffer.byteLength < MIN_IMAGE_BYTES) {
    throw new Error("Image is too small: " + buffer.byteLength);
  }

  return getWebImage(buffer, url);
}

async function getWebImage(data: Buffer, url: string): Promise<WebImage> {
  // header-only read, does not decode pixels
  const metadata = await sharp(data).metadata();

  const format = ImageFormatHelper.getFormatByExtension(metadata.format || "");

  const masterSize = getImageSizeByName(getImageMasterSizeName());
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  let width = originalWidth;
  let height = originalHeight;

  if (masterSize < originalWidth || masterSize < originalHeight) {
    const resized =
      masterSize < originalWidth
        ? await sharp(data)
            .resize(masterSize, undefined)
            .toBuffer({ resolveWithObject: true })
        : await sharp(data)
            .resize(undefined, masterSize)
            .toBuffer({ resolveWithObject: true });

    data = resized.data;
    // report what we actually store, not what we downloaded: these end up on
    // the image record, and event building picks its cover by the widest one
    width = resized.info.width;
    height = resized.info.height;
  }

  const hash = await getImageHash(data);
  const color = await getImageColor(data);

  return {
    url,
    data,
    width,
    height,
    length: data.byteLength,
    hash,
    format,
    color
  };
}

export type WebImage = {
  url: string;
  data: Buffer;
  width: number;
  height: number;
  length: number;
  hash: string;
  format: ImageFormat;
  color: string;
};
