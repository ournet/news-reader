import got = require("got");
import {
  BuildTopicParams,
  TopicType,
  TopicHelper
} from "@ournet/topics-domain";
import { Locale } from "../types";
import { Dictionary } from "@ournet/domain";
import { URLSearchParams } from "url";
import { truncateAt } from "../helpers";

export interface TextTopicTopic extends BuildTopicParams {
  id: string;
  slug: string;
}

export type TextTopic = {
  topic: TextTopicTopic;
  input: { text: string; index: number }[];
};

export type ExtractTextTopicsOptions = {
  entitizerKey: string;
  entitizerUrl: string;
};

export interface TextTopicsService {
  extract(locale: Locale, text: string): Promise<TextTopic[]>;
}

export class ApiTextTopicsService implements TextTopicsService {
  constructor(private options: ExtractTextTopicsOptions) {}

  async extract(locale: Locale, text: string): Promise<TextTopic[]> {
    text = truncateAt(text, 4000);

    const url = this.options.entitizerUrl;
    const query = new URLSearchParams();
    query.append("key", this.options.entitizerKey);
    query.append("lang", locale.lang);
    query.append("country", locale.country);
    query.append("wikidata", "true");
    // query.append('text', text);

    const { body } = await got(url, {
      method: "POST",
      json: true,
      timeout: 1000 * 3,
      throwHttpErrors: true,
      query,
      body: {
        text
      }
    });

    if (!body || !body.data) {
      throw new Error(
        `Invalid entitizer response: ${JSON.stringify(
          body.error || body
        ).substr(0, 100)}`
      );
    }

    const data = body.data as EntitizerData;
    if (data.entities) {
      data.entities = data.entities.filter((item) => !!item.entity.wikiDataId);
    }

    if (!data.entities) {
      return [];
    }

    const textTopics: TextTopic[] = [];

    for (const entity of data.entities) {
      const topic = convertToTextTopic(
        locale,
        entity.entity,
        entity.input,
        (data.wikidata &&
          entity.entity.wikiDataId &&
          data.wikidata[entity.entity.wikiDataId]) ||
          undefined
      );

      textTopics.push(topic);

      topic.input = topic.input.sort((a, b) => a.index - b.index);
    }

    return textTopics.sort((a, b) => a.input[0].index - b.input[0].index);
  }
}

function convertToTextTopic(
  locale: Locale,
  entity: EntitizerEntity,
  input: { text: string; index: number }[],
  wikiData?: WikidataEntity
) {
  const params: BuildTopicParams = {
    abbr: entity.abbr,
    commonName: entity.commonName,
    country: locale.country,
    description: entity.description,
    englishName: entity.englishName,
    lang: locale.lang,
    name: entity.name,
    type: entity.type,
    wikiData: wikiData && {
      data: wikiData.data,
      about: wikiData.about,
      id: wikiData.wikiDataId,
      name: wikiData.name,
      wikiPageTitle: wikiData.wikiPageTitle
    }
  };
  const topic = TopicHelper.build(params);
  const textTopic: TextTopic = {
    topic: {
      ...params,
      id: topic.id,
      slug: TopicHelper.parseSlugFromId(topic.id)
    },
    input
  };

  return textTopic;
}

type EntitizerData = {
  entities: {
    entity: EntitizerEntity;
    input: { text: string; index: number }[];
  }[];
  wikidata?: Dictionary<WikidataEntity>;
};

type WikidataEntity = {
  wikiDataId: string;
  name: string;
  wikiPageTitle?: string;
  types?: string[];
  about?: string;
  data?: Dictionary<string[]>;
  description?: string;
  type?: TopicType;
};

type EntitizerEntity = {
  name: string;
  type: TopicType;
  description?: string;
  wikiDataId?: string;
  englishName?: string;
  commonName?: string;
  abbr?: string;
};
