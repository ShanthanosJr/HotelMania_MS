import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface LightboxImage { src: string; alt: string }

interface LightboxProps {
    images: LightboxImage[];
    index: number | null;
    onChange: (i: number | null) => void;
}

/** Full-screen photo viewer with a "3 / 12" counter, arrow keys, swipe and Esc to close. */
const Lightbox: React.FC<LightboxProps> = ({ images, index, onChange }) => {
    const closeRef = useRef<HTMLButtonElement>(null);
    const touchX = useRef<number | null>(null);
    const open = index !== null && images[index];
    const go = useCallback((delta: number) => {
        if (index === null) return;
        onChange((index + delta + images.length) % images.length);
    }, [index, images.length, onChange]);

    useEffect(() => {
        if (!open) return;
        const prevFocus = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onChange(null);
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            prevFocus?.focus();
        };
    }, [open, go, onChange]);

    if (!open || index === null) return null;
    const img = images[index];
    const navBtn = 'absolute top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/25 cursor-pointer';

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${index + 1} of ${images.length}`}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={e => { if (e.target === e.currentTarget) onChange(null); }}
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}
        >
            <figure className="flex max-h-full max-w-6xl flex-col items-center">
                <img src={img.src.replace(/w=\d+/, 'w=2000')} alt={img.alt} className="max-h-[80vh] w-auto rounded-lg object-contain" />
                <figcaption className="mt-4 flex items-center gap-4 text-sm text-white/80">
                    <span className="font-semibold tabular-nums text-white">{index + 1} / {images.length}</span>
                    <span>{img.alt}</span>
                </figcaption>
            </figure>
            {images.length > 1 && (
                <>
                    <button type="button" className={`${navBtn} left-3 md:left-6`} onClick={() => go(-1)} aria-label="Previous photo">‹</button>
                    <button type="button" className={`${navBtn} right-3 md:right-6`} onClick={() => go(1)} aria-label="Next photo">›</button>
                </>
            )}
            <button ref={closeRef} type="button" onClick={() => onChange(null)} aria-label="Close photos"
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/25 cursor-pointer">
                ×
            </button>
        </div>,
        document.body,
    );
};

export default Lightbox;
