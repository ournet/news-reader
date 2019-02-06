import { HtmlExploredVideoInfo } from "../types";
import { logger } from "../../../logger";

export default function scriptVideoFinder($: CheerioStatic): HtmlExploredVideoInfo[] {
    const list = $('script[type="application/ld+json"]').toArray()
        .map<{ '@type': string, contentUrl?: string, thumbnailUrl?: string }>(item => {
            const text = $(item).contents().text();
            if (!text) {
                return;
            }
            try {
                return JSON.parse(text);
            } catch (e) {
                logger.info(e);
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

// const encodeJson = (json: string) =>json.replace(/\\n/g, "\\n")
//     .replace(/\\'/g, "\\'")
//     .replace(/\\"/g, '\\"')
//     .replace(/\\&/g, "\\&")
//     .replace(/\\r/g, "\\r")
//     .replace(/\\t/g, "\\t")
//     .replace(/\\b/g, "\\b")
//     .replace(/\\f/g, "\\f")
