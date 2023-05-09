// const debug = require('debug')('ournet:news-reader');

import { TopicRepository, SaveTopicsUseCase } from "@ournet/topics-domain";
import { Locale } from "../types";
import { TextTopicsService, TextTopic } from "../services/text-topics-service";

export type NewsTextTopics = {
  topics: TextTopic[];
  title: string;
  text: string;
};

export async function saveNewsTopics(
  topicRep: TopicRepository,
  textTopicsService: TextTopicsService,
  title: string,
  content: string,
  locale: Locale
) {
  const text = [title, content].join("\n");

  const topics = await textTopicsService.extract(locale, text);
  if (topics.length) {
    const saveTopics = new SaveTopicsUseCase(topicRep);
    await saveTopics.execute(topics.map((item) => item.topic));
  }

  const result: NewsTextTopics = {
    topics,
    title,
    text
  };

  return result;
}
