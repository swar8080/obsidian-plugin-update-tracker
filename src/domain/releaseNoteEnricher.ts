import escapeStringRegexp from 'escape-string-regexp';

const REFERENCED_GITHUB_ISSUE_PATTERN = /(?<!\[])#(\d+([^\]0-9]|$))/g;

export default function enrichReleaseNotes(
    notes: string,
    versionName: string,
    versionNumber: string,
    pluginRepoUrl: string
): string {
    const repeatedVersionNameRemovalRegex = new RegExp(
        `#*\s?${escapeStringRegexp(versionName)}\n?`
    );
    notes = notes.replace(repeatedVersionNameRemovalRegex, '');

    const repeatedVersionNumberRemovalRegex = new RegExp(
        `#*\s?${escapeStringRegexp(versionNumber)}\n?`
    );
    notes = notes.replace(repeatedVersionNumberRemovalRegex, '');

    notes = notes.replaceAll(REFERENCED_GITHUB_ISSUE_PATTERN, `[#$1](${pluginRepoUrl}/issues/$1)`);

    return notes;
}
