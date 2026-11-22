import React from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const BASE =
    'inline-flex items-center justify-center gap-2 rounded font-semibold uppercase tracking-[0.16em] transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-ivory dark:focus-visible:ring-offset-night disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-bronze text-white border-2 border-bronze hover:bg-bronze-deep hover:border-bronze-deep ' +
        'dark:bg-gold dark:border-gold dark:text-night dark:hover:bg-gold/85',
    secondary:
        'bg-transparent text-bronze border-2 border-bronze hover:bg-bronze hover:text-white ' +
        'dark:text-gold dark:border-gold dark:hover:bg-gold dark:hover:text-night',
    ghost:
        'bg-transparent text-umber border-2 border-transparent hover:bg-stone/60 ' +
        'dark:text-cream dark:hover:bg-graphite',
    danger:
        'bg-danger text-white border-2 border-danger hover:bg-red-600 hover:border-red-600',
};

const SIZES: Record<Size, string> = {
    sm: 'px-4 py-2 text-[0.7rem]',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, fullWidth, leftIcon, rightIcon, className = '', children, disabled, type = 'button', ...rest }, ref) => (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...rest}
        >
            {loading ? <Spinner size="sm" /> : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    ),
);
Button.displayName = 'Button';

export default Button;
