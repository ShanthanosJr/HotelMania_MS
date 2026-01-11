import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { BsSun, BsMoonStars } from 'react-icons/bs';

type User = {
    name?: string;
    email?: string;
    [key: string]: unknown;
};

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const { theme, toggleTheme } = useTheme();

    const location = useLocation();
    const navigate = useNavigate();

    // scroll shadow
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // close mobile menu when route changes
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // auth state from storage (same idea as original)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                setUser(null);
            }
        } else {
            setUser(null);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    const navLinks: { label: string; path: string }[] = [
        { label: 'Home', path: '/' },
        { label: 'About', path: '/about' },
        { label: 'Rooms', path: '/rooms' },
        { label: 'Hotels', path: '/hotels' },
        { label: 'Bookings', path: '/bookings' },
        { label: 'Contact', path: '/contact' },
    ];

    const isActive = (path: string) => {
        // support hashes like /#about in future
        if (path.includes('#')) {
            const base = path.split('#')[0] || '/';
            return location.pathname === base;
        }
        return location.pathname === path;
    };

    const handleNavClick = (path: string) => {
        if (path.includes('#')) {
            const [base, hash] = path.split('#');
            if (base && base !== location.pathname) {
                navigate(base);
                // you can add a scroll effect in a layout-level useEffect if needed
            } else if (hash) {
                const el = document.getElementById(hash);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            navigate(path);
        }
    };

    const profileLabel = user?.name ? user.name.split(' ')[0] : 'Profile';

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all ${isScrolled ? 'bg-[#FDF8F3] shadow-md py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
                {/* Logo */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    {/*<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B6914]">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6 text-[#FDF8F3]"
                            fill="currentColor"
                        >
                            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z" />
                        </svg>
                    </div>*/}
                    <span
                        className={`text-xl font-semibold tracking-[0.08em] ${isScrolled ? 'text-[#5C4033]' : 'text-white'
                            }`}
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        HOTELMANIA
                    </span>
                </div>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-9 text-[1rem] uppercase tracking-[0.18em] md:flex">
                    {navLinks.map(link => (
                        <button
                            key={link.path}
                            type="button"
                            onClick={() => handleNavClick(link.path)}
                            className={`relative pb-1 group cursor-pointer transition-all hover:text-[#8B6914] ${isScrolled ? 'text-[#2C2416]' : 'text-white'
                                } ${isActive(link.path) ? 'font-semibold' : 'font-medium'}`}
                        >
                            <span>{link.label}</span>
                            <span
                                className={`absolute left-0 -bottom-0.5 h-[2px] bg-[#A67C52] transition-all ${isActive(link.path) ? 'w-full' : 'w-0 group-hover:w-full'
                                    }`}
                            />
                        </button>
                    ))}
                </nav>

                {/* Right actions */}
                <div className="hidden items-center gap-4 md:flex">
                    {/* Dark mode toggle button */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full border border-[#D4C4A8] text-[#8B6914] transition-all cursor-pointer hover:bg-[#F5F0E6] hover:scale-110 active:scale-95 dark:border-gray-600 dark:text-yellow-400 dark:hover:bg-gray-800"
                        aria-label="Toggle Dark Mode"
                    >
                        {theme === 'light' ? <BsMoonStars size={18} /> : <BsSun size={18} />}
                    </button>
                    {user ? (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="rounded-full border border-[#D4C4A8] bg-[#F5F0E6] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#5C4033] cursor-pointer transition-all hover:bg-white hover:border-[#8B6914] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {profileLabel}
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white cursor-pointer transition-all hover:bg-transparent hover:text-[#8B6914] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white cursor-pointer transition-all hover:bg-transparent hover:text-[#8B6914] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Sign In
                        </button>
                    )}
                </div>

                {/* Mobile menu toggle */}
                <button
                    type="button"
                    onClick={() => setMenuOpen(prev => !prev)}
                    className="flex flex-col gap-1.5 p-2 md:hidden cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                >
                    <span
                        className={`h-[2px] w-6 rounded-full transition-all ${isScrolled ? 'bg-[#5C4033]' : 'bg-white'
                            } ${menuOpen ? 'translate-y-[5px] rotate-45' : ''}`}
                    />
                    <span
                        className={`h-[2px] w-6 rounded-full transition-all ${isScrolled ? 'bg-[#5C4033]' : 'bg-white'
                            } ${menuOpen ? 'opacity-0' : ''}`}
                    />
                    <span
                        className={`h-[2px] w-6 rounded-full transition-all ${isScrolled ? 'bg-[#5C4033]' : 'bg-white'
                            } ${menuOpen ? '-translate-y-[5px] -rotate-45' : ''}`}
                    />
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="mt-2 border-t border-[#E8DCC8] bg-[#FDF8F3]/95 shadow-md md:hidden">
                    <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-4 text-[0.8rem] uppercase tracking-[0.16em] text-[#2C2416]">
                        {navLinks.map(link => (
                            <button
                                key={link.path}
                                type="button"
                                onClick={() => handleNavClick(link.path)}
                                className={`py-1 text-left cursor-pointer transition-all hover:pl-2 ${isActive(link.path) ? 'font-semibold text-[#8B6914]' : 'font-medium hover:text-[#8B6914]'
                                    }`}
                            >
                                {link.label}
                            </button>
                        ))}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {user ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/profile')}
                                        className="rounded-full border border-[#D4C4A8] bg-[#F5F0E6] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#5C4033] cursor-pointer active:scale-95 transition-transform"
                                    >
                                        {profileLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white cursor-pointer active:scale-95 transition-transform"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white cursor-pointer active:scale-95 transition-transform"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
