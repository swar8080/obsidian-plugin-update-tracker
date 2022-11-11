import enrichReleaseNotes from './releaseNoteEnricher';

describe('releaseNoteEnricher', () => {
    const VERSION_NAME = 'Release v1.0.1*';
    const VERSION_NUMBER = '1.1.1';
    const PLUGIN_URL = 'https://github.com/author/repo-name';

    describe('Removing redundant release name', () => {
        test('Remove name from start of notes', () => {
            const notes = `# ${VERSION_NAME}\n# Details of ${VERSION_NAME}\nEtc`;

            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);

            expect(result).toBe(`# Details of ${VERSION_NAME}\nEtc`);
        });

        test('Name not removed from middle of notes', () => {
            const notes = `# Some other header\n# Details of ${VERSION_NAME}\nEtc`;

            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);

            expect(result).toBe(notes);
        });

        test('Name removed from non-markdown header', () => {
            const notes = `${VERSION_NAME}\n\n# Details of ${VERSION_NAME}\nEtc`;

            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);

            expect(result).toBe(`# Details of ${VERSION_NAME}\nEtc`);
        });
    });

    describe('Remove redundant release version', () => {
        test('Remove version from start of notes', () => {
            const notes = `## ${VERSION_NUMBER}\n# Details of ${VERSION_NUMBER}\nEtc`;

            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);

            expect(result).toBe(`# Details of ${VERSION_NUMBER}\nEtc`);
        });

        test('Version not removed from middle of notes', () => {
            const notes = `## Some other header\n# Details of ${VERSION_NUMBER}\nEtc`;

            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);

            expect(result).toBe(notes);
        });
    });

    describe('Replacing github issue numbers with links to the issue', () => {
        it('Replaces all likely issue numbers', () => {
            let notes = '#233 Fixed issue #421: Also #4332. Then #123, #456 and #789! Finally #999';
            let result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);
            expect(result).toBe(
                '[#233](https://github.com/author/repo-name/issues/233) Fixed issue [#421](https://github.com/author/repo-name/issues/421): Also [#4332](https://github.com/author/repo-name/issues/4332). Then [#123](https://github.com/author/repo-name/issues/123), [#456](https://github.com/author/repo-name/issues/456) and [#789](https://github.com/author/repo-name/issues/789)! Finally [#999](https://github.com/author/repo-name/issues/999)'
            );
        });

        it('does not replace values partially resembling an issue number', () => {
            const notes = '123 #123a #';
            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);
            expect(result).toBe(notes);
        });

        it('does not replace issue numbers that already have a url', () => {
            const notes = '[#123](https://github.com/author/some-other-repo/issues/123)';
            const result = enrichReleaseNotes(notes, VERSION_NAME, VERSION_NUMBER, PLUGIN_URL);
            expect(result).toBe(notes);
        });
    });
});
