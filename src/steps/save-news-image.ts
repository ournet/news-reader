const debug = require("debug")("ournet:news-reader");

import {
  ImageHelper,
  ImageRepository,
  ImageFormatHelper
} from "@ournet/images-domain";
import { URL } from "url";
import { WebImage } from "../functions/explore-web-image";
import { uniq } from "@ournet/domain";
import { ImagesStorageService } from "../services/images-storage-service";

export async function saveNewsImage(
  imageRep: ImageRepository,
  imagesStorage: ImagesStorageService,
  webImage: WebImage,
  pageUrl: string,
  lang: string
) {
  const host = new URL(pageUrl).host;

  const image = ImageHelper.build({
    color: webImage.color,
    format: webImage.format,
    hash: webImage.hash,
    height: webImage.height,
    host,
    length: webImage.length,
    width: webImage.width,
    lang
  });

  const id = image.id;

  const existingImage = await imageRep.getById(id);

  const imageHost = image.hosts[0];

  if (
    existingImage &&
    (existingImage.hosts.includes(imageHost) ||
      existingImage.hosts.includes(imageHost.substr(0, imageHost.length - 3)))
  ) {
    debug(`The image already used the host: ${host}`);
    return;
  }

  const minStorageDate = new Date();
  minStorageDate.setDate(minStorageDate.getDate() - 7);
  const isOld =
    existingImage &&
    (existingImage.updatedAt || existingImage.createdAt) <
      minStorageDate.toISOString();

  if (!existingImage || isOld) {
    await imagesStorage.putImageById(
      id,
      webImage.data,
      ImageFormatHelper.getMimeByFormat(webImage.format)
    );
  }

  if (!existingImage) {
    return imageRep.create(image);
  }

  return imageRep.update({
    id,
    set: {
      hosts: uniq(existingImage.hosts.concat(image.hosts)),
      expiresAt: image.expiresAt,
      updatedAt: new Date().toISOString()
    }
  });
}
