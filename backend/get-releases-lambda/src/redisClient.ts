import { createClient } from 'redis';
import { RedisClientType, commandOptions } from '@redis/client';
import { gunzipSync, gzipSync } from 'zlib';
import { MetricLogger } from './MetricLogger';
import { logError } from './errors';

export class RedisClient {
    private url: string;
    private password: string;
    private isProd: boolean;
    private metricLogger: MetricLogger;

    private redisClient: RedisClientType | null = null;

    constructor(url: string, password: string, isProd: boolean, metricLogger: MetricLogger) {
        this.url = url;
        this.password = password;
        this.isProd = isProd;
        this.metricLogger = metricLogger;
    }

    public async getJson<T>(namespace: string, keys: string[]): Promise<T[]> {
        if (keys.length === 0) {
            return [];
        }

        const client = await this.getClient();

        const namespacedKeys = keys.map((key) => this.makeNamespacedKey(namespace, key));
        const results = (await client.mGet(
            commandOptions({ returnBuffers: true }),
            namespacedKeys
        )) as unknown as (Buffer | null)[];

        const cacheHits: T[] = [];
        const legacyValuesCompressed: Record<string, Buffer> = {};
        results.forEach((value, index) => {
            if (value == null) {
                return;
            }
            try {
                if (isGzipped(value)) {
                    cacheHits.push(JSON.parse(gunzipSync(value).toString('utf8')));
                } else {
                    cacheHits.push(JSON.parse(value.toString('utf8')));
                    legacyValuesCompressed[namespacedKeys[index]] = gzipSync(value);
                }
            } catch (err) {
                logError(`Ignoring unreadable redis value for ${namespacedKeys[index]}`, err);
            }
        });

        await this.tryStoringCompressed(client, legacyValuesCompressed);

        return cacheHits;
    }

    public async putJson<T>(namespace: string, items: T[], keyExtractor: (item: T) => string) {
        if (items.length === 0) {
            return;
        }

        const client = await this.getClient();

        const keyValues = items.reduce((combined: Record<string, Buffer>, item) => {
            const key = this.makeNamespacedKey(namespace, keyExtractor(item));
            combined[key] = gzipSync(JSON.stringify(item));
            return combined;
        }, {});

        await client.mSet(keyValues);
    }

    public async close(): Promise<void> {
        try {
            const redisClient = this.redisClient;
            if (redisClient != null) {
                this.redisClient = null;
                await redisClient.disconnect();
            }
        } catch (err) {
            console.error('Error cleaning up redis connection', err);
        }
    }

    private async getClient(): Promise<RedisClientType> {
        if (this.redisClient == null) {
            try {
                this.redisClient = createClient({
                    url: this.url,
                    password: this.password,
                });
                await this.redisClient.connect();
            } catch (err) {
                console.error('Error connecting to redis', err);
                this.metricLogger.trackErrorCodeOccurrence('REDIS_CONNECTION_ERROR');
                throw err;
            }
        }
        return this.redisClient;
    }

    private async tryStoringCompressed(
        client: RedisClientType,
        keyValues: Record<string, Buffer>
    ): Promise<void> {
        if (Object.keys(keyValues).length === 0) {
            return;
        }
        try {
            await client.mSet(keyValues);
        } catch (err) {
            logError('Error replacing uncompressed redis values with compressed ones', err);
        }
    }

    private makeNamespacedKey(namespace: string, key: string) {
        return `${this.isProd ? 'prod' : 'dev'}:${namespace}:${key}`;
    }
}

function isGzipped(value: Buffer): boolean {
    return value.length > 2 && value[0] === 0x1f && value[1] === 0x8b;
}
