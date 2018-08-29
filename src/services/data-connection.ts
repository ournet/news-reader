
import { MongoClient } from 'mongodb';

export interface DataConnection {
    readonly mongoClient: MongoClient
    close(): Promise<void>
}

export class DbDataConnection implements DataConnection {
    constructor(readonly mongoClient: MongoClient) {
        if (!mongoClient.isConnected()) {
            throw new Error(`mongoClient must be connected!`);
        }
    }

    static async create(mongoConnectionString: string) {
        const client = await MongoClient.connect(mongoConnectionString);
        return new DbDataConnection(client);
    }

    close() {
        return this.mongoClient.close();
    }
}
