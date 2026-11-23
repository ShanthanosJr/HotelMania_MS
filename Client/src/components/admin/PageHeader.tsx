import React from 'react';

/** Title row used at the top of every staff page. */
const PageHeader: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 className="font-display text-3xl font-semibold text-ink dark:text-cream">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-taupe dark:text-gray-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);

export default PageHeader;
