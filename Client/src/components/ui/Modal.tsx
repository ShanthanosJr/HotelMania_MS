import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BsX } from 'react-icons/bs';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Hide the close (×) button, e.g. for confirmation dialogs. */
    hideClose?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Accessible modal: portal, Esc to close, focus trap, focus restore, body scroll lock. */
const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, children, footer, size = 'md', hideClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        // Focus the first field/button inside, else the panel itself
        const panel = panelRef.current;
        const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel)?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab' || !panel) return;
            const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;
            const firstEl = nodes[0];
            const lastEl = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            previouslyFocused?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={`relative w-full ${SIZES[size]} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-ivory dark:bg-charcoal text-ink dark:text-cream shadow-2xl border border-stone dark:border-graphite outline-none animate-fadeIn`}
            >
                {(title || !hideClose) && (
                    <div className="flex items-start justify-between gap-4 px-6 pt-6">
                        <div>
                            {title && <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>}
                            {description && <p id={descId} className="mt-1 text-sm text-taupe dark:text-gray-400">{description}</p>}
                        </div>
                        {!hideClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="-mr-2 -mt-1 rounded-full p-2 text-taupe hover:bg-stone/60 hover:text-ink dark:text-gray-400 dark:hover:bg-graphite dark:hover:text-cream transition-colors"
                            >
                                <BsX size={22} />
                            </button>
                        )}
                    </div>
                )}
                {children && <div className="px-6 py-5 overflow-y-auto">{children}</div>}
                {footer && (
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 pb-6 pt-2">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default Modal;
