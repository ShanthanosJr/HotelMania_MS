import { Link } from 'react-router-dom';
import { SITE } from '../config/site';

const QUICK_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'About Us', to: '/about' },
    { label: 'Hotels', to: '/hotels' },
    { label: 'Rooms & Suites', to: '/rooms' },
    { label: 'My Bookings', to: '/bookings' },
    { label: 'Contact', to: '/contact' },
];

const Footer: React.FC = () => {
    return (
        <footer className="bg-ink text-sand py-16 font-body">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12 border-b border-sand/20 pb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-3 mb-6">
                            {/*<div className="w-10 h-10 rounded-full bg-bronze flex items-center justify-center">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 text-ivory"
                                    fill="currentColor"
                                >
                                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z" />
                                </svg>
                            </div>*/}
                            <span
                                className="text-xl font-semibold tracking-[0.08em] text-white"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                HOTELMANIA
                            </span>
                        </div>
                        <p className="text-sm leading-6 text-[#A67C52] mb-6">
                            Experience the pinnacle of luxury and comfort. Your perfect getaway awaits at {SITE.name}.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4
                            className="text-white text-lg font-semibold mb-6 tracking-wide"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Quick Links
                        </h4>
                        <ul className="space-y-4 text-sm">
                            {QUICK_LINKS.map(item => (
                                <li key={item.to}>
                                    <Link to={item.to} className="hover:text-gold transition-colors">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4
                            className="text-white text-lg font-semibold mb-6 tracking-wide"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Contact Us
                        </h4>
                        <ul className="space-y-4 text-sm text-[#A67C52]">
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-bronze mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{SITE.address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`} className="hover:text-gold">{SITE.phone}</a>
                            </li>
                            <li className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href={`mailto:${SITE.email}`} className="hover:text-gold">{SITE.email}</a>
                            </li>
                        </ul>
                    </div>

                    {/* Stay information */}
                    <div>
                        <h4
                            className="text-white text-lg font-semibold mb-6 tracking-wide"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Your Stay
                        </h4>
                        <ul className="space-y-3 text-sm text-[#A67C52]">
                            <li>Check-in from <span className="text-sand">{SITE.checkInTime}</span></li>
                            <li>Check-out by <span className="text-sand">{SITE.checkOutTime}</span></li>
                            <li>Cancel online any time before check-in</li>
                            <li>Secure online payment by PayHere</li>
                            <li>
                                <Link to="/policies" className="underline underline-offset-4 hover:text-gold">
                                    Booking &amp; privacy policies
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between text-xs text-[#A67C52] tracking-wider uppercase">
                    <p>&copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <Link to="/policies#privacy" className="hover:text-gold transition">Privacy Policy</Link>
                        <Link to="/policies#booking" className="hover:text-gold transition">Booking Terms</Link>
                        <Link to="/contact" className="hover:text-gold transition">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
