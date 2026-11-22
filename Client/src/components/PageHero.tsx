import React from 'react';

interface PageHeroProps {
    eyebrow?: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    image?: string;
    children?: React.ReactNode;
}

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600';

/** Compact dark page header. Keeps the transparent navbar readable on pages without a big hero. */
const PageHero: React.FC<PageHeroProps> = ({ eyebrow, title, subtitle, image = DEFAULT_IMAGE, children }) => (
    <header className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/60 to-ink" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-32 pb-12 text-white">
            {eyebrow && <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-sand">{eyebrow}</p>}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-cream/85">{subtitle}</p>}
            {children}
        </div>
    </header>
);

export default PageHero;
