const FUZZY_SEMVER_PATTERN = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?.*/;

export function semverCompare(version1: string | null, version2: string | null): number {
    if (version1 == version2) {
        return 0;
    } else if (version1 == null) {
        return -1;
    } else if (version2 == null) {
        return 1;
    }

    const v1Match = version1.match(FUZZY_SEMVER_PATTERN);
    const v2Match = version2.match(FUZZY_SEMVER_PATTERN);
    if (!v1Match && !v2Match) {
        return 0;
    } else if (!v1Match) {
        return -1;
    } else if (!v2Match) {
        return 1;
    }

    let versionPartIndex = 1;
    while (versionPartIndex <= 3) {
        const v1Part = parseInt(v1Match[versionPartIndex] || '0');
        const v2Part = parseInt(v2Match[versionPartIndex] || '0');

        if (v1Part !== v2Part) {
            return v1Part - v2Part;
        }

        versionPartIndex++;
    }

    return 0;
}
