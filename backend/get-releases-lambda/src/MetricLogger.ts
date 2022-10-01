import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export interface MetricLogger {
    logGithubRateLimit(rateLimt: number): Promise<void>;
}

const GITHUB_RATE_LIMIT_METRIC_NAME = 'Github Rate Limit';

export class CloudfrontMetricLogger implements MetricLogger {
    private metricNamespace: string;
    private cloudwatch: CloudWatchClient;

    constructor(metricNamespace: string) {
        this.metricNamespace = metricNamespace;
        this.cloudwatch = new CloudWatchClient({});
    }

    async logGithubRateLimit(rateLimt: number): Promise<void> {
        const putMetricCommand = new PutMetricDataCommand({
            Namespace: this.metricNamespace,
            MetricData: [
                {
                    MetricName: GITHUB_RATE_LIMIT_METRIC_NAME,
                    Value: rateLimt,
                    Timestamp: new Date(),
                },
            ],
        });

        try {
            await this.cloudwatch.send(putMetricCommand);
        } catch (err) {
            console.error(`Error putting metric ${GITHUB_RATE_LIMIT_METRIC_NAME}`, err);
            throw err;
        }
    }
}
