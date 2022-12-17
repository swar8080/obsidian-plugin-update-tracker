import { PluginReleasesRecord, ReleaseRepository } from '.';
import { isEmpty } from '../util';

export class FallbackReleaseRepository implements ReleaseRepository {
    private releaseRepositories: ReleaseRepository[];

    constructor(releaseRepositories: ReleaseRepository[]) {
        if (isEmpty(releaseRepositories)) {
            throw new Error('release repositories cannot be empty');
        }

        this.releaseRepositories = releaseRepositories;
    }

    public async getReleases(pluginIds: string[]): Promise<PluginReleasesRecord[]> {
        return await this.doWithFallback(
            (releaseRepository) => releaseRepository.getReleases(pluginIds),
            'getReleases'
        );
    }

    public async save(records: PluginReleasesRecord[]): Promise<void> {
        return await this.doWithFallback(
            (releaseRepository) => releaseRepository.save(records),
            'save'
        );
    }

    private async doWithFallback<T>(
        operation: (releaseRepository: ReleaseRepository) => Promise<T>,
        operationName: string
    ): Promise<T> {
        let prioritizedOrder = this.releaseRepositories;
        for (let i = 0; i < this.releaseRepositories.length; i++) {
            const releaseRepository = this.releaseRepositories[i];
            try {
                return await operation(releaseRepository);
            } catch (err) {
                console.error(
                    `Error handling operation ${operationName} with release repository ${releaseRepository}`,
                    err
                );

                if (i + 1 >= this.releaseRepositories.length) {
                    throw err;
                }

                //move to back of list of repositories to try for the next operations
                prioritizedOrder = [...prioritizedOrder];
                delete prioritizedOrder[i];
                prioritizedOrder.push(releaseRepository);
            } finally {
                this.releaseRepositories = prioritizedOrder;
            }
        }

        throw new Error('No release repositories configured');
    }
}
