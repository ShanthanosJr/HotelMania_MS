import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuestStepper from './GuestStepper';
import { addDays, bookUrl, todayInput } from '../../utils/booking';

export interface StaySearch { checkIn: string; checkOut: string; guests: number; hotel?: string }

interface BookingBarProps {
    /** hero: floating bar over a photo. panel: stacked card (sidebars, mobile). */
    variant?: 'hero' | 'panel';
    initial?: Partial<StaySearch>;
    hotels?: { _id: string; name: string }[];
    /** Book this room type directly (room detail page). */
    roomType?: string;
    maxGuests?: number;
    submitLabel?: string;
    /** Handle the search yourself (e.g. update the Rooms page URL) instead of opening /book. */
    onSearch?: (s: StaySearch) => void;
    className?: string;
}

const LABEL = 'mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-taupe dark:text-gray-400';
const CONTROL = 'w-full rounded-lg border border-stone bg-white px-3 py-2.5 text-sm text-ink focus:border-bronze focus:outline-none focus:ring-2 focus:ring-gold/50 dark:border-graphite dark:bg-night dark:text-cream cursor-pointer';

/**
 * Dates + guests search used on Home, Rooms and room pages. Defaults to tonight → tomorrow,
 * as the best hotel sites do, so one tap shows live availability.
 */
const BookingBar: React.FC<BookingBarProps> = ({
    variant = 'hero', initial, hotels, roomType, maxGuests = 10, submitLabel = 'Check availability', onSearch, className = '',
}) => {
    const navigate = useNavigate();
    const today = todayInput();
    const [checkIn, setCheckIn] = useState(initial?.checkIn && initial.checkIn >= today ? initial.checkIn : today);
    const [checkOut, setCheckOut] = useState(
        initial?.checkOut && initial.checkOut > (initial?.checkIn || today) ? initial.checkOut : addDays(initial?.checkIn && initial.checkIn >= today ? initial.checkIn : today, 1),
    );
    const [guests, setGuests] = useState(Math.min(maxGuests, Math.max(1, Number(initial?.guests) || 2)));
    const [hotel, setHotel] = useState(initial?.hotel || '');
    const [error, setError] = useState('');

    const changeCheckIn = (v: string) => {
        setCheckIn(v);
        if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkIn || !checkOut) return setError('Choose your check-in and check-out dates.');
        if (checkOut <= checkIn) return setError('Check-out must be after check-in.');
        setError('');
        const search = { checkIn, checkOut, guests, hotel: hotel || undefined };
        if (onSearch) return onSearch(search);
        navigate(bookUrl({ ...search, type: roomType }));
    };

    const showHotels = hotels && hotels.length > 1;
    const panel = variant === 'panel';

    return (
        <form
            onSubmit={submit}
            noValidate
            aria-label="Check availability"
            className={`${panel
                ? 'flex flex-col gap-4'
                : 'grid gap-4 rounded-2xl bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(44,36,22,0.45)] backdrop-blur sm:grid-cols-2 sm:p-5 dark:bg-charcoal/95 ' + (showHotels ? 'lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_1fr_auto]')
            } ${className}`}
        >
            {showHotels && (
                <div>
                    <label htmlFor="bb-hotel" className={LABEL}>Hotel</label>
                    <select id="bb-hotel" value={hotel} onChange={e => setHotel(e.target.value)} className={CONTROL}>
                        <option value="">All hotels</option>
                        {hotels!.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                </div>
            )}
            <div className={panel ? 'grid grid-cols-2 gap-3' : 'contents'}>
                <div>
                    <label htmlFor="bb-in" className={LABEL}>Check in</label>
                    <input id="bb-in" type="date" min={today} value={checkIn} onChange={e => changeCheckIn(e.target.value)} className={CONTROL} required />
                </div>
                <div>
                    <label htmlFor="bb-out" className={LABEL}>Check out</label>
                    <input id="bb-out" type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={e => setCheckOut(e.target.value)} className={CONTROL} required />
                </div>
            </div>
            <div>
                <span className={LABEL} id="bb-guests-label">Guests</span>
                <div className="rounded-lg border border-stone bg-white px-2 py-[0.3rem] dark:border-graphite dark:bg-night">
                    <GuestStepper value={guests} onChange={setGuests} max={maxGuests} />
                </div>
            </div>
            <div className={panel ? '' : 'flex items-end sm:col-span-2 lg:col-span-1'}>
                <button
                    type="submit"
                    className="w-full whitespace-nowrap rounded-lg bg-bronze px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-bronze-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:bg-gold dark:text-night dark:hover:bg-gold/85 cursor-pointer"
                >
                    {submitLabel}
                </button>
            </div>
            {error && <p role="alert" className={`text-sm text-danger ${panel ? '' : 'sm:col-span-2 lg:col-span-full'}`}>{error}</p>}
        </form>
    );
};

export default BookingBar;
