
import { createLogger, format, transports } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const logglyLogger = createLogger({
    level: isProduction ? 'warn' : 'info',
    format: format.json(),
});

if (!isProduction) {
    logglyLogger.add(new transports.Console({
        format: format.simple()
    }));
}

export const logger = {
    info(message: string, ...meta: any[]) {
        logglyLogger.info(message, meta);
    },
    warn(message: string, ...meta: any[]) {
        logglyLogger.warn(message, meta);
    },
    error(message: string, ...meta: any[]) {
        logglyLogger.error(message, meta);
    },
}
