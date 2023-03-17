const DEBUG_LOGS_ENABLED = process.env['OPUC_DEBUG_LOGS_ENABLED'] === 'true';

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

export function debug(...args: any[]) {
    if (DEBUG_LOGS_ENABLED) {
        console.debug(...args);
    }
}
