import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export interface MetricLogger {
    logGithubRateLimit(rateLimt: number): Promise<void>;
}

const GITHUB_RATE_LIMIT_METRIC_NAME = 'Github Rate Limit';

export class CloudfrontMetricLogger implements MetricLogger {
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

    async logGithubRateLimit(rateLimt: number): Promise<void> {
        this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedValue = rateLimt;

        const bufferedRequests = ++this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME]
            .bufferedRequests;
        if (bufferedRequests >= 10) {
            await this.flush();
        }
    }

    public async flush() {
        if (this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedRequests > 0) {
            const putMetricCommand = new PutMetricDataCommand({
                Namespace: this.metricNamespace,
                MetricData: [
                    {
                        MetricName: GITHUB_RATE_LIMIT_METRIC_NAME,
                        Value: this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedValue,
                        Timestamp: new Date(),
                    },
                ],
            });

            try {
                await this.cloudwatch.send(putMetricCommand);
                this.metricBuffer[GITHUB_RATE_LIMIT_METRIC_NAME].bufferedRequests = 0;
            } catch (err) {
                console.error(`Error putting metric ${GITHUB_RATE_LIMIT_METRIC_NAME}`, err);
                throw err;
            }
        }
    }
}
