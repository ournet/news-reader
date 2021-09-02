import { DataService } from "./services/data-service";
import {
  S3ImagesStorage,
  ImagesStorageService
} from "./services/images-storage-service";
import {
  ApiTextTopicsService,
  TextTopicsService
} from "./services/text-topics-service";
import { processLocale } from "./process-locale";
import { logger } from "./logger";
import { Config } from "./config";
import { Locale } from "./types";

export class NewsReader {
  private imagesService: ImagesStorageService;
  private textTopicsService: TextTopicsService;
  private inited = false;

  constructor(private config: Config, private dataService: DataService) {
    const awsOptions = {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      region: config.AWS_REGION
    };

    this.imagesService = new S3ImagesStorage(
      {
        bucket: config.S3_IMAGES_BUCKET,
        newsName: config.S3_IMAGES_NEWS_NAME,
        eventsName: config.S3_IMAGES_EVENTS_NAME
      },
      awsOptions
    );

    this.textTopicsService = new ApiTextTopicsService({
      entitizerKey: config.ENTITIZER_KEY,
      entitizerUrl: config.ENTITIZER_URL
    });
  }

  async start(locale: Locale) {
    if (!this.inited) {
      await this.init();
    }
    logger.info("Starting NewsReader...");
    await processLocale(
      this.dataService,
      this.imagesService,
      this.textTopicsService,
      locale,
      this.config
    );
    logger.info("Ended NewsReader");
  }

  private async init() {
    logger.info("Initing NewsReader...");
    await this.dataService.articleContentRep.createStorage();
    await this.dataService.eventRep.createStorage();
    await this.dataService.imageRep.createStorage();
    await this.dataService.newsRep.createStorage();
    await this.dataService.quoteRep.createStorage();
    await this.dataService.topicRep.createStorage();
    await this.dataService.videoRep.createStorage();
    this.inited = true;
    logger.info("Inited NewsReader");
  }
}
