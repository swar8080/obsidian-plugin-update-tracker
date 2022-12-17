import { CloudWatchClient, Dimension, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export interface MetricLogger {
    trackGithubRateLimit(rateLimt: number): Promise<void>;
    trackErrorCodeOccurrence(errorCode: ErrorCode): Promise<void>;
}

type ErrorCode =
    | 'GITHUB_FETCH_RELEASES'
    | 'GITHUB_FETCH_MANIFEST'
    | 'GITHUB_FETCH_MASTER_MANIFEST'
    | 'GITHUB_FETCH_PLUGIN_LIST'
    | 'REDIS_CONNECTION_ERROR'
    | 'REDIS_FETCH_RELEASE_RECORDS'
    | 'REDIS_PERSIST_RELEASE_RECORDS'
    | 'S3_FETCH_PLUGIN_LIST'
    | 'S3_PUT_PLUGIN_LIST';

const GITHUB_RATE_LIMIT_METRIC_NAME = 'Github Rate Limit';
const ERROR_CODE_METRIC_NAME = 'Error Codes';

export class CloudWatchMetricLogger implements MetricLogger {
    private metricNamespace: string;
    private cloudwatch: CloudWatchClient;
    private metricBuffer = {
        [GITHUB_RATE_LIMIT_METRIC_NAME]: {
            bufferedRequests: 0,
            bufferedValue: 0,
        },
    };

    constructor(metricNamespace: string) {
        this.metricNamespace = metricNamespace;
        this.cloudwatch = new CloudWatchClient({});
    }

    public async trackGithubRateLimit(rateLimt: number): Promise<void> {
        this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedValue = rateLimt;

        const bufferedRequests = ++this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME]
            .bufferedRequests;
        if (bufferedRequests >= 20) {
            await this.flush();
        }
    }

    public async trackErrorCodeOccurrence(errorCode: ErrorCode): Promise<void> {
        try {
            const errorCodeDimension: Dimension = {
                Name: 'ErrorCode',
                Value: errorCode,
            };
            await this.putMetric(ERROR_CODE_METRIC_NAME, 1, [errorCodeDimension]);
        } catch (err) {
            console.error(`Error tracking errorCode ${errorCode}`, err);
        }
    }

    public async flush() {
        const { bufferedRequests, bufferedValue } =
            this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME];
        if (bufferedRequests > 0) {
            try {
                await this.putMetric(GITHUB_RATE_LIMIT_METRIC_NAME, bufferedValue);
                this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedRequests = 0;
            } catch (err) {
                console.error(`Error putting metric ${GITHUB_RATE_LIMIT_METRIC_NAME}`, err);
                throw err;
            }
        }
    }

    private async putMetric(
        name: string,
        value: number,
        dimensions: Dimension[] | undefined = undefined
    ) {
        await this.cloudwatch.send(
            new PutMetricDataCommand({
                Namespace: this.metricNamespace,
                MetricData: [
                    {
                        MetricName: name,
                        Value: value,
                        Timestamp: new Date(),
                        Dimensions: dimensions,
                    },
                ],
            })
        );
    }
}
