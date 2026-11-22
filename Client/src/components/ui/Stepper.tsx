import React, { useId } from 'react';
import { BsDash, BsPlus } from 'react-icons/bs';

interface StepperProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    /** Text after the number, e.g. "guests". */
    unit?: string;
    className?: string;
}

/** Number input with − / + buttons (guests, rooms...). */
const Stepper: React.FC<StepperProps> = ({ label, value, onChange, min = 1, max = 10, unit, className = '' }) => {
    const id = useId();
    const btn =
        'flex h-9 w-9 items-center justify-center rounded-full border border-stone text-umber transition-colors ' +
        'hover:border-bronze hover:text-bronze disabled:opacity-40 disabled:hover:border-stone disabled:hover:text-umber ' +
        'dark:border-graphite dark:text-cream dark:hover:border-gold dark:hover:text-gold cursor-pointer disabled:cursor-not-allowed';
    return (
        <div className={className}>
            <span id={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-umber dark:text-gray-300">
                {label}
            </span>
            <div
                role="group"
                aria-labelledby={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone bg-white px-2 py-1.5 dark:border-graphite dark:bg-night"
            >
                <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${unit || label}`}>
                    <BsDash />
                </button>
                <span className="min-w-[4.5rem] text-center text-sm font-semibold text-ink dark:text-cream" aria-live="polite">
                    {value}{unit ? ` ${value === 1 ? unit.replace(/s$/, '') : unit}` : ''}
                </span>
                <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${unit || label}`}>
                    <BsPlus />
                </button>
            </div>
        </div>
    );
};

export default Stepper;
