/**
 * Tiny toast store. Call `toast.success('Saved')` from anywhere (components, utils, catch blocks).
 * <Toaster /> (mounted once in App) renders whatever is in the store.
 */

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: number;
    tone: ToastTone;
    message: string;
    title?: string;
    duration: number;
}

type Listener = (items: ToastItem[]) => void;

const PENDING_KEY = 'hm:pending-toast';
const DEFAULT_DURATION: Record<ToastTone, number> = { success: 4000, info: 5000, warning: 6000, error: 7000 };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach(l => l(items));

export const subscribeToasts = (listener: Listener) => {
    listeners.add(listener);
    listener(items);
    return () => { listeners.delete(listener); };
};

export const dismissToast = (id: number) => {
    items = items.filter(t => t.id !== id);
    emit();
};

interface ToastOptions { title?: string; duration?: number }

const push = (tone: ToastTone, message: string, opts: ToastOptions = {}) => {
    const item: ToastItem = {
        id: nextId++,
        tone,
        message,
        title: opts.title,
        duration: opts.duration ?? DEFAULT_DURATION[tone],
    };
    // Newest first, never more than 4 on screen
    items = [item, ...items].slice(0, 4);
    emit();
    return item.id;
};

export const toast = {
    success: (message: string, opts?: ToastOptions) => push('success', message, opts),
    error: (message: string, opts?: ToastOptions) => push('error', message, opts),
    info: (message: string, opts?: ToastOptions) => push('info', message, opts),
    warning: (message: string, opts?: ToastOptions) => push('warning', message, opts),
    /**
     * Show a toast on the next page load. Use before a full reload
     * (window.location.href = ...), which would otherwise wipe the toast.
     */
    afterRedirect: (tone: ToastTone, message: string) => {
        try {
            sessionStorage.setItem(PENDING_KEY, JSON.stringify({ tone, message }));
        } catch { /* storage unavailable: the toast is simply skipped */ }
    },
};

/** Called once by <Toaster /> on mount. */
export const flushPendingToast = () => {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw) return;
        sessionStorage.removeItem(PENDING_KEY);
        const { tone, message } = JSON.parse(raw) as { tone: ToastTone; message: string };
        if (message) push(tone in DEFAULT_DURATION ? tone : 'info', message);
    } catch { /* ignore malformed data */ }
};
