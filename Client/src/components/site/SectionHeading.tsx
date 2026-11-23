import React from 'react';

interface SectionHeadingProps {
    eyebrow?: string;
    title: React.ReactNode;
    text?: React.ReactNode;
    align?: 'left' | 'center';
    action?: React.ReactNode;
    tone?: 'light' | 'dark';
    id?: string;
}

/** Eyebrow + serif title + optional intro, used by every public section. */
const SectionHeading: React.FC<SectionHeadingProps> = ({ eyebrow, title, text, align = 'left', action, tone = 'light', id }) => {
    const center = align === 'center';
    const dark = tone === 'dark';
    return (
        <div className={`mb-10 flex flex-col gap-4 md:mb-14 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
            <div className={center ? 'max-w-2xl' : 'max-w-2xl'}>
                {eyebrow && (
                    <p className={`mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.24em] ${dark ? 'text-gold' : 'text-bronze dark:text-gold'}`}>
                        {eyebrow}
                    </p>
                )}
                <h2 id={id} className={`font-display text-3xl font-semibold leading-[1.15] sm:text-4xl md:text-[2.75rem] ${dark ? 'text-white' : 'text-ink dark:text-cream'}`}>
                    {title}
                </h2>
                {text && (
                    <p className={`mt-4 text-[1rem] leading-7 ${dark ? 'text-cream/80' : 'text-taupe dark:text-gray-300'}`}>{text}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
};

export default SectionHeading;
