
import { fetchUrl } from '../fetch-url';
const metascraper = require('metascraper');
const ascrape = require('ascrape');

export async function exploreWebPage(webpageUrl: string) {
    const { body: html, url } = await fetchUrl(webpageUrl);

    const metadata = await metascraper({ html, url });
    const content = await scrapeArticleContent(html);

    const webpage: WebPage = {
        title: metadata.title,
        url: metadata.url,
        image: metadata.image,
        video: metadata.video,
        description: metadata.description,
        text: content,
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
