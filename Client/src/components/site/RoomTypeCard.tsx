import React from 'react';
import { Link } from 'react-router-dom';
import { bookUrl, formatMoney, type RoomTypeSummary } from '../../utils/booking';
import { hotelIdOf, hotelNameOf } from '../../hooks/usePublicData';

export const ROOM_FALLBACK = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200';

interface RoomTypeCardProps {
    type: RoomTypeSummary;
    currency: string;
    /** Dates/guests the visitor already chose, carried into the booking flow. */
    stay?: { checkIn?: string; checkOut?: string; guests?: number };
    /** Availability line, e.g. "2 left for your dates". */
    status?: { label: string; tone: 'ok' | 'low' | 'none'; reason?: 'sold-out' | 'too-small' | 'restricted' };
    /** Total for the chosen stay. */
    total?: number;
    showHotel?: boolean;
    size?: 'lg' | 'md';
}

/** Large photo card with "from" price and the two actions hotel sites use: Book and Details. */
const RoomTypeCard: React.FC<RoomTypeCardProps> = ({ type, currency, stay, status, total, showHotel, size = 'md' }) => {
    const detailQs = new URLSearchParams();
    if (stay?.checkIn) detailQs.set('checkIn', stay.checkIn);
    if (stay?.checkOut) detailQs.set('checkOut', stay.checkOut);
    if (stay?.guests) detailQs.set('guests', String(stay.guests));
    const detailHref = `/room/${type._id}${detailQs.toString() ? `?${detailQs}` : ''}`;
    const soldOut = status?.tone === 'none';
    const facts = [
        type.size ? `${type.size} m²` : null,
        type.bedType || null,
        type.view ? `${type.view} view` : null,
        `Up to ${type.maxOccupancy} guest${type.maxOccupancy === 1 ? '' : 's'}`,
    ].filter(Boolean);
    const hotelName = showHotel ? hotelNameOf(type) : undefined;

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_4px_rgba(44,36,22,0.04),0_18px_40px_-24px_rgba(44,36,22,0.35)] transition-shadow hover:shadow-[0_2px_4px_rgba(44,36,22,0.06),0_28px_50px_-24px_rgba(44,36,22,0.45)] dark:bg-charcoal dark:shadow-none dark:ring-1 dark:ring-white/5">
            <Link to={detailHref} className={`relative block overflow-hidden bg-stone dark:bg-graphite ${size === 'lg' ? 'aspect-[4/3]' : 'aspect-[3/2]'}`} tabIndex={-1} aria-hidden="true">
                <img
                    src={type.photos?.[0] || ROOM_FALLBACK}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = ROOM_FALLBACK; }}
                />
                {status && (
                    <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] shadow ${status.tone === 'ok' ? 'bg-white/95 text-emerald-800' : status.tone === 'low' ? 'bg-gold text-ink' : 'bg-ink/85 text-white'}`}>
                        {status.label}
                    </span>
                )}
            </Link>
            <div className="flex flex-1 flex-col p-6">
                {hotelName && <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-bronze dark:text-gold">{hotelName}</p>}
                <h3 className="font-display text-2xl font-semibold leading-tight text-ink dark:text-cream">
                    <Link to={detailHref} className="hover:text-bronze dark:hover:text-gold">{type.name}</Link>
                </h3>
                <p className="mt-2 text-[0.8rem] text-taupe dark:text-gray-400">{facts.join(' · ')}</p>
                {type.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-taupe dark:text-gray-300">{type.description}</p>}
                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                    <div>
                        {total ? (
                            <>
                                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-taupe dark:text-gray-400">Total for your stay</p>
                                <p className="font-display text-2xl text-ink dark:text-cream">{formatMoney(total, currency)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-taupe dark:text-gray-400">From</p>
                                <p className="font-display text-2xl text-ink dark:text-cream">
                                    {formatMoney(type.basePrice, currency)}<span className="font-body text-sm text-taupe dark:text-gray-400"> / night</span>
                                </p>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Link to={detailHref} className="rounded-lg border border-wheat px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-umber transition-colors hover:border-bronze hover:text-bronze dark:border-graphite dark:text-cream dark:hover:border-gold dark:hover:text-gold">
                            Details
                        </Link>
                        {soldOut ? (
                            <span className="rounded-lg bg-stone px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-taupe dark:bg-graphite dark:text-gray-400">
                                {status?.reason === 'too-small' ? 'Too small' : status?.reason === 'restricted' ? 'Unavailable' : 'Sold out'}
                            </span>
                        ) : (
                            <Link
                                to={bookUrl({ type: type._id, hotel: hotelIdOf(type), checkIn: stay?.checkIn, checkOut: stay?.checkOut, guests: stay?.guests, step: stay?.checkIn ? 'details' : 'stay' })}
                                aria-label={`Book ${type.name}`}
                                className="rounded-lg bg-bronze px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-bronze-deep dark:bg-gold dark:text-night dark:hover:bg-gold/85"
                            >
                                Book
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default RoomTypeCard;
