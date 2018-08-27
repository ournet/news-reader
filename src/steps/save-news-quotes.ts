
// const debug = require('debug')('ournet:news-reader');

// import { logger } from "../logger";
import { QuoteRepository, QuoteHelper, QuoteTopicRelation, QuoteTopic } from "@ournet/quotes-domain";
import { NewsTextTopics } from "./save-news-topics";
import { NewsItem } from "@ournet/news-domain";
import { extractTextQuotes } from "../functions/extract-text-quotes";
import { uniqByProperty, uniq } from "@ournet/domain";
import { TextTopic } from "../functions/extract-text-topics";

export type SaveQuotesInfo = {
    lang: string
    country: string
    newsTitle: string
    newsText: string
}

export async function saveNewsQuotes(quoteRep: QuoteRepository, newsItem: NewsItem, newsTopics: NewsTextTopics) {
    const text = newsTopics.text;
    const textTopics = newsTopics.topics;

    let persons: { index: number, id: string }[] = [];
    for (const item of textTopics) {
        if (item.topic.type === 'PERSON') {
            persons = persons.concat(item.input.map(it => ({ index: it.index, id: item.topic.id })));
        }
    }
    const textQuotes = await extractTextQuotes(text, newsItem.lang, persons);

    if (!textQuotes.length) {
        return [];
    }

    const quoteIds: string[] = [];

    for (const textQuote of textQuotes) {
        const author = textTopics.find(item => item.topic.id === textQuote.author.id);
        if (!author) {
            continue;
        }
        const quote = QuoteHelper.build({
            author: { id: author.topic.id, name: author.topic.commonName || author.topic.name, slug: author.topic.slug, },
            country: newsItem.country,
            lang: newsItem.lang,
            source: {
                host: newsItem.urlHost,
                id: newsItem.id,
                path: newsItem.urlPath,
                title: newsItem.title,
            },
            text: textQuote.text,
        });

        quoteIds.push(quote.id);

        const existingQuote = await quoteRep.getById(quote.id);
        if (existingQuote) {
            await quoteRep.update({
                id: quote.id,
                set: {
                    lastFoundAt: quote.createdAt,
                    expiresAt: quote.expiresAt,
                }
            });
            continue;
        }


        const maxQuoteTopics = 5;
        const qIndexes = quoteIndexes(text, quote.text, textQuote.index);
        const mentionTopics = textTopics.filter(item => item.topic.id !== author.topic.id
            && !!item.input.find(it => it.index >= qIndexes[0] && it.index + it.text.length < qIndexes[1]))
            .slice(0, maxQuoteTopics);

        quote.topics = uniqByProperty(mentionTopics.map(item => convertTextTopicToQuoteTopic(item, 'MENTION')), 'id');
        const topQuoteTopics = textTopics.slice(0, maxQuoteTopics - quote.topics.length);
        quote.topics = quote.topics.concat(topQuoteTopics.map(item => convertTextTopicToQuoteTopic(item)));
        quote.topics = uniqByProperty(quote.topics, 'id');
        if (Object.keys(quote.topics).length === 0) {
            delete quote.topics;
        }

        await quoteRep.create(quote);
    }

    return uniq(quoteIds);
}

function convertTextTopicToQuoteTopic(textTopic: TextTopic, rel?: QuoteTopicRelation) {
    const topic: QuoteTopic = {
        id: textTopic.topic.id,
        name: textTopic.topic.commonName || textTopic.topic.name,
        abbr: textTopic.topic.abbr,
        type: textTopic.topic.type,
        slug: textTopic.topic.slug,
        rel,
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
