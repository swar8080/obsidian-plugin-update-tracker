const REFERENCED_GITHUB_ISSUE_PATTERN = /#(\d+)([\s:,.!]|$)/g;

export default function enrichReleaseNotes(
    notes: string,
    versionName: string,
    versionNumber: string,
    pluginRepoUrl: string
): string {
    const repeatedVersionNameRemovalRegex = new RegExp(
        `^#*\\s?${escapeStringRegexp(versionName)}\n*`
    );
    notes = notes.replace(repeatedVersionNameRemovalRegex, '');

    const repeatedVersionNumberRemovalRegex = new RegExp(
        `^#*\\s?${escapeStringRegexp(versionNumber)}\n*`
    );
    notes = notes.replace(repeatedVersionNumberRemovalRegex, '');

    notes = notes.replace(REFERENCED_GITHUB_ISSUE_PATTERN, `[#$1](${pluginRepoUrl}/issues/$1)$2`);

    return notes;
}

function escapeStringRegexp(string: string) {
    return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}
