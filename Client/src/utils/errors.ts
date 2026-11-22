/** Normalises anything thrown into an Error so `.message` is always safe to read. */
export const toError = (value: unknown): Error => {
    if (value instanceof Error) return value;
    if (typeof value === 'string') return new Error(value);
    if (value && typeof value === 'object' && 'message' in value) {
        return new Error(String((value as { message: unknown }).message));
    }
    return new Error('Something went wrong');
};

/** Message for a thrown value, with a fallback when it has none. */
export const errorMessage = (value: unknown, fallback = 'Something went wrong'): string =>
    toError(value).message || fallback;
