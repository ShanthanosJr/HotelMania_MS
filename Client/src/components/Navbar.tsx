import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { BsSun, BsMoonStars, BsPerson } from 'react-icons/bs';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';
import { clearSession, getStoredUser, STAFF_ROLES, homeForRole } from '../utils/auth';
import { SITE, telHref, whatsappHref } from '../config/site';
import { IMAGES } from '../config/content';

/** Shown in the header on large screens. */
const PRIMARY = [
    { label: 'Rooms', to: '/rooms' },
    { label: 'Dining', to: '/dining' },
    { label: 'Spa', to: '/spa' },
    { label: 'Offers', to: '/offers' },
    { label: 'Contact', to: '/contact' },
];

/** Everything, in the full-screen menu. */
const MENU = [
    { label: 'Home', to: '/' },
    { label: 'Rooms & Suites', to: '/rooms' },
    { label: 'Our Hotels', to: '/hotels' },
    { label: 'Dining', to: '/dining' },
    { label: 'Spa & Wellness', to: '/spa' },
    { label: 'Offers', to: '/offers' },
    { label: 'Gallery', to: '/gallery' },
    { label: 'Our Story', to: '/about' },
    { label: 'Contact', to: '/contact' },
];

const SECONDARY = [
    { label: 'FAQ', to: '/faq' },
    { label: 'Policies', to: '/policies' },
];

