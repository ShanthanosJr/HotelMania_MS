import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BsArrowLeft, BsCheck2, BsPeople, BsArrowsFullscreen, BsDoorOpen, BsEye, BsShieldCheck, BsClock, BsCalendar3 } from 'react-icons/bs';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, Stepper, Textarea, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { getStoredUser, loginUrl } from '../../utils/auth';
import { payForBooking } from '../../utils/payhere';
import { SITE } from '../../config/site';
import {
    addDays, formatDate, formatMoney, todayInput,
    type AvailabilityResponse, type AvailabilityRow, type GuestDetails, type HotelSummary, type PriceQuote,
} from '../../utils/booking';

type Step = 'stay' | 'details' | 'review';
const STEPS: { id: Step; label: string }[] = [
    { id: 'stay', label: 'Choose your room' },
    { id: 'details', label: 'Your details' },
    { id: 'review', label: 'Review & pay' },
];

const DRAFT_KEY = 'hm:booking-guest-details';
const ARRIVAL_TIMES = ['', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', 'After midnight'];
const FALLBACK_PHOTO = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200';

const loadDraft = (): GuestDetails => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; }
};

/* ---------------- Small pieces ---------------- */

const ProgressSteps: React.FC<{ current: Step }> = ({ current }) => {
    const index = STEPS.findIndex(s => s.id === current);
    return (
        <ol className="flex items-center gap-2 sm:gap-4" aria-label="Booking progress">
            {STEPS.map((s, i) => {
                const done = i < index;
                const active = i === index;
                return (
                    <li key={s.id} className="flex items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                            done ? 'border-gold bg-gold text-ink' : active ? 'border-gold text-gold' : 'border-white/30 text-white/50'
                        }`}>
                            {done ? <BsCheck2 /> : i + 1}
                        </span>
                        <span className={`hidden sm:inline text-xs font-semibold uppercase tracking-[0.16em] ${active ? 'text-white' : 'text-white/55'}`}>{s.label}</span>
                        {i < STEPS.length - 1 && <span className="h-px w-6 sm:w-10 bg-white/25" aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
};

const PriceBreakdown: React.FC<{ quote: PriceQuote; compact?: boolean }> = ({ quote, compact }) => (
    <dl className={`space-y-2 text-sm ${compact ? '' : 'pt-1'}`}>
        <div className="flex justify-between gap-4 text-taupe dark:text-gray-300">
            <dt>{formatMoney(quote.nightlyRate, quote.currency)} × {quote.nights} night{quote.nights === 1 ? '' : 's'}</dt>
            <dd>{formatMoney(quote.subtotal, quote.currency)}</dd>
        </div>
        {quote.serviceCharge > 0 && (
            <div className="flex justify-between gap-4 text-taupe dark:text-gray-300">
                <dt>Service charge ({quote.serviceChargePercent}%)</dt>
                <dd>{formatMoney(quote.serviceCharge, quote.currency)}</dd>
            </div>
        )}
        {quote.tax > 0 && (
            <div className="flex justify-between gap-4 text-taupe dark:text-gray-300">
                <dt>Taxes ({quote.taxPercent}%)</dt>
                <dd>{formatMoney(quote.tax, quote.currency)}</dd>
            </div>
        )}
        <div className="flex justify-between gap-4 border-t border-stone pt-3 text-base font-semibold text-ink dark:border-graphite dark:text-cream">
            <dt>Total</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
        </div>
        {quote.serviceCharge === 0 && quote.tax === 0 && (
            <p className="text-xs text-taupe dark:text-gray-400">No extra charges. The total is what you pay.</p>
        )}
    </dl>
);

const Specs: React.FC<{ row: AvailabilityRow }> = ({ row }) => {
    const t = row.roomType;
    const items = [
        { icon: <BsPeople />, text: `Up to ${t.maxOccupancy} guest${t.maxOccupancy === 1 ? '' : 's'}` },
        t.size ? { icon: <BsArrowsFullscreen />, text: `${t.size} m²` } : null,
        t.bedType ? { icon: <BsDoorOpen />, text: t.bedType } : null,
        t.view ? { icon: <BsEye />, text: t.view } : null,
    ].filter(Boolean) as { icon: React.ReactNode; text: string }[];
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-taupe dark:text-gray-400">
            {items.map(i => (
                <li key={i.text} className="flex items-center gap-1.5"><span className="text-bronze dark:text-gold">{i.icon}</span>{i.text}</li>
            ))}
        </ul>
    );
};

const RoomResult: React.FC<{ row: AvailabilityRow; guests: number; selected: boolean; onSelect: () => void }> = ({ row, guests, selected, onSelect }) => {
    const t = row.roomType;
    const hotel = typeof t.hotel === 'object' ? t.hotel : undefined;
    const soldOut = row.available === 0;
    const tooSmall = !row.fitsGuests;
    const disabled = soldOut || tooSmall || !row.quote;
    return (
        <Card padded={false} className={`overflow-hidden transition-shadow ${selected ? 'ring-2 ring-gold' : ''} ${disabled ? 'opacity-70' : 'hover:shadow-md'}`}>
            <div className="grid sm:grid-cols-[240px_1fr]">
                <div className="relative h-48 sm:h-full min-h-[180px] bg-stone">
                    <img src={t.photos?.[0] || FALLBACK_PHOTO} alt={t.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover"
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_PHOTO; }} />
                </div>
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            {hotel && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-bronze dark:text-gold">{hotel.name}</p>}
                            <h3 className="font-display text-xl font-semibold text-ink dark:text-cream">{t.name}</h3>
                        </div>
                        {soldOut ? <Badge tone="danger">Sold out</Badge>
                            : tooSmall ? <Badge tone="warning">Max {t.maxOccupancy} guests</Badge>
                                : row.available <= 3 ? <Badge tone="warning">Only {row.available} left</Badge>
                                    : <Badge tone="success">Available</Badge>}
                    </div>
                    <Specs row={row} />
                    {t.description && <p className="text-sm leading-6 text-taupe dark:text-gray-300 line-clamp-2">{t.description}</p>}
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-stone pt-4 dark:border-graphite">
                        {row.quote ? (
                            <div>
                                <p className="text-2xl font-semibold text-ink dark:text-cream">
                                    {formatMoney(row.quote.nightlyRate, row.quote.currency)}
                                    <span className="ml-1 text-sm font-normal text-taupe dark:text-gray-400">/ night</span>
                                </p>
                                <p className="text-xs text-taupe dark:text-gray-400">
                                    {formatMoney(row.quote.total, row.quote.currency)} total for {row.quote.nights} night{row.quote.nights === 1 ? '' : 's'}
                                    {(row.quote.serviceCharge > 0 || row.quote.tax > 0) ? ' incl. charges' : ''}
                                </p>
                            </div>
                        ) : <span className="text-sm text-taupe">Price on request</span>}
                        <Button onClick={onSelect} disabled={disabled} aria-label={`Select ${t.name}`}>
                            {soldOut ? 'Sold out' : tooSmall ? `Not for ${guests} guests` : selected ? 'Selected' : 'Select'}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

/* ---------------- Page ---------------- */

const Book: React.FC = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const user = getStoredUser();

    const today = todayInput();
    const checkIn = params.get('in') && params.get('in')! >= today ? params.get('in')! : today;
    const checkOut = params.get('out') && params.get('out')! > checkIn ? params.get('out')! : addDays(checkIn, 1);
    const guests = Math.min(10, Math.max(1, parseInt(params.get('guests') || '2', 10) || 2));
    const hotelId = params.get('hotel') || '';
    const typeId = params.get('type') || '';
    const step: Step = (['stay', 'details', 'review'] as Step[]).includes(params.get('step') as Step) && typeId
        ? (params.get('step') as Step)
        : 'stay';

    const update = useCallback((patch: Record<string, string | number | null>, push = false) => {
        const next = new URLSearchParams(params);
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '') next.delete(k);
            else next.set(k, String(v));
        }
        setParams(next, { replace: !push });
    }, [params, setParams]);

    const [hotels, setHotels] = useState<HotelSummary[]>([]);
    const [data, setData] = useState<AvailabilityResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/hotels').then(r => r.json()).then(d => setHotels(d.data || [])).catch(() => undefined);
    }, []);

    const loadAvailability = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const qs = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
            if (hotelId) qs.set('hotel', hotelId);
            const res = await api.get(`/api/availability?${qs}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not check availability');
            setData(body.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not check availability');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [checkIn, checkOut, guests, hotelId]);

    useEffect(() => { loadAvailability(); }, [loadAvailability]);

    // Bookable first, then by price
    const rows = useMemo(() => {
        if (!data) return [];
        const score = (r: AvailabilityRow) => (r.available > 0 && r.fitsGuests && r.quote ? 0 : 1);
        return [...data.results].sort((a, b) => score(a) - score(b) || (a.quote?.total ?? 0) - (b.quote?.total ?? 0));
    }, [data]);

    const selected = rows.find(r => r.roomType._id === typeId) || null;
    const selectedBookable = !!selected && selected.available > 0 && selected.fitsGuests && !!selected.quote;
    const selectedHotel = selected && typeof selected.roomType.hotel === 'object' ? selected.roomType.hotel : undefined;

    // If the chosen room stopped being bookable (dates changed, sold out), send the guest back to choose again
    useEffect(() => {
        if (!loading && data && typeId && step !== 'stay' && !selectedBookable) {
            toast.warning('That room is no longer available for your dates. Please choose another.');
            update({ step: null });
        }
    }, [loading, data, typeId, step, selectedBookable, update]);

    // ----- Guest details -----
    const [details, setDetails] = useState<GuestDetails>(() => {
        const draft = loadDraft();
        return {
            name: draft.name || user?.name || '',
            email: draft.email || user?.email || '',
            phone: draft.phone || (typeof user?.phone === 'string' ? user.phone : '') || '',
            arrivalTime: draft.arrivalTime || '',
            specialRequests: draft.specialRequests || '',
        };
    });
    const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(details)); } catch { /* ignore */ }
    }, [details]);

    const validateDetails = () => {
        const e: Record<string, string> = {};
        if (!details.name?.trim()) e.name = 'Please enter the name for the reservation';
        if (!details.email?.trim() || !/^\S+@\S+\.\S+$/.test(details.email)) e.email = 'Please enter a valid email address';
        if (details.phone && !/^[+\d][\d\s()-]{6,}$/.test(details.phone.trim())) e.phone = 'Please enter a valid phone number';
        setDetailErrors(e);
        return Object.keys(e).length === 0;
    };

    // ----- Submit -----
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const confirmAndPay = async () => {
        if (!selected || !agreed) return;
        setSubmitting(true);
        try {
            const res = await api.post('/api/bookings', {
                roomType: selected.roomType._id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                guests,
                guestDetails: details,
            });
            const body = await res.json().catch(() => ({}));
            if (res.status === 401) {
                navigate(loginUrl());
                return;
            }
            if (!res.ok) {
                if (res.status === 409) {
                    toast.error(body.message || 'Sorry, that room was just booked. Please choose another.');
                    update({ step: null });
                    loadAvailability();
                    return;
                }
                throw new Error(body.message || 'Could not create your booking');
            }
            const bookingId: string = body.data._id;
            try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

            let outcome = 'dismissed';
            try {
                outcome = await payForBooking(bookingId);
            } catch (payErr) {
                toast.warning(`${payErr instanceof Error ? payErr.message : 'Payment could not start'}. Your room is held, so you can pay from the next page.`);
            }
            navigate(`/booking/${bookingId}?payment=${outcome}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not create your booking');
        } finally {
            setSubmitting(false);
        }
    };

    const goTo = (s: Step) => {
        update({ step: s === 'stay' ? null : s }, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ---------------- Render ---------------- */

    const summary = selected && selected.quote && (
        <Card className="lg:sticky lg:top-28">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-bronze dark:text-gold">Your stay</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{selected.roomType.name}</h2>
            {selectedHotel && <p className="text-sm text-taupe dark:text-gray-400">{selectedHotel.name}{selectedHotel.address ? ` · ${selectedHotel.address}` : ''}</p>}
            <dl className="my-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Check-in</dt><dd className="font-semibold">{formatDate(checkIn)}</dd><dd className="text-xs text-taupe">from {SITE.checkInTime}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Check-out</dt><dd className="font-semibold">{formatDate(checkOut)}</dd><dd className="text-xs text-taupe">by {SITE.checkOutTime}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Guests</dt><dd className="font-semibold">{guests}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Nights</dt><dd className="font-semibold">{selected.quote.nights}</dd></div>
            </dl>
            <PriceBreakdown quote={selected.quote} />
        </Card>
    );

    return (
        <div className="min-h-screen bg-ivory text-ink dark:bg-night dark:text-cream font-body">
            <Navbar />
            <PageHero eyebrow="Book direct · Best rate guaranteed" title="Plan your stay">
                <div className="mt-8"><ProgressSteps current={step} /></div>
            </PageHero>

            <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10 sm:py-14">
                {step === 'stay' && (
                    <>
                        {/* Search bar */}
                        <Card className="mb-8">
                            <form
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] items-end"
                                onSubmit={e => { e.preventDefault(); loadAvailability(); }}
                            >
                                <Input
                                    label="Check-in" type="date" min={today} value={checkIn}
                                    onChange={e => {
                                        const v = e.target.value;
                                        if (!v) return;
                                        update({ in: v, out: checkOut > v ? checkOut : addDays(v, 1) });
                                    }}
                                />
                                <Input
                                    label="Check-out" type="date" min={addDays(checkIn, 1)} value={checkOut}
                                    onChange={e => e.target.value && update({ out: e.target.value })}
                                />
                                <Stepper label="Guests" unit="guests" value={guests} min={1} max={10} onChange={v => update({ guests: v })} />
                                {hotels.length > 1 ? (
                                    <Select label="Hotel" value={hotelId} onChange={e => update({ hotel: e.target.value || null })}>
                                        <option value="">All hotels</option>
                                        {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                                    </Select>
                                ) : <div className="hidden lg:block" />}
                            </form>
                            {data && (
                                <p className="mt-4 flex items-center gap-2 text-sm text-taupe dark:text-gray-400">
                                    <BsCalendar3 className="text-bronze dark:text-gold" />
                                    {data.nights} night{data.nights === 1 ? '' : 's'} · {formatDate(checkIn, { day: 'numeric', month: 'short' })} – {formatDate(checkOut, { day: 'numeric', month: 'short', year: 'numeric' })} · {guests} guest{guests === 1 ? '' : 's'}
                                </p>
                            )}
                        </Card>

                        {/* Results */}
                        <section aria-labelledby="results-title" aria-busy={loading}>
                            <h2 id="results-title" className="sr-only">Available rooms</h2>
                            {loading ? (
                                <div className="space-y-5">
                                    {[0, 1, 2].map(i => (
                                        <Card key={i} padded={false} className="grid sm:grid-cols-[240px_1fr] overflow-hidden">
                                            <Skeleton className="h-48 sm:h-full rounded-none" />
                                            <div className="space-y-3 p-6"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-1/3 mt-6" /></div>
                                        </Card>
                                    ))}
                                </div>
                            ) : error ? (
                                <Card><EmptyState title="We couldn't check availability" description={error} action={<Button onClick={loadAvailability}>Try again</Button>} /></Card>
                            ) : rows.length === 0 ? (
                                <Card><EmptyState title="No rooms found" description="Try different dates or another hotel." /></Card>
                            ) : (
                                <div className="space-y-5">
                                    {rows.every(r => r.available === 0 || !r.fitsGuests) && (
                                        <p role="status" className="rounded-lg border border-warning/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                                            Nothing is free for these dates and party size. Try moving your dates, or contact us on {SITE.phone} and we'll help.
                                        </p>
                                    )}
                                    {rows.map(row => (
                                        <RoomResult
                                            key={row.roomType._id}
                                            row={row}
                                            guests={guests}
                                            selected={row.roomType._id === typeId}
                                            onSelect={() => { update({ type: row.roomType._id, step: 'details' }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {step !== 'stay' && (
                    <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
                        <div className="order-2 lg:order-1">
                            <button
                                type="button"
                                onClick={() => goTo(step === 'review' ? 'details' : 'stay')}
                                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-bronze hover:underline dark:text-gold cursor-pointer"
                            >
                                <BsArrowLeft /> {step === 'review' ? 'Edit your details' : 'Change room or dates'}
                            </button>

                            {step === 'details' && (
                                !user ? (
                                    <Card>
                                        <h2 className="font-display text-2xl font-semibold">Sign in to continue</h2>
                                        <p className="mt-2 text-sm leading-6 text-taupe dark:text-gray-300">
                                            Sign in or create a free account so you can manage, pay for or cancel this booking later.
                                            Your room and dates are saved and you'll come straight back here.
                                        </p>
                                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                            <Button onClick={() => navigate(loginUrl())}>Sign in</Button>
                                            <Button variant="secondary" onClick={() => navigate(`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
                                                Create an account
                                            </Button>
                                        </div>
                                    </Card>
                                ) : (
                                    <Card>
                                        <h2 className="font-display text-2xl font-semibold">Who's staying?</h2>
                                        <p className="mt-1 text-sm text-taupe dark:text-gray-400">We'll send the confirmation to this email.</p>
                                        <form
                                            className="mt-6 grid gap-5 sm:grid-cols-2"
                                            onSubmit={e => { e.preventDefault(); if (validateDetails()) goTo('review'); }}
                                            noValidate
                                        >
                                            <Input label="Full name" required autoComplete="name" value={details.name} error={detailErrors.name}
                                                onChange={e => setDetails(d => ({ ...d, name: e.target.value }))} containerClassName="sm:col-span-2" />
                                            <Input label="Email" type="email" required autoComplete="email" value={details.email} error={detailErrors.email}
                                                onChange={e => setDetails(d => ({ ...d, email: e.target.value }))} />
                                            <Input label="Phone" type="tel" autoComplete="tel" placeholder="+94 77 123 4567" value={details.phone} error={detailErrors.phone}
                                                hint="In case we need to reach you about your stay" onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} />
                                            <Select label="Estimated arrival" value={details.arrivalTime} onChange={e => setDetails(d => ({ ...d, arrivalTime: e.target.value }))}
                                                hint={`Check-in starts at ${SITE.checkInTime}`}>
                                                {ARRIVAL_TIMES.map(t => <option key={t} value={t}>{t || "I don't know yet"}</option>)}
                                            </Select>
                                            <div className="hidden sm:block" />
                                            <Textarea label="Special requests" rows={3} maxLength={1000} containerClassName="sm:col-span-2"
                                                placeholder="Celebrating something? Need a cot, a quiet room or airport pickup? Let us know."
                                                hint="Requests depend on availability, but we always try." value={details.specialRequests}
                                                onChange={e => setDetails(d => ({ ...d, specialRequests: e.target.value }))} />
                                            <div className="sm:col-span-2 flex justify-end">
                                                <Button type="submit" size="lg">Continue to review</Button>
                                            </div>
                                        </form>
                                    </Card>
                                )
                            )}

                            {step === 'review' && selected?.quote && (
                                <Card>
                                    <h2 className="font-display text-2xl font-semibold">Review and pay</h2>
                                    <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
                                        <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Guest</dt><dd className="font-semibold">{details.name}</dd><dd className="text-taupe dark:text-gray-400">{details.email}{details.phone ? ` · ${details.phone}` : ''}</dd></div>
                                        <div><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Arrival</dt><dd className="font-semibold">{details.arrivalTime || 'Not specified'}</dd></div>
                                        {details.specialRequests && (
                                            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-taupe dark:text-gray-400">Special requests</dt><dd className="whitespace-pre-line">{details.specialRequests}</dd></div>
                                        )}
                                    </dl>

                                    <ul className="mt-8 space-y-3 rounded-xl bg-linen p-5 text-sm text-umber dark:bg-night dark:text-gray-300">
                                        <li className="flex gap-3"><BsShieldCheck className="mt-0.5 shrink-0 text-success" /> Free cancellation until your check-in date. Paid bookings are refunded in full.</li>
                                        <li className="flex gap-3"><BsClock className="mt-0.5 shrink-0 text-bronze dark:text-gold" /> We hold your room for {SITE.bookingHoldMinutes} minutes while you pay securely with PayHere.</li>
                                        <li className="flex gap-3"><BsDoorOpen className="mt-0.5 shrink-0 text-bronze dark:text-gold" /> Your room number is given at check-in ({SITE.checkInTime}). Check-out is by {SITE.checkOutTime}.</li>
                                    </ul>

                                    <label className="mt-6 flex items-start gap-3 text-sm cursor-pointer">
                                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-bronze" />
                                        <span>I agree to the <Link to="/policies#booking" target="_blank" className="font-semibold text-bronze underline dark:text-gold">booking terms</Link> and <Link to="/policies#cancellation" target="_blank" className="font-semibold text-bronze underline dark:text-gold">cancellation policy</Link>.</span>
                                    </label>

                                    <Button size="lg" fullWidth className="mt-6" disabled={!agreed} loading={submitting} onClick={confirmAndPay}>
                                        Confirm and pay {formatMoney(selected.quote.total, selected.quote.currency)}
                                    </Button>
                                    <p className="mt-3 text-center text-xs text-taupe dark:text-gray-400">Payments are processed securely by PayHere. We never see your card details.</p>
                                </Card>
                            )}
                        </div>

                        <aside className="order-1 lg:order-2">
                            {summary || <Card><Skeleton className="h-6 w-2/3" /><Skeleton className="mt-4 h-24 w-full" /></Card>}
                        </aside>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Book;
