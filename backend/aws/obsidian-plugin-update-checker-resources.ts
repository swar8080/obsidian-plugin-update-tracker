import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction, LogLevel } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import { initEnv } from './env';

const deployment = initEnv();

export class ObsidianPluginUpdaterStack extends cdk.Stack {
    constructor(scope: Construct, id: string, namespace: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const getReleasesLambda = new NodejsFunction(this, `get-releases-function`, {
            functionName: `get-releases-function-${deployment.env}`,
            entry: path.join(__dirname, '../get-releases-lambda/src/handler.ts'),
            handler: 'main',
            memorySize: 150,
            timeout: Duration.seconds(90),
            runtime: lambda.Runtime.NODEJS_16_X,
            architecture: lambda.Architecture.ARM_64,
            environment: {
                ...getFromEnvironmentVariables([
                    'OPUC_MAX_PLUGIN_COUNT_PROCESSED',
                    'OPUC_GITHUB_ACCESS_TOKEN',
                    'OPUC_RELEASES_CACHE_LENGTH_SECONDS_MULTIPLIER',
                    'OPUC_PLUGIN_CACHE_LENGTH_DIVISOR',
                    'OPUC_RELEASES_FETCHED_PER_PLUGIN',
                    'OPUC_MAX_RELEASE_NOTE_LENGTH',
                    'OPUC_MAX_MANIFESTS_TO_FETCH_PER_PLUGIN',
                    'OPUC_GITHUB_API_TIMEOUT_MS',
                    'OPUC_IGNORE_RELEASES_FOR_THIS_PLUGIN',
                    'OPUC_USE_DYNAMODB_RELEASE_REPOSITORY',
                    'OPUC_USE_REDIS_RELEASE_REPOSITORY',
                    'OPUC_REDIS_URL',
                    'OPUC_REDIS_PASSWORD',
                ]),
                OPUC_IS_PROD: deployment.isProd.toString(),
            },
            bundling: {
                minify: false,
                keepNames: true,
                logLevel: LogLevel.INFO,
            },
            logRetention: deployment.isProd
                ? logs.RetentionDays.TWO_WEEKS
                : logs.RetentionDays.THREE_DAYS,
        });

        const getReleasesFunctionUrl = getReleasesLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
        });
        new cdk.CfnOutput(this, 'ReminderPromptUrl', {
            value: getReleasesFunctionUrl.url,
        });

        /**
         * S3 bucket storing https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json.
         * That file is cached for a day before being deleted, at which point the lambda should fetch and write the file.
         */
        const pluginsListBucket = new s3.Bucket(this, `plugins-list-bucket`, {
            bucketName: `plugin-list-bucket-${deployment.env}-${namespace}`,
            lifecycleRules: [
                {
                    expiration: Duration.days(1),
                },
            ],
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });
        getReleasesLambda.addEnvironment(
            'OPUC_PLUGINS_LIST_BUCKET_NAME',
            pluginsListBucket.bucketName
        );
        pluginsListBucket.grantRead(getReleasesLambda);
        pluginsListBucket.grantPut(getReleasesLambda);

        //Table used by lambda for cacheing plugin release metadata
        const pluginReleaseTable = new dynamodb.Table(this, 'plugin-releases-table', {
            tableName: `plugin-releases-table-${deployment.env}`,
            partitionKey: {
                name: 'pluginId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: deployment.isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        getReleasesLambda.addEnvironment(
            'OPUC_PLUGIN_RELEASES_TABLE_NAME',
            pluginReleaseTable.tableName
        );
        pluginReleaseTable.grantReadData(getReleasesLambda);
        pluginReleaseTable.grantWriteData(getReleasesLambda);

        //Allow the lambda to write to metrics in its namespace
        const metricNamespace = `obsidian-plugin-update-checker-${deployment.env}`;
        const putMetricsPolicy = new iam.PolicyStatement({
            actions: ['cloudwatch:PutMetricData'],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        });
        putMetricsPolicy.addCondition('StringEquals', { 'cloudwatch:namespace': metricNamespace });
        getReleasesLambda.addToRolePolicy(putMetricsPolicy);
        getReleasesLambda.addEnvironment('OPUC_METRIC_NAMESPACE', metricNamespace);
    }
}

function getFromEnvironmentVariables(names: string[]) {
    return names.reduce((combined, name) => {
        if (process.env[name] == null || process.env[name] === '') {
            throw new Error(`Environment variable ${name} is not defined`);
        }
        const value = process.env[name] as string;
        combined[name] = value;
        return combined;
    }, {} as Record<string, string>);
}
