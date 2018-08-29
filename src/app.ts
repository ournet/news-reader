require('dotenv').config();

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

async function start() {
    const config = getConfigFromEnv();
    const connection = await DbDataConnection.create(config.TOPICS_DB_CONNECTION);

    const newsReader = new NewsReader(config, connection.mongoClient);

    try {
        await newsReader.start(locale);
    } catch (e) {
        await connection.close();
        throw e;
    }
}

start()
    .then(() => logger.warn(`END ${locale.lang}-${locale.country}`))
    .catch(e => logger.warn(`ERROR ${locale.lang}-${locale.country}: ${e.message}`, e));
