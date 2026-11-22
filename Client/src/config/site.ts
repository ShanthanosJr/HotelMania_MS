// Single source of truth for brand and contact details shown across the site.
// TODO: confirm these with the business before launch. The phone/address below
// come from the Grand Plaza Hotel record in the database.
export const SITE = {
    name: 'HotelMania',
    tagline: 'Sri Lankan hospitality, refined.',
    phone: '+94 11 243 7654',
    email: 'info@grandplaza.lk',
    address: '123 Galle Face, Colombo 02, Sri Lanka',
    checkInTime: '2:00 PM',
    checkOutTime: '11:00 AM',
    bookingHoldMinutes: 30,
} as const;

/** Google Maps embed URL for an address (no API key needed). */
export const mapEmbedUrl = (address: string) =>
    `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
