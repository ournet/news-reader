import { HtmlExploredVideo, HtmlExploredVideoInfo } from "./types";
import { resolve as resolveUrl } from 'url';
import { uniqByProperty } from "@ournet/domain";
import headVideoFinder from "./finders/head-finder";
import * as cheerio from 'cheerio';
import got = require("got");
import { logger } from "../../logger";
import { VideoSourceType } from "@ournet/videos-domain";
import { getKnownVideoSource } from "./utils";
import iframeVideoFinder from "./finders/iframe-finder";

export type ExploreVideoOptions = {
    url: string
    html: string
    articleHtml?: string
}

export async function exploreVideo(options: ExploreVideoOptions): Promise<HtmlExploredVideo | undefined> {
    const $ = cheerio.load(options.html);
    let videos: HtmlExploredVideoInfo[] = [];

    const $head = $('head');
    const $body = $('body');

    videos = videos.concat(headVideoFinder($head));
    videos = videos.concat(iframeVideoFinder($body));

    videos = filterVideos(videos);
    videos = normalizeVideos(videos, options.url);
    videos = uniqByProperty(videos, 'url');

    for (const info of videos) {
        let sourceType: VideoSourceType | undefined;
        try {
            sourceType = await getVideoSourceType(info);
        } catch (e) {
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
            width: info.width,
        };

        video.image = getKnownVideoImage(video);

        return video;
    }
}

function getKnownVideoImage(video: HtmlExploredVideo) {
    if (video.sourceType === 'YOUTUBE') {
        return `https://i.ytimg.com/vi/${video.sourceId}/maxresdefault.jpg`;
    }
}

function filterVideos(videos: HtmlExploredVideoInfo[]) {
    return videos.filter(item =>
        item && item.url && item.url.trim().length > 10 &&
        (!item.width || item.width >= 400)
    );
}

function normalizeVideos(videos: HtmlExploredVideoInfo[], url: string) {
    return videos.map(item => {
        const video: HtmlExploredVideoInfo = {
            url: resolveUrl(url, item.url.trim()),
        };

        // video.url = normalizeUrl(video.url, { normalizeHttp: false, normalizeHttps: false, });

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
    // if (info.sourceType) {
    //     return info.sourceType;
    // }

    const response = await got(info.url, {
        timeout: 1000 * 2,
        method: 'HEAD',
        headers: {
            accept: 'text/html,q=0.9,video/*;q=0.8'
        }
    })

    if (!response.statusCode || response.statusCode >= 400) {
        logger.warn(`Video HEAD ${response.statusCode}`);
        return;
    }

    const contentType = (response.headers["content-type"] || '').trim().toLowerCase();

    if (contentType.includes('text/html')) {
        return 'IFRAME';
    }
    if (contentType.includes('video/')) {
        return 'URL';
    }
}
