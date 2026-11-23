import React, { useId } from 'react';

const CONTROL =
    'w-full rounded-lg border bg-white px-4 py-3 text-sm text-ink placeholder:text-taupe/60 transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-bronze ' +
    'dark:bg-night dark:text-cream dark:placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed';

const borderFor = (error?: string) =>
    error ? 'border-danger' : 'border-stone dark:border-graphite';

interface FieldShellProps {
    label?: React.ReactNode;
    hint?: React.ReactNode;
    error?: string;
    required?: boolean;
    className?: string;
    /** Use this id for the control instead of a generated one. */
    id?: string;
    children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}

/** Label + control + hint/error, with ids wired for screen readers. */
const FieldShell: React.FC<FieldShellProps> = ({ label, hint, error, required, className = '', id: fixedId, children }) => {
    const generatedId = useId();
    const id = fixedId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-umber dark:text-gray-300">
                    {label}
                    {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
                </label>
            )}
            {children({ id, describedBy })}
            {error ? (
                <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">{error}</p>
            ) : hint ? (
                <p id={hintId} className="mt-1.5 text-xs text-taupe dark:text-gray-400">{hint}</p>
            ) : null}
        </div>
    );
};

type Common = { label?: React.ReactNode; hint?: React.ReactNode; error?: string; containerClassName?: string };

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Common>(
    ({ label, hint, error, containerClassName, className = '', required, ...rest }, ref) => (
        <FieldShell label={label} hint={hint} error={error} required={required} className={containerClassName} id={rest.id}>
            {({ id, describedBy }) => (
                <input
                    ref={ref}
                    id={id}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`${CONTROL} ${borderFor(error)} ${className}`}
                    {...rest}
                />
            )}
        </FieldShell>
    ),
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & Common>(
    ({ label, hint, error, containerClassName, className = '', required, children, ...rest }, ref) => (
        <FieldShell label={label} hint={hint} error={error} required={required} className={containerClassName} id={rest.id}>
            {({ id, describedBy }) => (
                <select
                    ref={ref}
                    id={id}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`${CONTROL} ${borderFor(error)} cursor-pointer ${className}`}
                    {...rest}
                >
                    {children}
                </select>
            )}
        </FieldShell>
    ),
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(
    ({ label, hint, error, containerClassName, className = '', required, rows = 4, ...rest }, ref) => (
        <FieldShell label={label} hint={hint} error={error} required={required} className={containerClassName} id={rest.id}>
            {({ id, describedBy }) => (
                <textarea
                    ref={ref}
                    id={id}
                    rows={rows}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`${CONTROL} ${borderFor(error)} resize-y ${className}`}
                    {...rest}
                />
            )}
        </FieldShell>
    ),
);
Textarea.displayName = 'Textarea';
