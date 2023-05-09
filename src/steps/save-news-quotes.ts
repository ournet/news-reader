// const debug = require('debug')('ournet:news-reader');

// import { logger } from "../logger";
import {
  QuoteRepository,
  QuoteHelper,
  QuoteTopicRelation,
  QuoteTopic,
  Quote
} from "@ournet/quotes-domain";
import { NewsTextTopics } from "./save-news-topics";
import { NewsItem, NewsEvent } from "@ournet/news-domain";
import { extractTextQuotes } from "../functions/extract-text-quotes";
import { uniqByProperty, uniq } from "@ournet/domain";
import { TextTopic } from "../services/text-topics-service";
import { logger } from "../logger";
import { delay } from "../helpers";

export type SaveQuotesInfo = {
  lang: string;
  country: string;
  newsTitle: string;
  newsText: string;
};

export async function saveNewsQuotes(
  quoteRep: QuoteRepository,
  newsItem: NewsItem,
  newsTopics: NewsTextTopics
) {
  const text = newsTopics.text;
  const textTopics = newsTopics.topics;

  let persons: { index: number; id: string }[] = [];
  for (const item of textTopics) {
    if (item.topic.type === "PERSON") {
      persons = persons.concat(
        item.input.map((it) => ({ index: it.index, id: item.topic.id }))
      );
    }
  }
  const textQuotes = await extractTextQuotes(text, newsItem.lang, persons);

  if (!textQuotes.length) {
    return [];
  }

  const quoteIds: string[] = [];

  for (const textQuote of textQuotes) {
    const author = textTopics.find(
      (item) => item.topic.id === textQuote.author.id
    );
    if (!author) {
      continue;
    }
    const quote = QuoteHelper.build({
      author: {
        id: author.topic.id,
        name: author.topic.commonName || author.topic.name,
        slug: author.topic.slug
      },
      country: newsItem.country,
      lang: newsItem.lang,
      source: {
        host: newsItem.urlHost,
        id: newsItem.id,
        path: newsItem.urlPath,
        title: newsItem.title
      },
      text: textQuote.text
    });
    if (newsItem.imagesIds && newsItem.imagesIds.length) {
      quote.source.imageId = newsItem.imagesIds[0];
    }

    quoteIds.push(quote.id);

    const existingQuote = await quoteRep.getById(quote.id);
    if (existingQuote) {
      const sourcesIds = uniq(
        existingQuote.sourcesIds.concat([quote.source.id])
      );
      const set: Partial<Quote> = {
        lastFoundAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        sourcesIds,
        countSources: sourcesIds.length,
        popularity: sourcesIds.length
      };

      await quoteRep.update({
        id: quote.id,
        set: set
      });
      continue;
    }

    const maxQuoteTopics = 5;
    const qIndexes = quoteIndexes(text, quote.text, textQuote.index);
    const mentionTopics = textTopics
      .filter(
        (item) =>
          item.topic.id !== author.topic.id &&
          !!item.input.find(
            (it) =>
              it.index >= qIndexes[0] && it.index + it.text.length < qIndexes[1]
          )
      )
      .slice(0, maxQuoteTopics);

    quote.topics = uniqByProperty(
      mentionTopics.map((item) =>
        convertTextTopicToQuoteTopic(item, "MENTION")
      ),
      "id"
    );
    const topQuoteTopics = textTopics.slice(
      0,
      maxQuoteTopics - quote.topics.length
    );
    quote.topics = quote.topics.concat(
      topQuoteTopics.map((item) => convertTextTopicToQuoteTopic(item))
    );
    quote.topics = uniqByProperty(quote.topics, "id");
    quote.topics = quote.topics.filter((item) => item.id !== quote.author.id);

    if (Object.keys(quote.topics).length === 0) {
      delete quote.topics;
    }

    await quoteRep.create(quote);
  }

  return uniq(quoteIds);
}

export async function setQuotesEvent(
  quoteRep: QuoteRepository,
  quotesIds: string[],
  event: NewsEvent
) {
  for (const id of quotesIds) {
    try {
      const quote = await quoteRep.getById(id, { fields: ["id", "events"] });
      if (!quote) {
        continue;
      }
      const events = quote.events || [];
      if (events.find((item) => item.id === event.id)) {
        continue;
      }
      events.push({
        id: event.id,
        title: event.title,
        imageId: event.imageId
      });
      await quoteRep.update({
        id,
        set: { events }
      });
    } catch (e) {
      logger.error(e);
      await delay(1000 * 2);
    }
  }
}

function convertTextTopicToQuoteTopic(
  textTopic: TextTopic,
  rel?: QuoteTopicRelation
) {
  const topic: QuoteTopic = {
    id: textTopic.topic.id,
    name: textTopic.topic.commonName || textTopic.topic.name,
    abbr: textTopic.topic.abbr,
    type: textTopic.topic.type,
    slug: textTopic.topic.slug,
    rel
  };

  return topic;
}

function quoteIndexes(text: string, quoteText: string, quoteIndex: number) {
  const reg = /[.?!]\s|\n/;
  let startIndex = quoteIndex - 50;
  startIndex = startIndex < 0 ? 0 : startIndex;
  let match = reg.exec(text.substr(startIndex, quoteIndex));
  if (match) {
    startIndex = quoteIndex - match.index;
  }
  let lastIndex = quoteIndex + quoteText.length + 50;
  match = reg.exec(text.substr(quoteIndex + quoteText.length + 1, 50));
  if (match) {
    lastIndex = quoteIndex + quoteText.length + 1 + match.index;
  }

  return [startIndex, lastIndex];
}
