
import { Db, MongoClient } from 'mongodb';
import DynamoDB = require('aws-sdk/clients/dynamodb');

import { TopicRepositoryBuilder } from '@ournet/topics-data';
import { TopicRepository } from '@ournet/topics-domain';
import { NewsRepositoryBuilder, EventRepositoryBuilder, ArticleContentRepositoryBuilder } from '@ournet/news-data';
import { ImageRepositoryBuilder } from '@ournet/images-data';
import { QuoteRepositoryBuilder } from '@ournet/quotes-data';
import { NewsRepository, EventRepository, ArticleContentRepository } from '@ournet/news-domain';
import { ImageRepository } from '@ournet/images-domain';
import { QuoteRepository } from '@ournet/quotes-domain';

const dynamoClient = new DynamoDB.DocumentClient();

export class DataApi {
    readonly topicRep: TopicRepository
    readonly newsRep: NewsRepository
    readonly eventRep: EventRepository
    readonly articleContentRep: ArticleContentRepository
    readonly imageRep: ImageRepository
    readonly quoteRep: QuoteRepository

    constructor(mongoDb: Db, newsESHost: string) {
        this.topicRep = TopicRepositoryBuilder.build(mongoDb);
        this.newsRep = NewsRepositoryBuilder.build(dynamoClient, newsESHost);
        this.eventRep = EventRepositoryBuilder.build(dynamoClient);
        this.articleContentRep = ArticleContentRepositoryBuilder.build(dynamoClient);
        this.imageRep = ImageRepositoryBuilder.build(dynamoClient);
        this.quoteRep = QuoteRepositoryBuilder.build(dynamoClient);
    }
}

export function createMongoClient(connectionString: string) {
    return MongoClient.connect(connectionString);
}
