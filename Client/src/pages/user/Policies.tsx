import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { SITE } from '../../config/site';

// Describes how the system actually behaves. Have the business (and a lawyer)
// review the wording before launch.
const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <section id={id} className="scroll-mt-28 rounded-2xl bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(92,64,51,0.08)] dark:bg-gray-800">
        <h2 className="mb-4 text-2xl text-ink dark:text-cream" style={{ fontFamily: 'Playfair Display, serif' }}>
            {title}
        </h2>
        <div className="space-y-3 text-[0.95rem] leading-7 text-taupe dark:text-gray-300">{children}</div>
    </section>
);

const Policies: React.FC = () => {
    const { hash } = useLocation();

    useEffect(() => {
        if (!hash) {
            window.scrollTo(0, 0);
            return;
        }
        // Wait a tick so layout (and any scroll restoration) has settled
        const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150);
        return () => window.clearTimeout(t);
    }, [hash]);

    return (
        <div className="min-h-screen bg-ivory text-ink font-body dark:bg-night dark:text-cream">
            <Navbar />
            <header className="bg-ink px-6 pb-14 pt-32 text-center text-white">
                <p className="text-xs uppercase tracking-[0.25em] text-gold">Good to know</p>
                <h1 className="mt-3 text-4xl md:text-5xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Booking &amp; Privacy Policies
                </h1>
            </header>

            <main className="mx-auto max-w-3xl space-y-8 px-6 py-14">
                <Section id="booking" title="Booking terms">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>Check-in is from <strong>{SITE.checkInTime}</strong> and check-out is by <strong>{SITE.checkOutTime}</strong>.</li>
                        <li>
                            When you book online, the room is held for <strong>{SITE.bookingHoldMinutes} minutes</strong> while you
                            complete payment. Unpaid bookings are released after that time. You can pay later from{' '}
                            <Link to="/bookings" className="text-bronze underline dark:text-gold">My Bookings</Link> while the room is still available.
                        </li>
                        <li>Your booking is confirmed once payment is received. Prices are per room, per night, and the total is shown before you pay.</li>
                        <li>The number of guests may not exceed the room&apos;s stated maximum occupancy.</li>
                    </ul>
                </Section>

                <Section id="cancellation" title="Cancellations & refunds">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>You can cancel a pending or confirmed booking yourself from My Bookings at any time before your check-in date.</li>
                        <li>On or after the check-in date, please contact the front desk to make changes.</li>
                        <li>If you cancel a paid booking, our team will process your refund to the original payment method.</li>
                    </ul>
                </Section>

                <Section id="payments" title="Payments">
                    <p>
                        Online payments are processed securely by <strong>PayHere</strong>. Card details are entered on PayHere&apos;s
                        payment page and are never sent to or stored on our servers. We only keep the payment reference, the
                        payment method and the last four digits of the card for your receipt.
                    </p>
                </Section>

                <Section id="privacy" title="Privacy">
                    <p>We collect only what we need to manage your stay:</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>Your name, email address and (optionally) phone number and profile photo.</li>
                        <li>Your bookings, payments, reviews and service requests.</li>
                    </ul>
                    <p>
                        This information is used to provide and support your bookings. It is visible only to you and to our
                        authorised staff, and we do not sell it. To update or delete your data, contact us at{' '}
                        <a href={`mailto:${SITE.email}`} className="text-bronze underline dark:text-gold">{SITE.email}</a>.
                    </p>
                </Section>
            </main>
            <Footer />
        </div>
    );
};

export default Policies;
