require("dotenv").config();

import { parseLocale } from "./helpers";

const locale = parseLocale(process.env.LOCALE || process.argv[1]) as Locale;

if (!locale) {
  throw new Error(`LOCALE is required!`);
}

import { logger } from "./logger";
import { DbDataConnection } from "./services/data-connection";
import { getConfigFromEnv } from "./config";
import { NewsReader } from "./news-reader";
import { Locale } from "./types";
import { DbDataService } from "./services/data-service";

async function start() {
  const config = getConfigFromEnv();
  const connection = await DbDataConnection.create(config.MONGO_DB_CONNECTION);

  const awsOptions = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION
  };

  const dataService = new DbDataService(
    connection.mongoClient.db(),
    config.NEWS_ES_HOST,
    awsOptions
  );

  await dataService.init();

  const newsReader = new NewsReader(config, dataService);

  try {
    await newsReader.start(locale);
    await connection.close();
  } catch (e) {
    await connection.close();
    throw e;
  }
}

const startDate = Date.now();

function getSeconds() {
  return Math.round((Date.now() - startDate) / 1000);
}

start()
  .catch((e) =>
    logger.warn(`ERROR ${locale.lang}-${locale.country}: ${e.message}`, e)
  )
  .then(() =>
    logger.warn(`END ${locale.lang}-${locale.country} in ${getSeconds()}s`)
  );
