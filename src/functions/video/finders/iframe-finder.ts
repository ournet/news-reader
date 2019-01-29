import { HtmlExploredVideoInfo } from "../types";
import { getKnownVideoSource, parseHtmlSize } from "../utils";

export default function iframeVideoFinder($: Cheerio): HtmlExploredVideoInfo[] {
    const list = $.find('iframe').toArray()
        .map(item => ({
            url: item.attribs['src'],
            width: item.attribs['width'],
            height: item.attribs['height'],
        }))
        .filter(item => item.url && item.url.length > 10)
        .map(item => {
            const source = getKnownVideoSource(item.url);
            if (source.sourceType) {
                const info: HtmlExploredVideoInfo = {
                    url: item.url,
                    width: item.width && parseHtmlSize(item.width) || undefined,
                    height: item.height && parseHtmlSize(item.height) || undefined,
                }

                return info;
            }
        })
        .filter(item => !!item)
        .sort((a, b) => {
            if (!a || !b) {
                return 0;
            }
            const aw = a.width || 0;
            const bw = b.width || 0;

            return bw - aw;
        });

    return list as HtmlExploredVideoInfo[];
}
