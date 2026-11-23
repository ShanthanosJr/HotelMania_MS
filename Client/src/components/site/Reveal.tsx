import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    as?: 'div' | 'section' | 'article' | 'li';
}

/**
 * Fades content up as it scrolls into view. Content is never hidden for people who
 * prefer reduced motion, and the movement is small so text stays readable.
 */
const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, as = 'div' }) => {
    const reduce = useReducedMotion();
    const Tag = motion[as];
    if (reduce) {
        const Plain = as;
        return <Plain className={className}>{children}</Plain>;
    }
    return (
        <Tag
            className={className}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
        >
            {children}
        </Tag>
    );
};

export default Reveal;
