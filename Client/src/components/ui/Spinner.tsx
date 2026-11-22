import React from 'react';

const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };

const Spinner: React.FC<{ size?: keyof typeof SIZES; label?: string; className?: string }> = ({
    size = 'md',
    label = 'Loading',
    className = '',
}) => (
    <span role="status" aria-label={label} className={`inline-block ${className}`}>
        <span className={`block animate-spin rounded-full border-current border-r-transparent ${SIZES[size]}`} />
    </span>
);

export default Spinner;
