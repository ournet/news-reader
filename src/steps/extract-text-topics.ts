
import got = require('got');
import { BuildTopicParams, TopicType } from '@ournet/topics-domain';
import { Locale } from '../types';
import { ENTITIZER_URL, ENTITIZER_KEY } from '../config';
import { Dictionary } from '@ournet/domain';
import { URLSearchParams } from 'url';

export type TextTopic = {
    topic: BuildTopicParams
    input: { text: string, index: number }[]
}

export async function extractTextTopics(locale: Locale, text: string): Promise<TextTopic[]> {

    const url = ENTITIZER_URL;
    const query = new URLSearchParams();
    query.append('key', ENTITIZER_KEY);
    query.append('lang', locale.lang);
    query.append('country', locale.country);
    query.append('wikidata', 'true');
    query.append('text', text);

    const { body } = await got(url, {
        json: true,
        timeout: 1000 * 3,
        throwHttpErrors: true,
        query,
    });

    if (!body || !body.data) {
        throw new Error(`Invalid entitizer response: ${JSON.stringify(body.error || body).substr(0, 100)}`);
    }

    const data = body.data as EntitizerData;

    if (!data.entities) {
        return [];
    }

    const textTopics: TextTopic[] = [];

    for (const entity of data.entities) {
        textTopics.push(convertToTextTopic(locale, entity.entity, entity.input,
            data.wikidata && entity.entity.wikiDataId && data.wikidata[entity.entity.wikiDataId] || undefined));
    }

    return textTopics.sort((a, b) => Math.min(...a.input.map(item => item.index)) - Math.min(...b.input.map(item => item.index)));
}

function convertToTextTopic(locale: Locale, entity: EntitizerEntity, input: { text: string, index: number }[], wikiData?: WikidataEntity) {
    const topic: TextTopic = {
        topic: {
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
                wikiPageTitle: wikiData.wikiPageTitle,
            }
        },
        input,
    };

    return topic;
}

type EntitizerData = {
    entities: {
        entity: EntitizerEntity
        input: { text: string, index: number }[]
    }[],
    wikidata?: Dictionary<WikidataEntity>
}

type WikidataEntity = {
    wikiDataId: string
    name: string
    wikiPageTitle?: string
    types?: string[]
    about?: string
    data?: Dictionary<string[]>
    description?: string
    type?: TopicType
}

type EntitizerEntity = {
    name: string
    type: TopicType
    description?: string
    wikiDataId?: string
    englishName?: string
    commonName?: string
    abbr?: string
}
