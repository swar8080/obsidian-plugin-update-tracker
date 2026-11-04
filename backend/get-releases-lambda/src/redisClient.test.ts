import { createClient } from 'redis';
import { gunzipSync, gzipSync } from 'zlib';
import { MetricLogger } from './MetricLogger';
import { RedisClient } from './redisClient';

jest.mock('redis', () => ({ createClient: jest.fn() }));

type Item = { id: string; notes: string };

const NAMESPACE = 'releases';
const keyFor = (id: string) => `dev:${NAMESPACE}:${id}`;

describe('RedisClient', () => {
    let storedValues: Map<string, Buffer>;
    let mSetShouldFail: boolean;
    let consoleErrorSpy: jest.SpyInstance;
    let redisClient: RedisClient;

    beforeEach(() => {
        storedValues = new Map();
        mSetShouldFail = false;
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        (createClient as jest.Mock).mockClear();
        (createClient as jest.Mock).mockReturnValue({
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
            mGet: jest.fn(async (_options: unknown, keys: string[]) =>
                keys.map((key) => storedValues.get(key) ?? null)
            ),
            mSet: jest.fn(async (keyValues: Record<string, Buffer | string>) => {
                if (mSetShouldFail) {
                    throw new Error('redis is unavailable');
                }
                Object.entries(keyValues).forEach(([key, value]) =>
                    storedValues.set(key, Buffer.from(value))
                );
            }),
        });

        const metricLogger: MetricLogger = {
            trackGithubRateLimit: jest.fn(),
            trackErrorCodeOccurrence: jest.fn(),
        };
        redisClient = new RedisClient('redis://localhost', 'password', false, metricLogger);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('stores items compressed and reads them back', async () => {
        const items: Item[] = [
            { id: 'a', notes: 'release notes '.repeat(200) },
            { id: 'b', notes: 'other notes' },
        ];

        await redisClient.putJson(NAMESPACE, items, (item) => item.id);

        const storedValue = storedValues.get(keyFor('a')) as Buffer;
        expect(storedValue[0]).toBe(0x1f);
        expect(storedValue[1]).toBe(0x8b);
        expect(JSON.parse(gunzipSync(storedValue).toString('utf8'))).toEqual(items[0]);
        expect(storedValue.length).toBeLessThan(JSON.stringify(items[0]).length / 5);

        expect(await redisClient.getJson<Item>(NAMESPACE, ['a', 'b'])).toEqual(items);
    });

    it('only returns the items that exist', async () => {
        await redisClient.putJson(NAMESPACE, [{ id: 'a', notes: 'x' }], (item) => item.id);

        expect(await redisClient.getJson<Item>(NAMESPACE, ['missing', 'a'])).toEqual([
            { id: 'a', notes: 'x' },
        ]);
    });

    it('reads uncompressed values and replaces them with compressed ones', async () => {
        const legacyItem: Item = { id: 'a', notes: 'legacy notes '.repeat(100) };
        storedValues.set(keyFor('a'), Buffer.from(JSON.stringify(legacyItem)));
        const legacySize = (storedValues.get(keyFor('a')) as Buffer).length;

        expect(await redisClient.getJson<Item>(NAMESPACE, ['a'])).toEqual([legacyItem]);

        const rewrittenValue = storedValues.get(keyFor('a')) as Buffer;
        expect(rewrittenValue[0]).toBe(0x1f);
        expect(rewrittenValue.length).toBeLessThan(legacySize / 5);
        expect(await redisClient.getJson<Item>(NAMESPACE, ['a'])).toEqual([legacyItem]);
    });

    it('still returns uncompressed values if replacing them fails', async () => {
        const legacyItem: Item = { id: 'a', notes: 'legacy' };
        storedValues.set(keyFor('a'), Buffer.from(JSON.stringify(legacyItem)));
        mSetShouldFail = true;

        expect(await redisClient.getJson<Item>(NAMESPACE, ['a'])).toEqual([legacyItem]);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('skips values that cannot be read', async () => {
        storedValues.set(
            keyFor('bad-gzip'),
            Buffer.concat([Buffer.from([0x1f, 0x8b]), Buffer.from('not gzip data')])
        );
        storedValues.set(keyFor('bad-json'), Buffer.from('{not json'));
        storedValues.set(keyFor('good'), gzipSync(JSON.stringify({ id: 'good', notes: '' })));

        expect(
            await redisClient.getJson<Item>(NAMESPACE, ['bad-gzip', 'bad-json', 'good'])
        ).toEqual([{ id: 'good', notes: '' }]);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('does nothing for empty input', async () => {
        expect(await redisClient.getJson<Item>(NAMESPACE, [])).toEqual([]);
        await redisClient.putJson<Item>(NAMESPACE, [], (item) => item.id);
        expect(createClient).not.toHaveBeenCalled();
    });
});
