
import { TOPICS_DB_CONNECTION, NEWS_ES_HOST } from './config';

import { MongoClient } from 'mongodb';
import DynamoDB = require('aws-sdk/clients/dynamodb');

import { TopicRepositoryBuilder } from '@ournet/topics-data';
import { TopicRepository } from '@ournet/topics-domain';
import { NewsRepositoryBuilder, EventRepositoryBuilder, ArticleContentRepositoryBuilder } from '@ournet/news-data';
import { ImageRepositoryBuilder } from '@ournet/images-data';
import { QuoteRepositoryBuilder } from '@ournet/quotes-data';

const dynamoClient = new DynamoDB.DocumentClient();
let mongoClient: MongoClient;

export let topicRep: TopicRepository;
export const newsRep = NewsRepositoryBuilder.build(dynamoClient, NEWS_ES_HOST);
export const eventRep = EventRepositoryBuilder.build(dynamoClient);
export const actircleContentRep = ArticleContentRepositoryBuilder.build(dynamoClient);
export const imageRep = ImageRepositoryBuilder.build(dynamoClient);
export const quoteRep = QuoteRepositoryBuilder.build(dynamoClient);

export async function init() {
    mongoClient = await MongoClient.connect(TOPICS_DB_CONNECTION);

    if (!topicRep) {
        topicRep = TopicRepositoryBuilder.build(mongoClient.db());
    }
}

export async function close() {
    if (mongoClient) {
        await mongoClient.close();
    }
}