const Navbar: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState(getStoredUser);
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const menuBtnRef = useRef<HTMLButtonElement>(null);
    const firstLinkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the menu on navigation; pick up sign-in/out from other tabs
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);
    useEffect(() => {
        const onStorage = () => setUser(getStoredUser());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Menu: lock scroll, Esc closes, focus moves in and back out
    useEffect(() => {
        if (!menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        firstLinkRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        const btn = menuBtnRef.current;
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
            btn?.focus();
        };
    }, [menuOpen]);

    const logout = () => {
        api.post('/api/auth/logout', {}).catch(() => undefined);
        clearSession();
        setUser(null);
        setMenuOpen(false);
        navigate('/login');
    };

    const solid = scrolled;
    const fg = solid ? 'text-ink dark:text-cream' : 'text-white';
    const isStaff = !!user && STAFF_ROLES.includes(user.role);
    const firstName = user?.name ? user.name.split(' ')[0] : 'Account';

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-300 ${solid
                    ? 'bg-ivory/95 py-3 shadow-[0_1px_0_rgba(44,36,22,0.08),0_8px_24px_-12px_rgba(44,36,22,0.25)] backdrop-blur dark:bg-charcoal/95 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]'
                    : 'bg-gradient-to-b from-black/40 to-transparent py-5'}`}
            >
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink">
                    Skip to content
                </a>
                <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
                    <Link to="/" aria-label={`${SITE.name} home`} className={`font-display text-lg font-semibold tracking-[0.14em] sm:text-xl ${fg}`}>
                        HOTELMANIA
                    </Link>

                    <nav aria-label="Main" className="hidden items-center gap-7 lg:flex xl:gap-9">
                        {PRIMARY.map(link => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) => `group relative py-1 text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-gold ${fg} ${isActive ? '!text-gold' : ''}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        {link.label}
                                        <span className={`absolute -bottom-0.5 left-0 h-px bg-gold transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <a href={telHref(SITE.phone)} className={`mr-2 hidden text-[0.78rem] font-semibold tracking-[0.08em] transition-colors hover:text-gold 2xl:inline ${fg}`}>
                            {SITE.phone}
                        </a>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                            className={`hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/5 sm:flex dark:hover:bg-white/10 cursor-pointer ${fg}`}
                        >
                            {theme === 'light' ? <BsMoonStars size={16} /> : <BsSun size={17} />}
                        </button>
                        <Link
                            to={user ? (isStaff ? homeForRole(user.role) : '/bookings') : '/login'}
                            aria-label={user ? `${firstName}: ${isStaff ? 'staff dashboard' : 'my bookings'}` : 'Sign in'}
                            className={`hidden h-10 items-center gap-2 rounded-full px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-black/5 md:flex dark:hover:bg-white/10 ${fg}`}
                        >
                            <BsPerson size={17} />
                            <span className="hidden xl:inline">{user ? firstName : 'Sign in'}</span>
                        </Link>
                        <Link
                            to="/book"
                            className="rounded-md bg-gold px-3.5 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink shadow-sm transition-[background-color,transform] hover:-translate-y-px hover:bg-[#E0BE4F] sm:px-5"
                        >
                            Book<span className="hidden sm:inline"> now</span>
                        </Link>
                        <button
                            ref={menuBtnRef}
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                            aria-controls="site-menu"
                            className={`flex h-10 items-center gap-2.5 rounded-full pl-2 pr-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-gold cursor-pointer ${fg}`}
                        >
                            <span className="hidden sm:inline">Menu</span>
                            <span aria-hidden="true" className="flex w-6 flex-col gap-[5px]">
                                <span className="h-[1.5px] w-6 rounded bg-current" />
                                <span className="h-[1.5px] w-4 rounded bg-current" />
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {menuOpen && createPortal(
                <div id="site-menu" role="dialog" aria-modal="true" aria-label="Site menu"
                    className="fixed inset-0 z-[60] overflow-y-auto bg-ink text-cream animate-[menuIn_0.35s_ease-out]">
                    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col px-4 py-5 sm:px-6">
                        <div className="flex items-center justify-between">
                            <Link to="/" className="font-display text-lg font-semibold tracking-[0.14em] text-white sm:text-xl">HOTELMANIA</Link>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={toggleTheme}
                                    aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-cream hover:bg-white/10 cursor-pointer">
                                    {theme === 'light' ? <BsMoonStars size={16} /> : <BsSun size={17} />}
                                </button>
                                <button type="button" onClick={() => setMenuOpen(false)}
                                    className="flex h-10 items-center gap-3 rounded-full px-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cream hover:text-gold cursor-pointer">
                                    Close <span aria-hidden="true" className="text-2xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid flex-1 gap-12 py-10 lg:grid-cols-[1.4fr_1fr] lg:py-16">
                            <nav aria-label="Site">
                                <ol className="space-y-1 sm:space-y-2">
                                    {MENU.map((item, i) => (
                                        <li key={item.to}>
                                            <NavLink
                                                ref={i === 0 ? firstLinkRef : undefined}
                                                to={item.to}
                                                end
                                                className={({ isActive }) => `group flex items-baseline gap-4 py-1 font-display text-3xl leading-tight transition-colors sm:gap-6 sm:text-4xl xl:text-5xl ${isActive ? 'text-gold' : 'text-white hover:text-gold'}`}
                                            >
                                                <span className="w-7 font-body text-xs font-semibold tabular-nums tracking-[0.2em] text-gold/70 sm:w-8">
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <span className="transition-transform duration-300 group-hover:translate-x-2">{item.label}</span>
                                            </NavLink>
                                        </li>
                                    ))}
                                </ol>
                                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 pl-11 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-cream/60 sm:pl-14">
                                    {SECONDARY.map(s => <Link key={s.to} to={s.to} className="hover:text-gold">{s.label}</Link>)}
                                </div>
                            </nav>

                            <aside className="flex flex-col gap-8">
                                <div className="hidden overflow-hidden rounded-2xl lg:block">
                                    <img src={IMAGES.poolNight} alt="" className="h-56 w-full object-cover" />
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                                    <div>
                                        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">Reservations</p>
                                        <a href={telHref(SITE.phone)} className="block font-display text-2xl text-white hover:text-gold">{SITE.phone}</a>
                                        <a href={`mailto:${SITE.email}`} className="mt-1 block text-sm text-cream/75 hover:text-gold">{SITE.email}</a>
                                        {SITE.whatsapp && (
                                            <a href={whatsappHref(SITE.whatsapp)} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-cream/75 hover:text-gold">WhatsApp us</a>
                                        )}
                                        <p className="mt-3 text-sm leading-6 text-cream/60">{SITE.address}</p>
                                    </div>
                                    <div>
                                        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">Your account</p>
                                        {user ? (
                                            <ul className="space-y-2 text-sm">
                                                <li className="text-cream/60">Signed in as {user.name}</li>
                                                {isStaff && <li><Link to={homeForRole(user.role)} className="hover:text-gold">Staff dashboard</Link></li>}
                                                <li><Link to="/bookings" className="hover:text-gold">My bookings</Link></li>
                                                <li><Link to="/profile" className="hover:text-gold">Profile</Link></li>
                                                <li><button type="button" onClick={logout} className="hover:text-gold cursor-pointer">Sign out</button></li>
                                            </ul>
                                        ) : (
                                            <ul className="space-y-2 text-sm">
                                                <li><Link to="/login" className="hover:text-gold">Sign in</Link></li>
                                                <li><Link to="/register" className="hover:text-gold">Create an account</Link></li>
                                                <li><Link to="/bookings" className="hover:text-gold">Find my booking</Link></li>
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <Link to="/book" className="rounded-lg bg-gold py-4 text-center text-[0.75rem] font-bold uppercase tracking-[0.2em] text-ink hover:bg-[#E0BE4F]">
                                    Book your stay
                                </Link>
                            </aside>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};

export default Navbar;
