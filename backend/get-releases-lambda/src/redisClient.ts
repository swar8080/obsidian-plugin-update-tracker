import { createClient } from 'redis';
import { RedisClientType } from '@redis/client';

export class RedisClient {
    private url: string;
    private password: string;
    private isProd: boolean;

    private redisClient: RedisClientType | null = null;

    constructor(url: string, password: string, isProd: boolean) {
        this.url = url;
        this.password = password;
        this.isProd = isProd;
    }

    public async getJson<T>(namespace: string, keys: string[]): Promise<T[]> {
        if (keys.length === 0) {
            return [];
        }

        const client = await this.getClient();

        const namespacedKeys = keys.map((key) => this.makeNamespacedKey(namespace, key));
        const results = await client.mGet(namespacedKeys);
        const cacheHits = results
            .filter((resultStr) => resultStr != null)
            .map((resultStr) => JSON.parse(resultStr as string));

        return cacheHits;
    }

    public async putJson<T>(namespace: string, items: T[], keyExtractor: (item: T) => string) {
        if (items.length === 0) {
            return;
        }

        const client = await this.getClient();

        const keyValues = items.reduce((combined: Record<string, string>, item) => {
            const key = this.makeNamespacedKey(namespace, keyExtractor(item));
            combined[key] = JSON.stringify(item);
            return combined;
        }, {});

        await client.mSet(keyValues);
    }

    public async close(): Promise<void> {
        try {
            if (this.redisClient != null) {
                await this.redisClient.disconnect();
            }
            this.redisClient = null;
        } catch (err) {
            console.error('Error cleaning up redis connection', err);
        }
    }

    private async getClient(): Promise<RedisClientType> {
        if (this.redisClient == null) {
            this.redisClient = createClient({
                url: this.url,
                password: this.password,
            });
            await this.redisClient.connect();
        }
        return this.redisClient;
    }

    private makeNamespacedKey(namespace: string, key: string) {
        return `${this.isProd ? 'prod' : 'dev'}:${namespace}:${key}`;
    }
}
