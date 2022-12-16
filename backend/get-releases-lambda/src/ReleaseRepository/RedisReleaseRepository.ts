import { PluginReleasesRecord, ReleaseRepository } from '.';
import { MetricLogger } from '../MetricLogger';
import { RedisClient } from '../redisClient';

const KEY_NAMESPACE = 'releases';

export class RedisReleaseRepository implements ReleaseRepository {
    private redisClient: RedisClient;
    private metricLogger: MetricLogger;

    constructor(redisClient: RedisClient, metricLogger: MetricLogger) {
        this.redisClient = redisClient;
        this.metricLogger = metricLogger;
    }

    public async getReleases(pluginIds: string[]): Promise<PluginReleasesRecord[]> {
        try {
            return await this.redisClient.getJson(KEY_NAMESPACE, pluginIds);
        } catch (err) {
            console.error('Error getting releases from redis', err);
            this.metricLogger.trackErrorCodeOccurrence('REDIS_FETCH_RELEASE_RECORDS');
            throw err;
        }
    }

    public async save(records: PluginReleasesRecord[]): Promise<void> {
        try {
            return await this.redisClient.putJson(
                KEY_NAMESPACE,
                records,
                (record) => record.pluginId
            );
        } catch (err) {
            console.error('Error persisting releases to redis', err);
            this.metricLogger.trackErrorCodeOccurrence('REDIS_PERSIST_RELEASE_RECORDS');
            throw err;
        }
    }
}
