import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { NewPluginVersionRequest } from '../../../shared-types';
import { CloudfrontMetricLogger } from './MetricLogger';
import { DynamoDBReleaseRepository } from './ReleaseRepository/DynamoDBReleaseRepository';
import { GetReleases, GetReleasesConfiguration } from './get-releases';
import { GithubReleaseApi } from './ReleaseApi';
import { S3PluginRepository } from './PluginRepository';
import { RedisReleaseRepository } from './ReleaseRepository/RedisReleaseRepository';
import { RedisClient } from './redisClient';
import { ReleaseRepository } from './ReleaseRepository';
import { FallbackReleaseRepository } from './ReleaseRepository/FallbackReleaseRepository';

const MAX_PLUGIN_REQUEST_LENGTH = 150;

let _getReleases: GetReleases | null = null;
let _redisClient: RedisClient;

export async function main(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    if (event.requestContext.http.method.toLowerCase() !== 'post') {
        return badRequest('Post request expected');
    }
    if (!event.body) {
        return badRequest('Request body is missing');
    }

    let request: NewPluginVersionRequest;
    try {
        request = JSON.parse(event.body);
    } catch (e) {
        console.error(`Bad request body: ${event.body}`);
        return badRequest('Request body is invalid');
    }

    console.log(`Request for ${request?.currentPluginVersions.length} plugins`);
    request.currentPluginVersions = (request.currentPluginVersions || []).slice(
        0,
        MAX_PLUGIN_REQUEST_LENGTH
    );

    try {
        const getReleases: GetReleases = buildGetReleases();
        const response = await getReleases.execute(request);

        return {
            body: JSON.stringify(response),
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        };
    } catch (err) {
        console.error('Failed handling request', request, err);
        throw err;
    } finally {
        if (_redisClient) {
            await _redisClient.close();
        }
    }
}

function badRequest(message: string) {
    console.warn('Bad request: ', message);
    return {
        body: message,
        statusCode: 400,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    };
}

function buildGetReleases(): GetReleases {
    if (_getReleases != null) {
        return _getReleases;
    }

    const pluginRepository = new S3PluginRepository(getEnv('OPUC_PLUGINS_LIST_BUCKET_NAME'));

    const metricLogger = new CloudfrontMetricLogger(getEnv('OPUC_METRIC_NAMESPACE'));

    const releaseApi = new GithubReleaseApi(getEnv('OPUC_GITHUB_ACCESS_TOKEN'), metricLogger);

    const releaseRepositoryUsageOrder: ReleaseRepository[] = [];
    if (getBooleanEnv('OPUC_USE_REDIS_RELEASE_REPOSITORY')) {
        _redisClient = new RedisClient(
            getEnv('OPUC_REDIS_URL'),
            getEnv('OPUC_REDIS_PASSWORD'),
            getBooleanEnv('OPUC_IS_PROD')
        );
        releaseRepositoryUsageOrder.push(new RedisReleaseRepository(_redisClient));
    }
    if (getBooleanEnv('OPUC_USE_DYNAMODB_RELEASE_REPOSITORY')) {
        releaseRepositoryUsageOrder.push(
            new DynamoDBReleaseRepository(getEnv('OPUC_PLUGIN_RELEASES_TABLE_NAME'))
        );
    }
    //fallback to dynamodb because redis only has 30mb and up to 30 connections in free tier
    const fallbackReleaseRepository = new FallbackReleaseRepository(releaseRepositoryUsageOrder);

    const config: GetReleasesConfiguration = {
        releasesCacheLengthSeconds: getIntEnv('OPUC_RELEASES_CACHE_LENGTH_SECONDS'),
        releasesFetchedPerPlugin: getIntEnv('OPUC_RELEASES_FETCHED_PER_PLUGIN'),
        maxReleaseNoteLength: getIntEnv('OPUC_MAX_RELEASE_NOTE_LENGTH'),
        maxManifestsToFetchPerPlugin: getIntEnv('OPUC_MAX_MANIFESTS_TO_FETCH_PER_PLUGIN'),
        ignoreReleasesForThisPlugin: getBooleanEnv('OPUC_IGNORE_RELEASES_FOR_THIS_PLUGIN'),
    };

    _getReleases = new GetReleases(config, pluginRepository, fallbackReleaseRepository, releaseApi);
    return _getReleases;
}

function getEnv(key: string): string {
    const value = process.env[key];
    if (key == undefined || key === '') {
        throw new Error(`Missing environment key ${key}, value is ${value}`);
    }
    return value as string;
}

function getIntEnv(key: string): number {
    const value = parseInt(getEnv(key));
    if (isNaN(value)) {
        throw new Error(`Non-numeric key ${key}: ${value}`);
    }
    return value;
}

function getBooleanEnv(key: string): boolean {
    const value = getEnv(key);
    if (value !== 'true' && value !== 'false') {
        throw new Error(`Non-boolean key: ${key}: ${value}`);
    }
    return value === 'true';
}
