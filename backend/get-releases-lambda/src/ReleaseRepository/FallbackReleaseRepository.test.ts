import { ReleaseRepository } from '.';
import { FallbackReleaseRepository } from './FallbackReleaseRepository';

describe('FallbackReleaseRepository', () => {
    let fallbackReleaseRepository: FallbackReleaseRepository;
    let faultyReleaseRepository: ReleaseRepository;
    let backupReleaseRepository: ReleaseRepository;

    beforeEach(() => {
        faultyReleaseRepository = {
            getReleases: jest.fn().mockRejectedValue(null),
            save: jest.fn().mockRejectedValue(null),
        };
        backupReleaseRepository = {
            getReleases: jest.fn().mockResolvedValueOnce([]),
            save: jest.fn().mockResolvedValue(null),
        };
    });

    it('will fallback to the second repository and use that one next time', async () => {
        fallbackReleaseRepository = new FallbackReleaseRepository([
            faultyReleaseRepository,
            backupReleaseRepository,
        ]);

        let result = await fallbackReleaseRepository.getReleases(['plugin1']);

        expect(faultyReleaseRepository.getReleases).toHaveBeenCalledTimes(1);
        expect(backupReleaseRepository.getReleases).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);

        result = await fallbackReleaseRepository.getReleases(['plugin1']);

        expect(faultyReleaseRepository.getReleases).toHaveBeenCalledTimes(1);
        expect(backupReleaseRepository.getReleases).toHaveBeenCalledTimes(2);
    });

    it('will give up if all repositories fail', (done) => {
        fallbackReleaseRepository = new FallbackReleaseRepository([
            faultyReleaseRepository,
            faultyReleaseRepository,
        ]);

        fallbackReleaseRepository.getReleases(['plugin1']).catch(() => {
            expect(faultyReleaseRepository.getReleases).toHaveBeenCalledTimes(2);
            done();
        });
    });
});
