import { api } from './api';

/** Calls the API and returns `data`, or throws an Error with the server's message. */
export async function apiJson<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method };
    if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
    const res = await api.request(url, init as Parameters<typeof api.request>[1]);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
    return json.data as T;
}

export const errorText = (err: unknown, fallback = 'Something went wrong') => (err instanceof Error ? err.message : fallback);

/** Photos are stored as full links or /uploads/… paths served by the API. */
export const photoSrc = (p?: string) => {
    if (!p) return '';
    if (/^https?:\/\//.test(p)) return p;
    const base = import.meta.env.MODE === 'production' ? (import.meta.env.VITE_API_URL || '') : '';
    return `${base}${p}`;
};
