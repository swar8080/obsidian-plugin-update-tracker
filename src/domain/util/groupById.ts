import isFunction from 'lodash/isFunction';

export function groupById<T>(
    items: T[],
    idExtractor: keyof T | ((item: T) => string)
): Record<string, T> {
    if (items == null || items.length === 0) {
        return {};
    }
    return items.reduce((combined, item) => {
        let id: string;
        if (isFunction(idExtractor)) {
            id = idExtractor(item);
        } else {
            id = new String(item[idExtractor]).toString();
        }

        combined[id] = item;
        return combined;
    }, {} as Record<string, T>);
}
