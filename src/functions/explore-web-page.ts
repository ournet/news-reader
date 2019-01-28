// const debug = require('debug')('ournet:news-reader');

import { fetchUrl } from './fetch-url';
import { extractTextFromHtml } from '../helpers';
import { sanitizeNewsText, sanitizeNewsTitle } from './sanitizer';
import { normalizeUrl } from '@ournet/domain';
import { isValidImageUrl } from '../invalid-images';
const metascraper = require('metascraper')([
    require('metascraper-date')(),
    require('metascraper-description')(),
    require('metascraper-image')(),
    require('metascraper-title')(),
    require('metascraper-url')()
]);
const ascrape = require('ascrape');

export async function exploreWebPage(webpageUrl: string, lang: string, extractContent?: boolean) {
    const { body: html, url } = await fetchUrl(webpageUrl, {
        timeout: 1000 * 3,
        headers: {
            'user-agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
            // 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
            // 'cache-control': 'max-age=0',
            'accept': 'text/html,application/xhtml+xml',
            // 'accept-charset': 'utf8',
            // 'accept-encoding': 'gzip, deflate',
        },
    });
    // debug(`pre metascraper wepage ${webpageUrl}`)
    const metadata = await metascraper({ html, url });
    // debug(`post metascraper wepage ${webpageUrl}`)
    let text: string | undefined;
    let articleHtml: string | undefined;
    if (extractContent !== false) {
        // debug(`pre scrapeArticleContent ${webpageUrl}`)
        const content = await scrapeArticleContent(html);
        // debug(`post scrapeArticleContent ${webpageUrl}`)
        if (content) {
            text = sanitizeNewsText(extractTextFromHtml(content), lang);
            articleHtml = content;
        }
    }

    const webpage: WebPage = {
        title: metadata.title && sanitizeNewsTitle(extractTextFromHtml(metadata.title), lang),
        url: normalizeWebPageUrl(metadata.url || url),
        image: metadata.image,
        video: metadata.video,
        description: metadata.description && sanitizeNewsText(extractTextFromHtml(metadata.description), lang),
        text,
        articleHtml,
        html,
    };

    if (webpage.image && !isValidImageUrl(webpage.image)) {
        delete webpage.image;
    }

    return webpage;
}

function normalizeWebPageUrl(url: string) {
    return normalizeUrl(url, {
        normalizeProtocol: true,
        normalizeHttps: undefined,
        normalizeHttp: false,
        stripFragment: true,
        stripWWW: undefined,
        removeTrailingSlash: false,
        sortQueryParameters: false,
    });
}

function scrapeArticleContent(html: string) {
    return new Promise<string | undefined>((resolve, reject) => {
        ascrape(html, (error: Error, article: any) => {
            if (error) {
                return reject(error);
            }
            if (article.content) {
                resolve(article.content.html());
            } else {
                resolve();
            }
        });
    });
}

export type WebPage = {
    title: string
    url: string
    description?: string
    image?: string
    video?: string
    lang?: string
    text?: string

    articleHtml?: string
    html: string
}
