import { PluginReleasesRecord, ReleaseRepository } from '.';
import { RedisClient } from '../redisClient';

const KEY_NAMESPACE = 'releases';

export class RedisReleaseRepository implements ReleaseRepository {
    private redisClient: RedisClient;

    constructor(redisClient: RedisClient) {
        this.redisClient = redisClient;
    }

    public async getReleases(pluginIds: string[]): Promise<PluginReleasesRecord[]> {
        return await this.redisClient.getJson(KEY_NAMESPACE, pluginIds);
    }

    public async save(records: PluginReleasesRecord[]): Promise<void> {
        return await this.redisClient.putJson(KEY_NAMESPACE, records, (record) => record.pluginId);
    }
}
