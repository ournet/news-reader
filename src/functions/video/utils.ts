import { VideoSourceType } from "@ournet/videos-domain";

const getVideoId = require('get-video-id');

export function getKnownVideoSource(url: string) {
    const { id, service } = getVideoId(url) as { id: string, service: string };

    if (id && service) {
        if (service === 'youtube') {
            return { sourceType: 'YOUTUBE' as VideoSourceType, sourceId: id };
        } else if (service === 'vimeo') {
            return { sourceType: 'VIMEO' as VideoSourceType, sourceId: id };
        }
    }

    return {};
}

export function parseHtmlSize(value: string) {
    const result = /^\s*(\d+)/.exec(value);
    if (result) {
        return parseInt(result[1]);
    }
}
