import * as dotenv from 'dotenv';
import { main } from '../src/handler';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env.secrets'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env.dev'), override: true });

const awsResourceNamespace = process.env['OPUC_RESOURCE_NAMESPACE'];
process.env['OPUC_PLUGINS_LIST_BUCKET_NAME'] = `plugin-list-bucket-dev-${awsResourceNamespace}`;
process.env['OPUC_PLUGIN_RELEASES_TABLE_NAME'] = 'plugin-releases-table-dev';
process.env['OPUC_METRIC_NAMESPACE'] = 'obsidian-plugin-update-checker-dev';
process.env['OPUC_IS_PROD'] = 'false';

const requestFile = process.env['OPUC_LOCAL_REQUEST_FILE'] || 'single-plugin-request.json';
const requestFileContents = fs.readFileSync(path.resolve(__dirname, requestFile));

const apiGatewayRequest = {
    body: requestFileContents,
    requestContext: {
        http: {
            method: 'POST',
        },
    },
};

//@ts-ignore
main(apiGatewayRequest)
    .then((res) => console.log(JSON.stringify(res)))
    .catch(console.error);
