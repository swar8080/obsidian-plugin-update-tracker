import * as dotenv from 'dotenv';
import * as path from 'path';

type Deployment = {
    env: 'dev' | 'stage' | 'prod';
    isDev: boolean;
    isProd: boolean;
};

export function initEnv(): Deployment {
    dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
    dotenv.config({ path: path.resolve(__dirname, '../.env.secrets'), override: true });

    if (
        process.env.OPUC_ENV !== 'dev' &&
        process.env.OPUC_ENV !== 'stage' &&
        process.env.OPUC_ENV !== 'prod'
    ) {
        throw new Error('OPUC_ENV must be one of: dev, prod');
    }

    if (process.env.OPUC_ENV === 'dev') {
        dotenv.config({ path: path.resolve(__dirname, '../.env.dev'), override: true });
    }

    return {
        env: process.env.OPUC_ENV,
        isDev: process.env.OPUC_ENV === 'dev',
        isProd: process.env.OPUC_ENV === 'prod',
    };
}
