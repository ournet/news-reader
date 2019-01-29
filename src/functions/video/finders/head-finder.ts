import { HtmlExploredVideoInfo } from "../types";

export default function headVideoFinder ($: Cheerio): HtmlExploredVideoInfo[] {
    const list: HtmlExploredVideoInfo[] = [];
    const width = parseInt($.find('meta[property="og:video:width"]').first().attr('content')) || undefined;
    const height = parseInt($.find('meta[property="og:video:height"]').first().attr('content')) || undefined;

    list.push({
        url: $.find('meta[property="og:video:secure_url"]').first().attr('content'),
        width,
        height,
    });
    list.push({
        url: $.find('meta[property="og:video"]').first().attr('content'),
        width,
        height,
    });

    list.push({
        url: $.find('meta[property="twitter:player:stream"]').first().attr('content'),
    });

    return list.filter(item => item.url && item.url.trim().length > 2);
}
