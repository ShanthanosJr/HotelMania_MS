import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { loadPricingConfig, type HotelSummary, type PricingConfig, type RoomTypeSummary } from '../utils/booking';

type Loadable<T> = { data: T; loading: boolean; error: string };

// One request per page load, shared by every component that needs the same list
const cache = new Map<string, Promise<unknown>>();
const getList = <T,>(url: string): Promise<T[]> => {
    if (!cache.has(url)) {
        const p = api.get(url)
            .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load data'))))
            .then(j => (Array.isArray(j.data) ? j.data : []))
            .catch(err => { cache.delete(url); throw err; });
        cache.set(url, p);
    }
    return cache.get(url) as Promise<T[]>;
};

const useList = <T,>(url: string): Loadable<T[]> => {
    const [state, setState] = useState<Loadable<T[]>>({ data: [], loading: true, error: '' });
    useEffect(() => {
        let alive = true;
        getList<T>(url)
            .then(data => alive && setState({ data, loading: false, error: '' }))
            .catch(err => alive && setState({ data: [], loading: false, error: err instanceof Error ? err.message : 'Could not load data' }));
        return () => { alive = false; };
    }, [url]);
    return state;
};

export const useRoomTypes = () => useList<RoomTypeSummary>('/api/room-types');
export const useHotels = () => useList<HotelSummary & { description?: string }>('/api/hotels');

export interface PublicReview { id: string; rating: number; comment: string; name: string; roomType?: string; hotel?: string; date?: string }
export const useReviews = () => useList<PublicReview>('/api/reviews/public');

/** Currency used at checkout (falls back to LKR until loaded). */
export const usePricing = (): PricingConfig => {
    const [cfg, setCfg] = useState<PricingConfig>({ currency: 'LKR', serviceChargePercent: 0, taxPercent: 0 });
    useEffect(() => {
        let alive = true;
        loadPricingConfig().then(c => alive && setCfg(c));
        return () => { alive = false; };
    }, []);
    return cfg;
};

export const hotelIdOf = (t: RoomTypeSummary) => (typeof t.hotel === 'string' ? t.hotel : t.hotel?._id);
export const hotelNameOf = (t: RoomTypeSummary) => (typeof t.hotel === 'object' ? t.hotel?.name : undefined);
