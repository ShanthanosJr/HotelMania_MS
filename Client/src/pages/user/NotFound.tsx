import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const NotFound: React.FC = () => (
    <div className="flex min-h-screen flex-col bg-ivory font-body text-ink dark:bg-night dark:text-cream">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-36 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-bronze dark:text-gold">Error 404</p>
            <h1 className="mt-3 text-4xl md:text-5xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                This page has checked out
            </h1>
            <p className="mt-4 max-w-md text-taupe dark:text-gray-300">
                The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back to your stay.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                    to="/"
                    className="rounded border-2 border-bronze bg-bronze px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-transparent hover:text-bronze dark:border-gold dark:bg-gold dark:text-ink"
                >
                    Back to home
                </Link>
                <Link
                    to="/rooms"
                    className="rounded border-2 border-bronze px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-bronze transition hover:bg-bronze hover:text-white dark:border-gold dark:text-gold"
                >
                    Browse rooms
                </Link>
            </div>
        </main>
        <Footer />
    </div>
);

export default NotFound;
