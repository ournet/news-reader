
import got = require('got');
import FeedParser = require('feedparser');
import { toutf8 } from './to-utf8';

const ITEM_CONTENT_NAMES = ['yandex:full-text'];

export function readFeed(url: string): Promise<FeedReaderItem[]> {
    return new Promise<FeedReaderItem[]>((resolve, reject) => {
        const req = got.stream(url, {
            timeout: 1000 * 3,
            method: 'GET',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
                'cache-control': 'max-age=0',
                'accept': 'application/xhtml+xml,application/xml',
                'accept-charset': 'utf8',
            },
        });
        req.on('error', reject);

        const feedparser = new FeedParser({
            normalize: true,
        });

        feedparser.on('error', reject);

        req.pipe(toutf8()).pipe(feedparser);

        req.on('response', function (res) {
            if (res.statusCode !== 200) {
                req.emit('error', new Error('Bad status code'));
            }
        });

        const items: FeedReaderItem[] = [];

        feedparser.on('readable', function () {
            let item: FeedParser.Item;

            while (item = feedparser.read()) {
                let content: string | undefined = undefined;
                ITEM_CONTENT_NAMES.forEach(function (cname) {
                    if ((<any>item)[cname]) {
                        content = (<any>item)[cname]['#'];
                    }
                });
                items.push({
                    author: item.author || undefined,
                    categories: item.categories || undefined,
                    comments: item.comments || undefined,
                    date: item.date || undefined,
                    description: item.description || undefined,
                    enclosures: <any>item.enclosures || undefined,
                    guid: item.guid || undefined,
                    image: item.image || undefined,
                    link: item.link,
                    origlink: item.origlink || undefined,
                    permalink: (<any>item).permalink || undefined,
                    pubdate: item.pubdate || undefined,
                    summary: item.summary || undefined,
                    title: item.title,
                    content,
                });
            }
        });

        feedparser.on('end', () => resolve(items));
    });
}

export type FeedReaderItem = {
    content?: string
    title: string
    /** frequently, the full article content */
    description?: string
    /** frequently, an excerpt of the article content */
    summary?: string
    link: string
    /** when FeedBurner or Pheedo puts a special tracking url in the link property, origlink contains the original link */
    origlink?: string
    /** when an RSS feed has a guid field and the isPermalink attribute is not set to false, permalink contains the value of guid */
    permalink?: string
    /** most recent update */
    date?: Date
    /** original published date */
    pubdate?: Date
    author?: string
    /** a unique identifier for the article */
    guid?: string
    /** a link to the article's comments section */
    comments?: string
    /** an Object containing url and title properties */
    image?: { url: string, title?: string }
    categories?: string[]
    /** an Object containing url and title properties pointing to the original source for an article; see the RSS Spec for an explanation of this element */
    source?: { url: string, title?: string }
    /** an Array of Objects, each representing a podcast or other enclosure and having a url property and possibly type and length properties */
    enclosures?: { url: string }[]
    // meta (an Object containing all the feed meta properties; especially handy when using the EventEmitter interface to listen to article emissions)
}
