import { HtmlExploredVideoInfo } from "../types";
import { logger } from "../../../logger";

// const VALID_HOSTS = [
//     'protv.md',
//     'jurnaltv.md',
//     'publika.md'
// ];

export default function inputEmbedVideoFinder($: CheerioStatic): HtmlExploredVideoInfo[] {
    const list = $('script[type="application/ld+json"]').toArray()
        .map<{ '@type': string, contentUrl?: string, thumbnailUrl?: string }>(item => {
            const text = $(item).contents().text();
            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error(e);
            }
        })
        .filter(item => item && item['@type'] === 'VideoObject' && item.contentUrl)
        .map(item => {
            const info: HtmlExploredVideoInfo = {
                url: item.contentUrl || '',
                image: item.thumbnailUrl || '',
            }
            return info;
        });

    return list as HtmlExploredVideoInfo[];
}
