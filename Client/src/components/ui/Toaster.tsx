import React, { useEffect, useState } from 'react';
import { BsCheckCircleFill, BsExclamationTriangleFill, BsInfoCircleFill, BsXCircleFill, BsX } from 'react-icons/bs';
import { dismissToast, flushPendingToast, subscribeToasts, type ToastItem, type ToastTone } from './toast';
import { subscribeConfirm, type PendingConfirm } from './confirm';
import Modal from './Modal';
import Button from './Button';

const ICONS: Record<ToastTone, React.ReactNode> = {
    success: <BsCheckCircleFill className="text-success" />,
    error: <BsXCircleFill className="text-danger" />,
    warning: <BsExclamationTriangleFill className="text-warning" />,
    info: <BsInfoCircleFill className="text-info" />,
};

const ACCENT: Record<ToastTone, string> = {
    success: 'border-l-success',
    error: 'border-l-danger',
    warning: 'border-l-warning',
    info: 'border-l-info',
};

const ToastCard: React.FC<{ item: ToastItem }> = ({ item }) => {
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const timer = window.setTimeout(() => dismissToast(item.id), item.duration);
        return () => window.clearTimeout(timer);
    }, [item.id, item.duration, paused]);

    return (
        <div
            role={item.tone === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-stone border-l-4 ${ACCENT[item.tone]} bg-white px-4 py-3 shadow-lg dark:border-graphite dark:bg-charcoal animate-fadeIn`}
        >
            <span className="mt-0.5 text-lg" aria-hidden="true">{ICONS[item.tone]}</span>
            <div className="flex-1 text-sm text-ink dark:text-cream">
                {item.title && <p className="font-semibold">{item.title}</p>}
                <p className="leading-6">{item.message}</p>
            </div>
            <button
                type="button"
                onClick={() => dismissToast(item.id)}
                aria-label="Dismiss notification"
                className="-mr-1 rounded-full p-1 text-taupe hover:bg-stone/60 hover:text-ink dark:text-gray-400 dark:hover:bg-graphite"
            >
                <BsX size={18} />
            </button>
        </div>
    );
};

/** Renders toasts and confirmation dialogs. Mount once near the app root. */
const Toaster: React.FC = () => {
    const [items, setItems] = useState<ToastItem[]>([]);
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    useEffect(() => {
        const offToasts = subscribeToasts(setItems);
        const offConfirm = subscribeConfirm(setPending);
        flushPendingToast();
        return () => { offToasts(); offConfirm(); };
    }, []);

    return (
        <>
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 top-4 z-[110] mx-auto flex w-full max-w-sm flex-col gap-3 px-4 sm:right-4 sm:left-auto sm:mx-0"
            >
                {items.map(item => <ToastCard key={item.id} item={item} />)}
            </div>

            <Modal
                open={!!pending}
                onClose={() => pending?.resolve(false)}
                title={pending?.title}
                description={pending?.message}
                size="sm"
                hideClose
                footer={
                    <>
                        <Button variant="ghost" onClick={() => pending?.resolve(false)}>
                            {pending?.cancelLabel ?? 'Cancel'}
                        </Button>
                        <Button
                            variant={pending?.tone === 'danger' ? 'danger' : 'primary'}
                            onClick={() => pending?.resolve(true)}
                        >
                            {pending?.confirmLabel ?? 'Confirm'}
                        </Button>
                    </>
                }
            />
        </>
    );
};

export default Toaster;
