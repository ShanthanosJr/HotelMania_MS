// Editorial content for the public site (Home, Dining, Spa, Offers, Gallery, FAQ).
// Kept as data so the business can change copy without touching page code.
// TODO before launch: confirm venue names, opening hours, offers and photos with the hotel.
import { SITE } from './site';

const u = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const p = (id: string, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const IMAGES = {
    hero: p('11434425', 2000),
    exterior: u('1566073771259-6a8506099945'),
    lobby: u('1551882547-ff40c63fe5fa'),
    pool: u('1571896349842-33c89424de2d'),
    poolNight: u('1540541338287-41700207dee6'),
    resort: u('1520250497591-112f2f40a3f4', 1600),
    suite: u('1582719478250-c89cae4dc85b'),
    room: u('1631049307264-da0ec9d70304'),
    bedroom: u('1618773928121-c32242e63f39'),
    detail: u('1582719508461-905c673771fd'),
    restaurant: u('1414235077428-338989a2e8c0'),
    spa: u('1544161515-4ab6ce6db874'),
    facade: u('1542314831-068cd1dbfeeb', 1600),
    terrace: p('261102'),
    bar: p('3584930'),
    breakfast: p('3895106'),
    lounge: p('258154'),
    stair: p('271624'),
} as const;

/** Key facts on Home. The rating is filled in from the hotels' real ratings (hidden when there are none). */
export const FACTS = [
    { value: '', label: 'Average guest rating' },
    { value: '2 min', label: 'Walk to Galle Face Green' },
    { value: '24 h', label: 'Concierge and room service' },
    { value: '45 min', label: 'From the international airport' },
];

export interface Pillar { key: string; eyebrow: string; title: string; text: string; image: string; to: string; cta: string }
export const PILLARS: Pillar[] = [
    {
        key: 'dine', eyebrow: 'Dine', title: 'Ceylon flavours, ocean air',
        text: 'Hoppers at sunrise, a seafood grill at dusk and a rooftop bar that pours arrack sours until late.',
        image: IMAGES.restaurant, to: '/dining', cta: 'Explore dining',
    },
    {
        key: 'unwind', eyebrow: 'Unwind', title: 'A spa rooted in Ayurveda',
        text: 'Herbal oil rituals, steam and a quiet garden pool, led by therapists trained in Kerala and Colombo.',
        image: IMAGES.spa, to: '/spa', cta: 'Discover the spa',
    },
    {
        key: 'stay', eyebrow: 'Stay', title: 'Rooms that face the sea',
        text: 'Calm, light-filled rooms with teak, handloom textiles and balconies over the Indian Ocean.',
        image: IMAGES.suite, to: '/rooms', cta: 'View rooms',
    },
];

export interface Venue { name: string; kind: string; hours: string; text: string; image: string; highlights: string[] }
export const DINING: Venue[] = [
    {
        name: 'The Verandah', kind: 'All-day dining', hours: '6:30 AM – 10:30 PM',
        text: 'Breakfast hoppers, string hoppers and kiribath, a lunch of rice and curry served the Sri Lankan way, and a relaxed dinner menu.',
        image: IMAGES.breakfast, highlights: ['Breakfast included on most rates', 'Kids menu', 'Vegetarian and vegan dishes'],
    },
    {
        name: 'Salt & Spice', kind: 'Seafood grill', hours: '6:30 PM – 11:00 PM',
        text: 'The morning catch from Negombo, cooked over coconut husk with island spices. Book a table by the window for the sunset.',
        image: IMAGES.restaurant, highlights: ['Catch of the day', 'Chef’s tasting menu', 'Reservations recommended'],
    },
    {
        name: 'Skyline Bar', kind: 'Rooftop cocktails', hours: '5:00 PM – 1:00 AM',
        text: 'Arrack cocktails, Ceylon tea infusions and small plates, with the best view of Galle Face Green.',
        image: IMAGES.bar, highlights: ['Sunset happy hour 5–7 PM', 'Live jazz on Fridays', 'Smart casual'],
    },
];

export interface Treatment { name: string; duration: string; text: string }
export const SPA = {
    hours: '9:00 AM – 9:00 PM',
    intro: 'Our spa follows the Ayurvedic idea of balance: warm oils, herbs from our own garden and unhurried treatments. Arrive 15 minutes early to enjoy the steam room and herbal tea.',
    treatments: [
        { name: 'Abhyanga full-body massage', duration: '60 / 90 min', text: 'Four-hands warm herbal oil massage to calm the body and mind.' },
        { name: 'Shirodhara', duration: '45 min', text: 'A steady stream of warm oil over the forehead. Deeply relaxing.' },
        { name: 'Ceylon tea body scrub', duration: '45 min', text: 'Exfoliation with black tea, coconut and raw sugar, finished with aloe.' },
        { name: 'Couples ritual', duration: '120 min', text: 'Side-by-side massage, a flower bath and fresh king coconut.' },
    ] as Treatment[],
    facilities: ['Garden pool', 'Steam and sauna', 'Yoga pavilion', 'Fitness studio (24 h)'],
};

export interface Offer { slug: string; title: string; tag: string; text: string; terms: string; image: string }
export const OFFERS: Offer[] = [
    {
        slug: 'stay-longer', title: 'Stay 4, pay 3', tag: 'Long stay',
        text: 'Slow down in Colombo. Book four nights or more and your fourth night is on us, with daily breakfast.',
        terms: 'Valid on all room types. Lowest-priced night is free. Subject to availability.',
        image: IMAGES.bedroom,
    },
    {
        slug: 'honeymoon', title: 'Honeymoon by the sea', tag: 'Couples',
        text: 'Sparkling wine on arrival, a couples spa ritual and a private dinner at Salt & Spice.',
        terms: 'Minimum two nights. Please tell us your wedding date when you enquire.',
        image: IMAGES.poolNight,
    },
    {
        slug: 'early-bird', title: 'Plan ahead, save 15%', tag: 'Early booking',
        text: 'Book at least 45 days before arrival and save 15% on the room rate.',
        terms: 'Pay in full at booking. Changes allowed up to 14 days before arrival.',
        image: IMAGES.pool,
    },
];

export const DAY_TIMELINE = [
    { time: '6:30', title: 'Sunrise yoga', text: 'A gentle flow in the garden pavilion while the city wakes up.' },
    { time: '8:00', title: 'Hoppers for breakfast', text: 'Egg hoppers, pol sambol and fresh Ceylon tea at The Verandah.' },
    { time: '11:00', title: 'Old Colombo by tuk-tuk', text: 'Pettah market, the Dutch Hospital and Gangaramaya Temple with a local guide.' },
    { time: '15:00', title: 'Ayurveda at the spa', text: 'An Abhyanga massage, then the steam room and a herbal tea.' },
    { time: '18:00', title: 'Sunset on Galle Face', text: 'Isso wade from the street stalls and kites over the ocean.' },
    { time: '20:30', title: 'Dinner and a nightcap', text: 'The catch of the day at Salt & Spice, then cocktails at Skyline Bar.' },
];

export const GALLERY = [
    { src: IMAGES.resort, alt: 'Pool terrace overlooking the ocean', category: 'Hotel' },
    { src: IMAGES.suite, alt: 'Suite with a king bed and sea view', category: 'Rooms' },
    { src: IMAGES.restaurant, alt: 'Restaurant set for dinner', category: 'Dining' },
    { src: IMAGES.spa, alt: 'Massage room at the spa', category: 'Spa' },
    { src: IMAGES.pool, alt: 'Swimming pool lined with palms', category: 'Hotel' },
    { src: IMAGES.bedroom, alt: 'Bright bedroom with soft linens', category: 'Rooms' },
    { src: IMAGES.bar, alt: 'Cocktails at the bar', category: 'Dining' },
    { src: IMAGES.lobby, alt: 'Lobby and lounge', category: 'Hotel' },
    { src: IMAGES.room, alt: 'Deluxe room interior', category: 'Rooms' },
    { src: IMAGES.breakfast, alt: 'Breakfast spread', category: 'Dining' },
    { src: IMAGES.poolNight, alt: 'Pool lit up at night', category: 'Hotel' },
    { src: IMAGES.detail, alt: 'Room details and bathroom', category: 'Rooms' },
];

export interface Faq { q: string; a: string; group: 'Booking' | 'Your stay' | 'Payments' }
export const FAQS: Faq[] = [
    { group: 'Booking', q: 'Is it cheaper to book directly?', a: 'Yes. Booking on this website always gets you our best available rate, with no booking fees.' },
    { group: 'Booking', q: 'Can I choose a specific room number?', a: 'You book a room type. We assign the room before you arrive and you can add a preference, such as a high floor, in your special requests.' },
    { group: 'Booking', q: 'How do I cancel or change my booking?', a: 'Open My Bookings and choose Cancel. Paid bookings cancelled before check-in are refunded to the original payment method. To change dates, contact us and we will help.' },
    { group: 'Booking', q: 'Can I book for a group or an event?', a: 'Yes. For five rooms or more, weddings and events, send us an enquiry and our team will reply with a proposal.' },
    { group: 'Your stay', q: 'What time are check-in and check-out?', a: `Check-in is from ${SITE.checkInTime} and check-out is by ${SITE.checkOutTime}. Early check-in and late check-out depend on availability.` },
    { group: 'Your stay', q: 'Do you offer airport transfers?', a: 'Yes. Bandaranaike International Airport is about 45 minutes away. Tell us your flight details and we will arrange a car.' },
    { group: 'Your stay', q: 'Is parking available?', a: 'Free secure parking is available for guests. Valet parking is available in the evening.' },
    { group: 'Your stay', q: 'Is breakfast included?', a: 'Most rates include breakfast at The Verandah. Your booking confirmation shows what is included.' },
    { group: 'Payments', q: 'How do I pay?', a: 'Online by card through PayHere, a secure Sri Lankan payment gateway. Your room is held for 30 minutes while you pay.' },
    { group: 'Payments', q: 'Are taxes included in the price?', a: 'The price you see at checkout includes any service charge and taxes. Nothing is added at the hotel except extras you order.' },
];

/** Contact-form topics (must match the server's Enquiry topics). */
export const ENQUIRY_TOPICS = [
    { value: 'general', label: 'General question' },
    { value: 'reservation', label: 'Reservation or offer' },
    { value: 'events', label: 'Events & weddings' },
    { value: 'dining', label: 'Dining' },
    { value: 'spa', label: 'Spa & wellness' },
    { value: 'feedback', label: 'Feedback' },
] as const;
