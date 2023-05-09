import { Db, MongoClient } from "mongodb";
import DynamoDB = require("aws-sdk/clients/dynamodb");

import { TopicRepositoryBuilder } from "@ournet/topics-data";
import { TopicRepository } from "@ournet/topics-domain";
import {
  NewsRepositoryBuilder,
  EventRepositoryBuilder,
  ArticleContentRepositoryBuilder
} from "@ournet/news-data";
import { ImageRepositoryBuilder } from "@ournet/images-data";
import { QuoteRepositoryBuilder } from "@ournet/quotes-data";
import { VideoRepositoryBuilder } from "@ournet/videos-data";
import {
  NewsRepository,
  EventRepository,
  ArticleContentRepository
} from "@ournet/news-domain";
import { ImageRepository } from "@ournet/images-domain";
import { QuoteRepository } from "@ournet/quotes-domain";
import { VideoRepository } from "@ournet/videos-domain";
import { ServiceConfigurationOptions } from "aws-sdk/lib/service";

export interface DataService {
  readonly topicRep: TopicRepository;
  readonly newsRep: NewsRepository;
  readonly eventRep: EventRepository;
  readonly articleContentRep: ArticleContentRepository;
  readonly imageRep: ImageRepository;
  readonly quoteRep: QuoteRepository;
  readonly videoRep: VideoRepository;

  init(): Promise<void>;
}

export class DbDataService implements DataService {
  readonly topicRep: TopicRepository;
  readonly newsRep: NewsRepository;
  readonly eventRep: EventRepository;
  readonly articleContentRep: ArticleContentRepository;
  readonly imageRep: ImageRepository;
  readonly quoteRep: QuoteRepository;
  readonly videoRep: VideoRepository;

  constructor(
    mongoDb: Db,
    newsESHost: string,
    dynamoOptions?: ServiceConfigurationOptions
  ) {
    const dynamoClient = new DynamoDB.DocumentClient(dynamoOptions);
    this.topicRep = TopicRepositoryBuilder.build(mongoDb as any);
    this.newsRep = NewsRepositoryBuilder.build(dynamoClient, {
      host: newsESHost,
      ssl: { rejectUnauthorized: false, pfx: [] },
      apiVersion: "1.7.6"
    });
    this.eventRep = EventRepositoryBuilder.build(dynamoClient);
    this.articleContentRep =
      ArticleContentRepositoryBuilder.build(dynamoClient);
    this.imageRep = ImageRepositoryBuilder.build(dynamoClient);
    this.quoteRep = QuoteRepositoryBuilder.build(dynamoClient);
    this.videoRep = VideoRepositoryBuilder.build(dynamoClient);
  }

  async init() {
    await this.topicRep.createStorage();
    await this.newsRep.createStorage();
    await this.eventRep.createStorage();
    await this.articleContentRep.createStorage();
    await this.imageRep.createStorage();
    await this.quoteRep.createStorage();
    await this.videoRep.createStorage();
  }
}

export function createMongoClient(connectionString: string) {
  return MongoClient.connect(connectionString);
}
