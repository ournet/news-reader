// const debug = require('debug')('ournet:news-reader');

import { fetchUrl } from "./fetch-url";
import { extractTextFromHtml } from "../helpers";
import { sanitizeNewsText, sanitizeNewsTitle } from "./sanitizer";
import { normalizeUrl } from "@ournet/domain";
import { isValidImageUrl } from "../invalid-images";
const metascraper = require("metascraper")([
  require("metascraper-date")(),
  require("metascraper-description")(),
  require("metascraper-image")(),
  require("metascraper-title")(),
  require("metascraper-url")()
]);
const ascrape = require("ascrape");

export async function exploreWebPage(
  webpageUrl: string,
  lang: string,
  extractContent?: boolean
) {
  const { body: html, url } = await fetchUrl(webpageUrl, {
    timeout: 1000 * 3,
    totalTimeout: 1000 * 15,
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
      // 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
      // 'cache-control': 'max-age=0',
      accept: "text/html,application/xhtml+xml"
      // 'accept-charset': 'utf8',
      // 'accept-encoding': 'gzip, deflate',
    }
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
    title:
      metadata.title &&
      sanitizeNewsTitle(extractTextFromHtml(metadata.title), lang),
    url: normalizeWebPageUrl(metadata.url || url),
    images: (metadata.image && [metadata.image]) || [],
    video: metadata.video,
    description:
      metadata.description &&
      sanitizeNewsText(extractTextFromHtml(metadata.description), lang),
    text,
    articleHtml,
    html
  };

  if (webpage.images) {
    webpage.images = webpage.images.filter(isValidImageUrl);
  }

  return webpage;
}

function normalizeWebPageUrl(url: string) {
  return normalizeUrl(url, {
    normalizeProtocol: true,
    forceHttps: true,
    forceHttp: false,
    stripHash: true,
    stripWWW: undefined,
    removeTrailingSlash: false,
    sortQueryParameters: false
  });
}

const SCRAPE_TIMEOUT_MS = 1000 * 20;

function scrapeArticleContent(html: string) {
  return new Promise<string | undefined>((resolve, reject) => {
    // ascrape is callback based and gives no guarantee it calls back; without
    // this the whole run stops on a single page it cannot parse.
    let done = false;
    const timer = setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      reject(new Error(`ascrape timed out after ${SCRAPE_TIMEOUT_MS}ms`));
    }, SCRAPE_TIMEOUT_MS);

    const settle = (fn: () => void) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      fn();
    };

    ascrape(html, (error: Error, article: any) => {
      if (error) {
        return settle(() => reject(error));
      }
      if (article && article.content) {
        const content = article.content.html();
        settle(() => resolve(content));
      } else {
        settle(() => resolve(undefined));
      }
    });
  });
}

export type WebPage = {
  title: string;
  url: string;
  description?: string;
  images: string[];
  video?: string;
  lang?: string;
  text?: string;

  articleHtml?: string;
  html: string;
};
