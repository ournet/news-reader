
// const debug = require('debug')('ournet:news-reader');

import {
    ArticleContentRepository,
    TopicLocationMap,
    ArticleContentBuilder,
    ArticleContentRef,
} from "@ournet/news-domain";
import { NewsTextTopics } from "./save-news-topics";


export async function saveArticleContent(contentRep: ArticleContentRepository, content: string, ref: ArticleContentRef, newsTopics: NewsTextTopics) {

    const topicLocationMap: TopicLocationMap = newsTopics.topics.slice(0, 6)
        .reduce<TopicLocationMap>((map, current) => {
            const input = current.input.find(it => it.index > newsTopics.title.length);
            if (input) {
                map[current.topic.id] = { index: input.index - newsTopics.title.length - 1, length: input.text.length };
            }

            return map;
        }, {});

    const articleContent = ArticleContentBuilder.build({
        content: content,
        refId: ref.refId,
        refType: ref.refType,
        topicsMap: Object.keys(topicLocationMap).length > 0 ? topicLocationMap : undefined,
        format: 'text',
    });

    return contentRep.put(articleContent);
}
