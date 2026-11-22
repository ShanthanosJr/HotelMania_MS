/**
 * Promise-based replacement for window.confirm:
 *   if (!(await confirmDialog({ title: 'Delete hotel?', tone: 'danger' }))) return;
 * Rendered by <DialogHost /> (mounted once in App).
 */

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'danger';
}

export interface PendingConfirm extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

type Listener = (pending: PendingConfirm | null) => void;

let current: PendingConfirm | null = null;
const listeners = new Set<Listener>();

export const subscribeConfirm = (listener: Listener) => {
    listeners.add(listener);
    listener(current);
    return () => { listeners.delete(listener); };
};

const set = (value: PendingConfirm | null) => {
    current = value;
    listeners.forEach(l => l(current));
};

export const confirmDialog = (opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => {
        // A new request cancels any dialog still open
        current?.resolve(false);
        // Without a mounted host (e.g. in tests) fall back to the browser dialog
        if (listeners.size === 0) {
            resolve(window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title));
            return;
        }
        set({
            ...opts,
            resolve: (ok: boolean) => {
                set(null);
                resolve(ok);
            },
        });
    });
