import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE, directionsUrl, telHref, whatsappHref } from '../config/site';
import { api } from '../utils/api';
import MobileBookBar from './site/MobileBookBar';

const COLUMNS = [
    {
        title: 'Stay',
        links: [
            { label: 'Rooms & Suites', to: '/rooms' },
            { label: 'Our Hotels', to: '/hotels' },
            { label: 'Offers', to: '/offers' },
            { label: 'Book your stay', to: '/book' },
        ],
    },
    {
        title: 'Experience',
        links: [
            { label: 'Dining', to: '/dining' },
            { label: 'Spa & Wellness', to: '/spa' },
            { label: 'Gallery', to: '/gallery' },
            { label: 'Our Story', to: '/about' },
        ],
    },
    {
        title: 'Help',
        links: [
            { label: 'Contact us', to: '/contact' },
            { label: 'FAQ', to: '/faq' },
            { label: 'My bookings', to: '/bookings' },
            { label: 'Policies', to: '/policies' },
        ],
    },
];

const Newsletter: React.FC = () => {
    const [email, setEmail] = useState('');
    const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setState('error');
            setMessage('Please enter a valid email address.');
            return;
        }
        setState('sending');
        try {
            const res = await api.post('/api/enquiries/newsletter', { email, source: 'footer' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Could not sign you up. Please try again.');
            setState('done');
            setMessage('Thank you. Look out for our next letter from Colombo.');
            setEmail('');
        } catch (err) {
            setState('error');
            setMessage(err instanceof Error ? err.message : 'Could not sign you up.');
        }
    };

    return (
        <form onSubmit={submit} noValidate className="w-full max-w-md">
            <label htmlFor="newsletter-email" className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">
                Letters from Colombo
            </label>
            <p className="mb-4 text-sm leading-6 text-cream/70">Seasonal offers and stories, a few times a year. No spam.</p>
            <div className="flex gap-2">
                <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Your email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
                    aria-invalid={state === 'error' || undefined}
                    aria-describedby="newsletter-msg"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
                <button type="submit" disabled={state === 'sending'}
                    className="rounded-lg bg-gold px-5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-[#E0BE4F] disabled:opacity-60 cursor-pointer">
                    {state === 'sending' ? '…' : 'Join'}
                </button>
            </div>
            <p id="newsletter-msg" role="status" className={`mt-2 min-h-5 text-xs ${state === 'error' ? 'text-red-300' : 'text-cream/70'}`}>
                {state === 'done' || state === 'error' ? message : ''}
            </p>
        </form>
    );
};

const Footer: React.FC = () => {
    const socials = Object.entries(SITE.social).filter(([, url]) => url);
    return (
        <>
            <footer className="bg-ink pb-28 pt-16 font-body text-cream lg:pb-10 dark:bg-black">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.3fr_2fr]">
                        <div className="space-y-8">
                            <div>
                                <Link to="/" className="font-display text-2xl font-semibold tracking-[0.14em] text-white">HOTELMANIA</Link>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-cream/70">{SITE.tagline} Ocean-facing rooms in the heart of Colombo, a short walk from Galle Face Green.</p>
                            </div>
                            <Newsletter />
                        </div>
                        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                            {COLUMNS.map(col => (
                                <nav key={col.title} aria-label={col.title}>
                                    <h2 className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">{col.title}</h2>
                                    <ul className="space-y-3 text-sm">
                                        {col.links.map(l => (
                                            <li key={l.to}><Link to={l.to} className="text-cream/80 transition-colors hover:text-gold">{l.label}</Link></li>
                                        ))}
                                    </ul>
                                </nav>
                            ))}
                            <div>
                                <h2 className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">Visit</h2>
                                <address className="space-y-3 text-sm not-italic text-cream/80">
                                    <a href={directionsUrl(SITE.address)} target="_blank" rel="noreferrer" className="block leading-6 hover:text-gold">{SITE.address}</a>
                                    <a href={telHref(SITE.phone)} className="block hover:text-gold">{SITE.phone}</a>
                                    <a href={`mailto:${SITE.email}`} className="block break-all hover:text-gold">{SITE.email}</a>
                                    {SITE.whatsapp && <a href={whatsappHref(SITE.whatsapp)} target="_blank" rel="noreferrer" className="block hover:text-gold">WhatsApp</a>}
                                </address>
                                <p className="mt-4 text-xs leading-5 text-cream/55">
                                    Check-in from {SITE.checkInTime}<br />Check-out by {SITE.checkOutTime}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-8 text-xs text-cream/55 md:flex-row md:items-center md:justify-between">
                        <p>&copy; {new Date().getFullYear()} {SITE.name}. Secure payments by PayHere.</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 uppercase tracking-[0.14em]">
                            {socials.map(([name, url]) => (
                                <a key={name} href={url} target="_blank" rel="noreferrer" className="capitalize hover:text-gold">{name}</a>
                            ))}
                            <Link to="/policies#privacy" className="hover:text-gold">Privacy</Link>
                            <Link to="/policies#booking" className="hover:text-gold">Booking terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
            <MobileBookBar />
        </>
    );
};

export default Footer;
