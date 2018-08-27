
// const debug = require('debug')('ournet:news-reader');

import { TopicRepository, SaveTopicsUseCase } from "@ournet/topics-domain";
import { extractTextTopics, ExtractTextTopicsOptions, TextTopic } from "../functions/extract-text-topics";
import { Locale } from "../types";

export type NewsTextTopics = {
    topics: TextTopic[]
    title: string
    text: string
}

export async function saveNewsTopics(topicRep: TopicRepository, title: string, content: string, locale: Locale, options: ExtractTextTopicsOptions) {

    const text = [title, content].join('\n');

    const topics = await extractTextTopics(locale, text, options);
    if (topics.length) {
        const saveTopics = new SaveTopicsUseCase(topicRep);
        await saveTopics.execute(topics.map(item => item.topic));
    }

    const result: NewsTextTopics = {
        topics,
        title,
        text,
    }

    return result;
}
