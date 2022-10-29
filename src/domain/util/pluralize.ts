export function pluralize(text: string, count: number) {
    return count !== 1 ? text + 's' : text;
}
