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
        if (bufferedRequests >= 20) {
            await this.flush();
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

    private async putMetric(name: string, value: number) {
        const putMetricCommand = new PutMetricDataCommand({
            Namespace: this.metricNamespace,
            MetricData: [
                {
                    MetricName: name,
                    Value: value,
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
