import React from 'react';
import type { BadgeTone } from './status';

/* ---------- Badge ---------- */

const BADGE_TONES: Record<BadgeTone, string> = {
    neutral: 'bg-stone text-umber dark:bg-graphite dark:text-gray-300',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
    brand: 'bg-parchment text-bronze dark:bg-gold/15 dark:text-gold',
};

export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
    tone = 'neutral',
    className = '',
    children,
}) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${BADGE_TONES[tone]} ${className}`}>
        {children}
    </span>
);

/* ---------- Card ---------- */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }> = ({
    padded = true,
    className = '',
    ...rest
}) => (
    <div
        className={`rounded-2xl border border-stone bg-white shadow-sm dark:border-graphite dark:bg-charcoal ${padded ? 'p-6' : ''} ${className}`}
        {...rest}
    />
);

/* ---------- Skeleton ---------- */

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-stone/70 dark:bg-graphite ${className}`} />
);

/* ---------- EmptyState ---------- */

export const EmptyState: React.FC<{
    icon?: React.ReactNode;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}> = ({ icon, title, description, action, className = '' }) => (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-14 ${className}`}>
        {icon && <div className="mb-4 text-4xl text-wheat dark:text-gray-600">{icon}</div>}
        <h3 className="font-display text-xl font-semibold text-ink dark:text-cream">{title}</h3>
        {description && <p className="mt-2 max-w-md text-sm text-taupe dark:text-gray-400">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);
