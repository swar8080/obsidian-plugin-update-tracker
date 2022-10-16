import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    BatchGetCommand,
    BatchGetCommandOutput,
    BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { PluginReleasesRecord, ReleaseRepository } from '.';
import { isEmpty, partition } from '../util';

const DDB_MAX_WRITE_BATCH_SIZE = 25;

export class DynamoDBReleaseRepository implements ReleaseRepository {
    private tableName: string;
    private dynamodb: DynamoDBDocumentClient;

    constructor(tableName: string) {
        this.tableName = tableName;

        this.dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
            marshallOptions: { removeUndefinedValues: true },
        });
    }

    async getReleases(pluginIds: string[]): Promise<PluginReleasesRecord[]> {
        if (isEmpty(pluginIds)) {
            return [];
        }

        const command: BatchGetCommand = new BatchGetCommand({
            RequestItems: {
                [this.tableName]: {
                    Keys: pluginIds.map((pluginId) => ({
                        pluginId,
                    })),
                },
            },
        });
        const response: BatchGetCommandOutput = await this.dynamodb.send(command);

        if (response.Responses && this.tableName in response.Responses) {
            const rows: Record<string, any>[] = response.Responses[this.tableName];
            return rows as PluginReleasesRecord[];
        }

        console.error('Unexpected empty response from dynamo', response);
        throw new Error();
    }

    async save(records: PluginReleasesRecord[]): Promise<void> {
        if (isEmpty(records)) {
            return;
        }

        const batches = partition(records, DDB_MAX_WRITE_BATCH_SIZE);

        for (const batch of batches) {
            const command = new BatchWriteCommand({
                RequestItems: {
                    [this.tableName]: batch.map((record) => ({
                        PutRequest: {
                            Item: record,
                        },
                    })),
                },
            });

            await this.dynamodb.send(command);
        }
    }
}
