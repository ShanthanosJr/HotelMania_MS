import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BsCheckCircleFill, BsClockHistory, BsXCircleFill, BsHourglassSplit, BsCalendarPlus, BsReceipt, BsArrowRight, BsCopy } from 'react-icons/bs';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import { Badge, Button, Card, EmptyState, Skeleton, statusTone, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { payForBooking, outcomeMessage } from '../../utils/payhere';
import { printReceipt } from '../../utils/receipt';
import { SITE } from '../../config/site';
import {
    downloadIcs, formatDate, formatMoney, holdMinutesLeft, hotelOf, nightsBetween, statusLabel, type BookingRecord,
} from '../../utils/booking';

const FALLBACK_PHOTO = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800';

type View = { icon: React.ReactNode; title: string; text: string; tone: string };

const viewFor = (b: BookingRecord, minutesLeft: number | null): View => {
    if (b.status === 'cancelled') {
        return {
            icon: <BsXCircleFill />, tone: 'text-danger', title: 'This booking was cancelled',
            text: b.refund?.status === 'due' ? 'Your refund is being processed. We will email you when it has been sent.'
                : b.refund?.status === 'completed' ? 'Your refund has been sent.' : 'No payment was taken.',
        };
    }
    if (b.paymentStatus === 'paid' || b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'checked_out') {
        return {
            icon: <BsCheckCircleFill />, tone: 'text-success', title: 'Your stay is confirmed',
            text: `We've emailed the details to ${b.guestDetails?.email || b.user?.email || 'you'}. We look forward to welcoming you.`,
        };
    }
    if (minutesLeft === 0) {
        return {
            icon: <BsClockHistory />, tone: 'text-warning', title: 'Your room hold has expired',
            text: 'You can still try to pay. We will check the room is free and hold it again.',
        };
    }
    return {
        icon: <BsHourglassSplit />, tone: 'text-warning', title: 'Almost there: complete your payment',
        text: `Your room is held for ${minutesLeft ?? SITE.bookingHoldMinutes} more minute${minutesLeft === 1 ? '' : 's'}. Pay now to confirm your booking.`,
    };
};

const BookingConfirmation: React.FC = () => {
    const { id } = useParams();
    const [params, setParams] = useSearchParams();
    const [booking, setBooking] = useState<BookingRecord | null>(null);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const [now, setNow] = useState(Date.now());

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/api/bookings/${id}`);
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Booking not found');
            setBooking(body.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load this booking');
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (booking?.confirmationCode) document.title = `Booking ${booking.confirmationCode} | ${SITE.name}`;
    }, [booking?.confirmationCode]);

    // Tick the hold countdown; while a payment is "processing", re-check until PayHere confirms
    const processing = params.get('payment') === 'processing' && booking?.paymentStatus === 'pending';
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!processing) return;
        const timer = window.setInterval(load, 4000);
        return () => window.clearInterval(timer);
    }, [processing, load]);

    // Show the payment outcome once, then drop it from the URL
    const outcomeShown = useRef(false);
    useEffect(() => {
        const outcome = params.get('payment');
        if (outcome === 'dismissed' && !outcomeShown.current) {
            outcomeShown.current = true;
            toast.info('Payment was not completed. Your room is still held for now.');
            const next = new URLSearchParams(params);
            next.delete('payment');
            setParams(next, { replace: true });
        }
    }, [params, setParams]);

    const pay = async () => {
        if (!booking) return;
        setPaying(true);
        try {
            const outcome = await payForBooking(booking._id);
            toast[outcome === 'dismissed' ? 'warning' : 'success'](outcomeMessage(outcome));
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not start payment');
        } finally {
            setPaying(false);
        }
    };

    const copyCode = async () => {
        if (!booking?.confirmationCode) return;
        try {
            await navigator.clipboard.writeText(booking.confirmationCode);
            toast.success('Confirmation code copied');
        } catch { /* clipboard blocked */ }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night font-body">
                <Navbar />
                <PageHero title="Booking" />
                <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-14">
                    <Card><EmptyState title="We couldn't find this booking" description={error} action={<Link to="/bookings"><Button>Go to my bookings</Button></Link>} /></Card>
                </main>
                <Footer />
            </div>
        );
    }

    const minutesLeft = booking ? holdMinutesLeft(booking, now) : null;
    const view = booking ? (processing
        ? { icon: <BsHourglassSplit />, tone: 'text-info', title: 'Confirming your payment…', text: 'PayHere has received your payment. This page updates automatically in a few seconds.' }
        : viewFor(booking, minutesLeft)) : null;
    const hotel = booking ? hotelOf(booking) : undefined;
    const nights = booking ? nightsBetween(booking.checkInDate, booking.checkOutDate) : 0;
    const p = booking?.pricing;
    const currency = p?.currency;
    const canPay = booking && booking.status === 'pending' && booking.paymentStatus === 'pending' && !processing;

    return (
        <div className="min-h-screen bg-ivory text-ink dark:bg-night dark:text-cream font-body">
            <Navbar />
            <PageHero eyebrow={booking?.confirmationCode ? `Booking ${booking.confirmationCode}` : 'Your booking'} title={view?.title || 'Loading your booking…'} />

            <main className="mx-auto max-w-[1000px] px-4 sm:px-6 py-10 sm:py-14">
                {!booking || !view ? (
                    <Card><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-4 h-4 w-3/4" /><Skeleton className="mt-8 h-40 w-full" /></Card>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">
                        <div className="space-y-6">
                            <Card>
                                <div className="flex items-start gap-4">
                                    <span className={`text-3xl ${view.tone}`} aria-hidden="true">{view.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-sm leading-6 text-umber dark:text-gray-300" role="status">{view.text}</p>
                                        {canPay && (
                                            <Button className="mt-5" size="lg" loading={paying} onClick={pay}>
                                                Pay {formatMoney(booking.totalPrice, currency)} now
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.18em] text-taupe dark:text-gray-400">Confirmation code</p>
                                        <button type="button" onClick={copyCode} className="mt-1 inline-flex items-center gap-2 font-mono text-2xl font-semibold tracking-wider text-ink hover:text-bronze dark:text-cream dark:hover:text-gold cursor-pointer" aria-label="Copy confirmation code">
                                            {booking.confirmationCode || '—'} <BsCopy className="text-base opacity-60" />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
                                        <Badge tone={statusTone(booking.paymentStatus)}>{statusLabel(booking.paymentStatus)}</Badge>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-6 sm:grid-cols-[180px_1fr]">
                                    <img src={booking.room?.type?.photos?.[0] || hotel?.photos?.[0] || FALLBACK_PHOTO}
                                        alt="" className="h-36 w-full rounded-xl object-cover bg-stone dark:bg-graphite"
                                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_PHOTO; }} />
                                    <div>
                                        <h2 className="font-display text-2xl font-semibold">{booking.room?.type?.name || 'Room'}</h2>
                                        {hotel && <p className="text-sm text-taupe dark:text-gray-400">{hotel.name}{hotel.address ? ` · ${hotel.address}` : ''}</p>}
                                        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                            <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Check-in</dt><dd className="font-semibold">{formatDate(booking.checkInDate)}</dd><dd className="text-xs text-taupe">from {SITE.checkInTime}</dd></div>
                                            <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Check-out</dt><dd className="font-semibold">{formatDate(booking.checkOutDate)}</dd><dd className="text-xs text-taupe">by {SITE.checkOutTime}</dd></div>
                                            <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Stay</dt><dd className="font-semibold">{nights} night{nights === 1 ? '' : 's'} · {booking.guests || 1} guest{(booking.guests || 1) === 1 ? '' : 's'}</dd></div>
                                        </dl>
                                    </div>
                                </div>

                                {booking.guestDetails && (
                                    <dl className="mt-6 grid gap-4 border-t border-stone pt-6 text-sm sm:grid-cols-2 dark:border-graphite">
                                        <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Guest</dt><dd className="font-semibold">{booking.guestDetails.name}</dd><dd className="text-taupe dark:text-gray-400">{booking.guestDetails.email}{booking.guestDetails.phone ? ` · ${booking.guestDetails.phone}` : ''}</dd></div>
                                        <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Arrival</dt><dd>{booking.guestDetails.arrivalTime || 'Not specified'}</dd></div>
                                        {booking.guestDetails.specialRequests && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Special requests</dt><dd className="whitespace-pre-line">{booking.guestDetails.specialRequests}</dd></div>}
                                    </dl>
                                )}
                            </Card>
                        </div>

                        <aside className="space-y-6">
                            <Card>
                                <h3 className="font-display text-lg font-semibold">Payment summary</h3>
                                <dl className="mt-4 space-y-2 text-sm">
                                    {p && p.subtotal !== undefined ? (
                                        <>
                                            <div className="flex justify-between text-taupe dark:text-gray-300"><dt>{formatMoney(p.nightlyRate, currency)} × {p.nights} night{p.nights === 1 ? '' : 's'}</dt><dd>{formatMoney(p.subtotal, currency)}</dd></div>
                                            {p.serviceCharge > 0 && <div className="flex justify-between text-taupe dark:text-gray-300"><dt>Service charge ({p.serviceChargePercent}%)</dt><dd>{formatMoney(p.serviceCharge, currency)}</dd></div>}
                                            {p.tax > 0 && <div className="flex justify-between text-taupe dark:text-gray-300"><dt>Taxes ({p.taxPercent}%)</dt><dd>{formatMoney(p.tax, currency)}</dd></div>}
                                        </>
                                    ) : null}
                                    <div className="flex justify-between border-t border-stone pt-3 text-base font-semibold dark:border-graphite"><dt>Total</dt><dd>{formatMoney(booking.totalPrice, currency)}</dd></div>
                                    {booking.refund?.status && (
                                        <div className="flex justify-between text-info"><dt>Refund {booking.refund.status === 'due' ? '(processing)' : '(sent)'}</dt><dd>{formatMoney(booking.refund.amount, currency)}</dd></div>
                                    )}
                                </dl>
                            </Card>

                            <Card className="space-y-3">
                                <Button variant="secondary" fullWidth leftIcon={<BsCalendarPlus />} onClick={() => downloadIcs(booking, SITE.name)}>Add to calendar</Button>
                                <Button variant="secondary" fullWidth leftIcon={<BsReceipt />} onClick={() => printReceipt(booking, booking.guestDetails?.name)}>Receipt</Button>
                                <Link to="/bookings" className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-bronze hover:underline dark:text-gold">
                                    All my bookings <BsArrowRight />
                                </Link>
                            </Card>

                            <p className="text-center text-xs leading-5 text-taupe dark:text-gray-400">
                                Need help? Call <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`} className="underline">{SITE.phone}</a> and quote your confirmation code.
                            </p>
                        </aside>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default BookingConfirmation;
