import React from 'react';

interface GuestStepperProps {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    id?: string;
    className?: string;
}

/** − 2 guests + control. Buttons are real buttons, the value is announced to screen readers. */
const GuestStepper: React.FC<GuestStepperProps> = ({ value, onChange, min = 1, max = 10, id, className = '' }) => {
    const btn = 'flex h-9 w-9 items-center justify-center rounded-full border border-wheat text-lg leading-none text-bronze transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40 dark:border-graphite dark:text-gold dark:hover:bg-graphite cursor-pointer';
    return (
        <div id={id} role="group" aria-label="Guests" className={`flex items-center justify-between gap-3 ${className}`}>
            <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Fewer guests">−</button>
            <span aria-live="polite" className="min-w-[4.5rem] text-center text-sm font-semibold text-ink dark:text-cream">
                {value} guest{value === 1 ? '' : 's'}
            </span>
            <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More guests">+</button>
        </div>
    );
};

export default GuestStepper;
