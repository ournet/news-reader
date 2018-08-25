import { QuoteRepository } from "@ournet/quotes-domain";
import { ImageRepository } from "@ournet/images-domain";
import { ArticleContentRepository, EventRepository, NewsRepository } from "@ournet/news-domain";
import { TopicRepository } from "@ournet/topics-domain";

export type Locale = {
    lang: string
    country: string
}

export interface OurnetDataStorage {
    readonly topicRep: TopicRepository
    readonly newsRep: NewsRepository
    readonly eventRep: EventRepository
    readonly articleContentRep: ArticleContentRepository
    readonly imageRep: ImageRepository
    readonly quoteRep: QuoteRepository
}

export interface OurnetImagesStorage {
    copyImageToEventsById(id: string): Promise<void>
    putImageById(id: string, body: Buffer | Blob): Promise<void>
}
