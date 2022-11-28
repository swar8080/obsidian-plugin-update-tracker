const FUZZY_SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+).*/;

export function isEmpty(collection: any[] | null | undefined) {
    return collection == null || collection.length === 0;
}

export function groupById<T>(items: T[], idKey: keyof T): Record<string, T> {
    if (isEmpty(items)) {
        return {};
    }
    return items.reduce((prev, current) => {
        const id = new String(current[idKey]).toString();
        prev[id] = current;
        return prev;
    }, {} as Record<string, T>);
}

export function partition<T>(items: T[], chunkSize: number): T[][] {
    const partitions = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        partitions.push(chunk);
    }
    return partitions;
}

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
        const v1Part = parseInt(v1Match[versionPartIndex]);
        const v2Part = parseInt(v2Match[versionPartIndex]);

        if (v1Part !== v2Part) {
            return v1Part - v2Part;
        }

        versionPartIndex++;
    }

    return 0;
}
