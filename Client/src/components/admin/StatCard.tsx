import React from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    to?: string;
    tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONES = {
    default: 'text-bronze bg-parchment dark:bg-gold/15 dark:text-gold',
    warning: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200',
    danger: 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-200',
    success: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200',
};

/** A single KPI. Becomes a link when `to` is given. */
const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon, to, tone = 'default' }) => {
    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-taupe dark:text-gray-400">{label}</p>
                {icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${TONES[tone]}`} aria-hidden="true">{icon}</span>}
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink dark:text-cream">{value}</p>
            {hint && <p className="mt-1 text-xs text-taupe dark:text-gray-400">{hint}</p>}
        </>
    );
    const cls = 'block rounded-2xl border border-stone bg-white p-5 dark:border-graphite dark:bg-charcoal';
    return to
        ? <Link to={to} className={`${cls} transition-colors hover:border-bronze dark:hover:border-gold`}>{body}</Link>
        : <div className={cls}>{body}</div>;
};

export default StatCard;
