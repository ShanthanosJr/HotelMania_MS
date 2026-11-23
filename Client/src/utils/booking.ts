// Shared booking types and formatting used by the booking flow, My Bookings and admin.
import { api } from './api';

export interface PriceQuote {
    nightlyRate: number;
    nights: number;
    subtotal: number;
    serviceChargePercent: number;
    serviceCharge: number;
    taxPercent: number;
    tax: number;
    total: number;
    currency: string;
}

export interface HotelSummary {
    _id: string;
    name: string;
    address?: string;
    photos?: string[];
    rating?: number;
    contactInfo?: { phone?: string; email?: string };
}

export interface RoomTypeSummary {
    _id: string;
    name: string;
    description?: string;
    basePrice: number;
    maxOccupancy: number;
    size?: number;
    bedType?: string;
    view?: string;
    photos?: string[];
    amenities?: string[];
    hotel?: HotelSummary | string;
}

export interface AvailabilityRow {
    roomType: RoomTypeSummary;
    totalRooms: number;
    available: number;
    fitsGuests: boolean;
    quote: PriceQuote | null;
}

export interface AvailabilityResponse {
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    currency: string;
    serviceChargePercent: number;
    taxPercent: number;
    results: AvailabilityRow[];
}

export interface GuestDetails {
    name?: string;
    email?: string;
    phone?: string;
    arrivalTime?: string;
    specialRequests?: string;
}

export interface BookingRecord {
    _id: string;
    confirmationCode?: string;
    checkInDate: string;
    checkOutDate: string;
    guests?: number;
    totalPrice: number;
    pricing?: PriceQuote;
    guestDetails?: GuestDetails;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'refunded';
    holdExpiresAt?: string;
    cancelledAt?: string;
    refund?: { status?: 'due' | 'completed'; amount?: number; reference?: string; requestedAt?: string; completedAt?: string };
    user?: { _id?: string; name?: string; email?: string; phone?: string; userId?: string };
    room?: {
        _id: string;
        roomNumber?: string;
        status?: string;
        type?: RoomTypeSummary;
        hotel?: HotelSummary;
    };
    createdAt?: string;
}

const DAY_MS = 86400000;

/** YYYY-MM-DD for a Date in local time (what <input type="date"> uses). */
export const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const addDays = (isoDate: string, days: number) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    return toInputDate(new Date(y, m - 1, d + days));
};

export const todayInput = () => toInputDate(new Date());

export const nightsBetween = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return 0;
    const n = Math.round((Date.parse(checkOut.slice(0, 10)) - Date.parse(checkIn.slice(0, 10))) / DAY_MS);
    return Number.isFinite(n) ? n : 0;
};

/** Dates are stored as UTC midnight, so always format them in UTC. */
export const formatDate = (iso?: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) =>
    iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' }) : '—';

export const formatMoney = (amount?: number, currency = 'LKR') => {
    const value = Number(amount || 0);
    try {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency, maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
};

export const statusLabel = (s?: string) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');

export const hotelOf = (b: BookingRecord): HotelSummary | undefined => {
    if (b.room?.hotel && typeof b.room.hotel === 'object') return b.room.hotel;
    const h = b.room?.type?.hotel;
    return h && typeof h === 'object' ? h : undefined;
};

/** Minutes left on an unpaid online hold (0 when expired, null when no hold applies). */
export const holdMinutesLeft = (b: Pick<BookingRecord, 'holdExpiresAt' | 'paymentStatus' | 'status'>, now = Date.now()) => {
    if (!b.holdExpiresAt || b.paymentStatus !== 'pending' || b.status !== 'pending') return null;
    return Math.max(0, Math.ceil((Date.parse(b.holdExpiresAt) - now) / 60000));
};

/** Builds a calendar (.ics) file for a stay and downloads it. */
export const downloadIcs = (b: BookingRecord, hotelName: string, checkInTime = '14:00', checkOutTime = '11:00') => {
    const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
    const hm = (t: string) => t.replace(':', '') + '00';
    const hotel = hotelOf(b);
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HotelMania//Booking//EN', 'BEGIN:VEVENT',
        `UID:${b._id}@hotelmania`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART:${ymd(b.checkInDate)}T${hm(checkInTime)}`,
        `DTEND:${ymd(b.checkOutDate)}T${hm(checkOutTime)}`,
        `SUMMARY:Stay at ${hotel?.name || hotelName}`,
        `LOCATION:${(hotel?.address || '').replace(/[,;]/g, '\\$&')}`,
        `DESCRIPTION:Confirmation ${b.confirmationCode || ''} · ${b.room?.type?.name || 'Room'}`,
        'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b.confirmationCode || 'booking'}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Link into the booking flow, pre-filled with whatever is known. With a room type it jumps to
 * guest details, unless `step: 'stay'` asks to show that room highlighted among the dates first.
 */
export const bookUrl = (opts: { type?: string; hotel?: unknown; checkIn?: string | null; checkOut?: string | null; guests?: string | number | null; step?: 'stay' | 'details' } = {}) => {
    const qs = new URLSearchParams();
    if (opts.checkIn) qs.set('in', opts.checkIn);
    if (opts.checkOut) qs.set('out', opts.checkOut);
    if (opts.guests) qs.set('guests', String(opts.guests));
    const hotelId = typeof opts.hotel === 'string' ? opts.hotel
        : opts.hotel && typeof opts.hotel === 'object' && '_id' in opts.hotel ? String((opts.hotel as { _id: string })._id) : '';
    if (hotelId) qs.set('hotel', hotelId);
    if (opts.type) {
        qs.set('type', opts.type);
        if (opts.step !== 'stay') qs.set('step', 'details');
    }
    const s = qs.toString();
    return s ? `/book?${s}` : '/book';
};

export interface PricingConfig { currency: string; serviceChargePercent: number; taxPercent: number }
let pricingConfigPromise: Promise<PricingConfig> | null = null;

/** Currency and charges used at checkout, so "from" prices on the site use the same currency. */
export const loadPricingConfig = (): Promise<PricingConfig> => {
    if (!pricingConfigPromise) {
        pricingConfigPromise = api.get('/api/availability/config')
            .then(r => (r.ok ? r.json() : Promise.reject(new Error('config'))))
            .then(j => j.data as PricingConfig)
            .catch(() => {
                pricingConfigPromise = null; // try again next time
                return { currency: 'LKR', serviceChargePercent: 0, taxPercent: 0 };
            });
    }
    return pricingConfigPromise;
};
