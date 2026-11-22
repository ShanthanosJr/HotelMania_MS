import { api } from './api';

// PayHere JS SDK — https://support.payhere.lk/api-&-mobile-sdk/payhere-javascript-sdk
const SDK_URL = 'https://www.payhere.lk/lib/payhere.js';

interface PayHereSdk {
    startPayment: (payment: Record<string, unknown>) => void;
    onCompleted: (orderId: string) => void;
    onDismissed: () => void;
    onError: (error: string) => void;
}

declare global {
    interface Window {
        payhere?: PayHereSdk;
    }
}

let sdkPromise: Promise<PayHereSdk> | null = null;

const loadSdk = (): Promise<PayHereSdk> => {
    if (window.payhere) return Promise.resolve(window.payhere);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.onload = () => (window.payhere ? resolve(window.payhere) : reject(new Error('PayHere failed to load')));
        script.onerror = () => {
            sdkPromise = null;
            reject(new Error('Could not load PayHere. Check your connection and try again.'));
        };
        document.head.appendChild(script);
    });
    return sdkPromise;
};

/** 'paid' = confirmed by PayHere's server notification; 'processing' = paid in the popup but not yet confirmed. */
export type PaymentOutcome = 'paid' | 'processing' | 'dismissed';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** The booking is only marked paid once PayHere notifies our server, so poll for it. */
const waitForConfirmation = async (bookingId: string): Promise<PaymentOutcome> => {
    for (let i = 0; i < 10; i++) {
        try {
            const res = await api.get(`/api/bookings/${bookingId}`);
            if (res.ok) {
                const data = await res.json();
                if (data?.data?.paymentStatus === 'paid') return 'paid';
            }
        } catch {
            /* keep polling */
        }
        await sleep(2000);
    }
    return 'processing';
};

/** Opens the PayHere payment popup for a booking the current user owns. */
export const payForBooking = async (bookingId: string): Promise<PaymentOutcome> => {
    const res = await api.post('/api/payments/payhere/checkout', { booking: bookingId });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Could not start payment');

    const payhere = await loadSdk();

    return new Promise<PaymentOutcome>((resolve, reject) => {
        payhere.onCompleted = () => {
            waitForConfirmation(bookingId).then(resolve);
        };
        payhere.onDismissed = () => resolve('dismissed');
        payhere.onError = (error: string) => reject(new Error(error || 'Payment failed'));
        payhere.startPayment(data.payment);
    });
};

/** User-facing message for each outcome. */
export const outcomeMessage = (outcome: PaymentOutcome): string => {
    switch (outcome) {
        case 'paid':
            return 'Payment received. Your booking is confirmed!';
        case 'processing':
            return 'Payment completed. We are confirming it with PayHere. Your booking will update in a moment.';
        default:
            return 'Payment was not completed. Your room is held for 30 minutes. You can pay from My Bookings.';
    }
};
