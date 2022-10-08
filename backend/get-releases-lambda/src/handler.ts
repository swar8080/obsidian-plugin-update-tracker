import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { NewPluginVersionRequest } from '../../../shared-types';
import { CloudfrontMetricLogger } from './MetricLogger';
import { DynamoDBReleaseRepository } from './ReleaseRepository';
import { GetReleases, GetReleasesConfiguration } from './get-releases';
import { GithubReleaseApi } from './ReleaseApi';
import { S3PluginRepository } from './PluginRepository';

const MAX_PLUGIN_REQUEST_LENGTH = 100;

let _getReleases: GetReleases | null = null;

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

    const releaseRepository = new DynamoDBReleaseRepository(
        getEnv('OPUC_PLUGIN_RELEASES_TABLE_NAME')
    );

    const config: GetReleasesConfiguration = {
        releasesCacheLengthSeconds: getIntEnv('OPUC_RELEASES_CACHE_LENGTH_SECONDS'),
        releasesFetchedPerPlugin: getIntEnv('OPUC_RELEASES_FETCHED_PER_PLUGIN'),
        maxReleaseNoteLength: getIntEnv('OPUC_MAX_RELEASE_NOTE_LENGTH'),
        maxManifestsToFetchPerPlugin: getIntEnv('OPUC_MAX_MANIFESTS_TO_FETCH_PER_PLUGIN'),
    };

    _getReleases = new GetReleases(config, pluginRepository, releaseRepository, releaseApi);
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
