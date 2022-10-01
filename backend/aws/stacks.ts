#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { ObsidianPluginUpdaterStack } from './obsidian-plugin-update-checker-resources';

if (!process.env.OPUC_RESOURCE_NAMESPACE) {
    //needed for globally unique s3 bucket names
    throw new Error('OPUC_RESOURCE_NAMESPACE environment variable must be defined');
}

const app = new cdk.App();
new ObsidianPluginUpdaterStack(
    app,
    'obsidian-plugin-update-checker-dev',
    process.env.OPUC_RESOURCE_NAMESPACE,
    {}
);
new ObsidianPluginUpdaterStack(
    app,
    'obsidian-plugin-update-checker-prod',
    process.env.OPUC_RESOURCE_NAMESPACE,
    {}
);
