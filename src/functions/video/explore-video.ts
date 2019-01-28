import { HtmlExploredVideo, HtmlExploredVideoInfo } from "./types";
import { resolve as resolveUrl } from 'url';
import { normalizeUrl, uniqByProperty } from "@ournet/domain";
import headVideoFinder from "./finders/head-finder";
import * as cheerio from 'cheerio';

export type ExploreVideoOptions = {
    url: string
    html: string
    articleHtml?: string
}

export function exploreVideo(options: ExploreVideoOptions): HtmlExploredVideo[] {
    const $ = cheerio.load(options.html);
    let videos: HtmlExploredVideoInfo[] = [];

    const $head = $('head');

    videos = videos.concat(headVideoFinder($head));

    videos = filterVideos(videos);
    videos = normalizeVideos(videos, options.url);
    videos = uniqByProperty(videos, 'url');

    return videos.map(mapVideo);
}

function mapVideo(info: HtmlExploredVideoInfo) {
    const video: HtmlExploredVideo = {
        sourceId: info.url,
        sourceType: 'URL',
        height: info.height,
        width: info.width,
    };

    return video;
}

function filterVideos(videos: HtmlExploredVideoInfo[]) {
    return videos.filter(item =>
        item && item.url && item.url.trim().length > 10 &&
        (!item.contentType || item.contentType.trim().toLowerCase().startsWith('video'))
    );
}

function normalizeVideos(videos: HtmlExploredVideoInfo[], url: string) {
    return videos.map(item => {
        const video: HtmlExploredVideoInfo = {
            url: resolveUrl(url, item.url.trim()),
        };

        video.url = normalizeUrl(video.url);

        if (item.contentType) {
            video.contentType = item.contentType.trim().toLowerCase();
        }

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