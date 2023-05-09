import { HtmlExploredVideo, HtmlExploredVideoInfo } from "./types";
import { resolve as resolveUrl } from "url";
import { uniqByProperty } from "@ournet/domain";
import * as cheerio from "cheerio";
import fetch, { Response } from "node-fetch";
import { logger } from "../../logger";
import { VideoSourceType } from "@ournet/videos-domain";
import { getKnownVideoSource } from "./utils";

export type ExploreVideoOptions = {
  url: string;
  html: string;
  articleHtml?: string;
};

interface VideoFinderHandler {
  ($: CheerioStatic): HtmlExploredVideoInfo[];
}

function getFinders(): VideoFinderHandler[] {
  return [
    "head-finder",
    "iframe-finder",
    "script-finder"
  ].map<VideoFinderHandler>((name) => require("./finders/" + name).default);
}

export async function exploreVideo(
  options: ExploreVideoOptions
): Promise<HtmlExploredVideo | undefined> {
  const $ = cheerio.load(options.html);
  let videos: HtmlExploredVideoInfo[] = [];

  const finders = getFinders();

  for (const finder of finders) {
    videos = videos.concat(finder($));
  }

  videos = filterVideos(videos);
  videos = normalizeVideos(videos, options.url);
  videos = uniqByProperty(videos, "url");

  for (const info of videos) {
    let sourceType: VideoSourceType | undefined;
    try {
      sourceType = await getVideoSourceType(info);
    } catch (e: any) {
      logger.error(`Video HEAD response: ` + e.message, { url: info.url });
    }

    if (!sourceType) {
      continue;
    }

    let sourceId = info.url;

    const source = getKnownVideoSource(info.url);
    if (source.sourceId && source.sourceType) {
      sourceId = source.sourceId;
      sourceType = source.sourceType;
    }

    const video: HtmlExploredVideo = {
      sourceId,
      sourceType,
      height: info.height,
      width: info.width
    };

    video.image = getKnownVideoImage(video);

    return video;
  }
}

function getKnownVideoImage(video: HtmlExploredVideo) {
  if (video.sourceType === "YOUTUBE") {
    return `https://i.ytimg.com/vi/${video.sourceId}/maxresdefault.jpg`;
  }
}

function filterVideos(videos: HtmlExploredVideoInfo[]) {
  return videos.filter(
    (item) =>
      item &&
      item.url &&
      item.url.trim().length > 10 &&
      (!item.width || item.width >= 400)
  );
}

function normalizeVideos(videos: HtmlExploredVideoInfo[], url: string) {
  return videos.map((item) => {
    const video: HtmlExploredVideoInfo = {
      url: resolveUrl(url, item.url.trim())
    };

    const width = getSize(item.width);
    const height = getSize(item.height);

    if (width) {
      video.width = width;
    }

    if (height) {
      video.height = height;
    }

    return video;
  });
}

function getSize(n: number | undefined) {
  if (n && Number.isSafeInteger(n) && n > 0 && n < 10000) {
    return n;
  }
}

async function getVideoSourceType(info: HtmlExploredVideoInfo) {
  let response: Response;

  try {
    response = await fetch(info.url, {
      method: "HEAD",
      timeout: 1000 * 2,
      headers: {
        accept: "text/html,q=0.9,video/*;q=0.8"
      }
    });
  } catch (e: any) {
    throw new Error(e.message || "Error HEAD " + info.url);
  }

  if (!response.status || response.status >= 400) {
    logger.warn(`Video HEAD ${response.status}`);
    return;
  }

  const contentType = (response.headers.get("content-type") || "")
    .trim()
    .toLowerCase();

  if (contentType.includes("text/html")) {
    return "IFRAME";
  }
  if (contentType.includes("video/")) {
    return "URL";
  }
}
