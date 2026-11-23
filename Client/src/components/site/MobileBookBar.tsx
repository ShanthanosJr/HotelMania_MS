import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SITE, telHref } from '../../config/site';

const HIDDEN_ON = ['/book', '/booking', '/login', '/register', '/admin'];

/** Bottom "Call · Book" bar on phones once the visitor scrolls past the hero. */
const MobileBookBar: React.FC = () => {
    const { pathname } = useLocation();
    const [show, setShow] = useState(false);
    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 480);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    if (HIDDEN_ON.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null;
    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-ivory/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur transition-transform duration-300 lg:hidden dark:border-graphite dark:bg-charcoal/95 ${show ? 'translate-y-0' : 'translate-y-full'}`}
            aria-hidden={!show}
        >
            <div className="mx-auto flex max-w-md gap-3">
                <a href={telHref(SITE.phone)} tabIndex={show ? 0 : -1}
                    className="flex-1 rounded-lg border-2 border-bronze py-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-bronze dark:border-gold dark:text-gold">
                    Call us
                </a>
                <Link to="/book" tabIndex={show ? 0 : -1}
                    className="flex-[2] rounded-lg bg-bronze py-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white dark:bg-gold dark:text-night">
                    Book your stay
                </Link>
            </div>
        </div>
    );
};

export default MobileBookBar;
