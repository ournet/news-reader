
export const logger: ILogger = require('ournet.logger');

if (process.env.NODE_ENV === 'production') {
    (<any>logger).loggly({
        tags: ['ournet-api'],
        json: true
    });
    (<any>logger).removeConsole();
}

export interface ILogger {
    error(message?: any, ...optionalParams: any[]): void
    info(message?: any, ...optionalParams: any[]): void
    warn(message?: any, ...optionalParams: any[]): void
}
