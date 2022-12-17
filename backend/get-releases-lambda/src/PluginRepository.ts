import axios from 'axios';
import { GetObjectCommand, S3Client, NoSuchKey, PutObjectCommand } from '@aws-sdk/client-s3';
import { groupById } from './util';
import * as streamConsumers from 'stream/consumers';
import { MetricLogger } from './MetricLogger';

export interface PluginRepository {
    getPluginsById(pluginIds: string[]): Promise<Record<string, PluginRecord>>;
}

export type PluginRecord = {
    id: string;
    repo: string;
    name: string;
};

const PLUGINS_LIST_GITHUB_URL =
    'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json';
const PLUGIN_LIST_S3_KEY_NAME = 'community-plugins.json';

let _cachedPluginRecords: Record<string, PluginRecord> | null = null;

export class S3PluginRepository implements PluginRepository {
    private bucketName: string;
    private s3: S3Client;
    private metricLogger: MetricLogger;

    constructor(bucketName: string, metricLogger: MetricLogger) {
        this.bucketName = bucketName;
        this.s3 = new S3Client({});
        this.metricLogger = metricLogger;
    }

    async getPluginsById(pluginIds: string[]): Promise<Record<string, PluginRecord>> {
        const fullPluginMap = await this.getFullPluginMap();

        return pluginIds
            .filter((pluginId) => pluginId in fullPluginMap)
            .reduce((combined, pluginId) => {
                combined[pluginId] = fullPluginMap[pluginId];
                return combined;
            }, {} as Record<string, PluginRecord>);
    }

    private async getFullPluginMap(): Promise<Record<string, PluginRecord>> {
        if (_cachedPluginRecords != null) {
            return _cachedPluginRecords;
        }

        let pluginsFile: PluginRecord[];
        try {
            pluginsFile = await this.fetchFromS3();
        } catch (e) {
            if (e instanceof NoSuchKey) {
                console.log(
                    `${PLUGIN_LIST_S3_KEY_NAME} has expired from ${this.bucketName}, will re-fetch and store it`
                );
                pluginsFile = await this.fetchFromGithub();
                await this.tryStoringInS3(pluginsFile);
            } else {
                console.error(
                    `Unexpected Error fetching ${PLUGIN_LIST_S3_KEY_NAME} from ${this.bucketName}`,
                    e
                );
                this.metricLogger.trackErrorCodeOccurrence('S3_FETCH_PLUGIN_LIST');
                throw e;
            }
        }

        _cachedPluginRecords = groupById(pluginsFile, 'id');
        return _cachedPluginRecords;
    }

    private async fetchFromS3(): Promise<PluginRecord[]> {
        const getObjectCommand = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: PLUGIN_LIST_S3_KEY_NAME,
        });

        const getObjectResponse = await this.s3.send(getObjectCommand);

        if (getObjectResponse.Body) {
            const stream: NodeJS.ReadableStream = getObjectResponse.Body as NodeJS.ReadableStream;
            const jsonResponse = await streamConsumers.text(stream);
            return JSON.parse(jsonResponse);
        } else {
            console.error('Unexpected S3 GetObject response', getObjectResponse);
            throw new Error();
        }
    }

    private async fetchFromGithub(): Promise<PluginRecord[]> {
        try {
            return await axios({
                method: 'get',
                url: PLUGINS_LIST_GITHUB_URL,
            }).then((res) => res.data);
        } catch (err) {
            console.log('Error fetching plugin list from github', err);
            this.metricLogger.trackErrorCodeOccurrence('GITHUB_FETCH_PLUGIN_LIST');
            throw err;
        }
    }

    private async tryStoringInS3(pluginsFile: PluginRecord[]): Promise<void> {
        try {
            const putObjectCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: PLUGIN_LIST_S3_KEY_NAME,
                Body: JSON.stringify(pluginsFile),
            });
            await this.s3.send(putObjectCommand);
        } catch (e) {
            console.warn(`Unable to persist ${PLUGIN_LIST_S3_KEY_NAME} in ${this.bucketName}`, e);
            this.metricLogger.trackErrorCodeOccurrence('S3_PUT_PLUGIN_LIST');
        }
    }
}
