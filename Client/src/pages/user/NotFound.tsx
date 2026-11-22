import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const NotFound: React.FC = () => (
    <div className="flex min-h-screen flex-col bg-[#FDF8F3] font-[Lato,sans-serif] text-[#2C2416] dark:bg-[#121212] dark:text-[#F5F0E6]">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-36 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[#8B6914] dark:text-[#D4AF37]">Error 404</p>
            <h1 className="mt-3 text-4xl md:text-5xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                This page has checked out
            </h1>
            <p className="mt-4 max-w-md text-[#6B5B4F] dark:text-gray-300">
                The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back to your stay.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                    to="/"
                    className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-transparent hover:text-[#8B6914] dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#2C2416]"
                >
                    Back to home
                </Link>
                <Link
                    to="/rooms"
                    className="rounded border-2 border-[#8B6914] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6914] transition hover:bg-[#8B6914] hover:text-white dark:border-[#D4AF37] dark:text-[#D4AF37]"
                >
                    Browse rooms
                </Link>
            </div>
        </main>
        <Footer />
    </div>
);

export default NotFound;
