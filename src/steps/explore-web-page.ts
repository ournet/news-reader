
import { fetchUrl } from '../fetch-url';
import { extractTextFromHtml, decodeHtml } from '../helpers';
import { sanitizeNewsText, sanitizeNewsTitle } from '../sanitizer';
const metascraper = require('metascraper');
const ascrape = require('ascrape');

export async function exploreWebPage(webpageUrl: string) {
    const { body: html, url } = await fetchUrl(webpageUrl);

    const metadata = await metascraper({ html, url });
    const content = await scrapeArticleContent(html);
    let text: string | undefined;
    if (content) {
        text = decodeHtml(extractTextFromHtml(content)).trim();
    }

    const webpage: WebPage = {
        title: metadata.title && sanitizeNewsTitle(metadata.title),
        url: metadata.url || url,
        image: metadata.image,
        video: metadata.video,
        description: metadata.description && sanitizeNewsTitle(metadata.description),
        text: text && sanitizeNewsText(text),
    };

    return webpage;
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
}
