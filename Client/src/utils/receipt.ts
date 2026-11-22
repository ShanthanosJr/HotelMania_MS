import { SITE } from '../config/site';
import { toast } from '../components/ui';
import { formatMoney } from './booking';

export interface ReceiptBooking {
    _id?: string;
    checkInDate?: string;
    checkOutDate?: string;
    status?: string;
    paymentStatus?: string;
    totalPrice?: number;
    guests?: number;
    confirmationCode?: string;
    pricing?: { subtotal?: number; serviceCharge?: number; serviceChargePercent?: number; tax?: number; taxPercent?: number; currency?: string; nightlyRate?: number };
    user?: { name?: string; email?: string };
    room?: unknown;
}

const esc = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

const label = (s?: string) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-');

/** Opens a printable booking receipt in a new window. */
export const printReceipt = (booking: ReceiptBooking, guestName?: string) => {
    const room = (booking.room && typeof booking.room === 'object' ? booking.room : {}) as {
        roomNumber?: string;
        type?: { name?: string; hotel?: { name?: string; address?: string } };
        hotel?: { name?: string; address?: string };
    };
    const hotel = room.hotel?.name ? room.hotel : room.type?.hotel;
    const nights =
        booking.checkInDate && booking.checkOutDate
            ? Math.round((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000)
            : 0;
    const p = booking.pricing;
    const money = (n?: number) => formatMoney(n, p?.currency);
    const total = money(booking.totalPrice);
    const ref = booking.confirmationCode || (booking._id || '').slice(-8).toUpperCase();
    const breakdown = p && p.subtotal !== undefined ? `
<tr><td>Room (${esc(nights)} night${nights === 1 ? '' : 's'} × ${esc(money(p.nightlyRate))})</td><td>${esc(money(p.subtotal))}</td></tr>
${p.serviceCharge ? `<tr><td>Service charge (${esc(p.serviceChargePercent)}%)</td><td>${esc(money(p.serviceCharge))}</td></tr>` : ''}
${p.tax ? `<tr><td>Taxes (${esc(p.taxPercent)}%)</td><td>${esc(money(p.tax))}</td></tr>` : ''}` : '';

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(ref)} - ${esc(SITE.name)}</title>
<style>
  body{font-family:Georgia,serif;color:#2C2416;max-width:640px;margin:40px auto;padding:0 24px}
  h1{font-size:28px;margin:0;letter-spacing:.08em} .muted{color:#6B5B4F;font-family:Arial,sans-serif;font-size:13px}
  table{width:100%;border-collapse:collapse;margin:24px 0;font-family:Arial,sans-serif;font-size:14px}
  td{padding:10px 0;border-bottom:1px solid #E8DCC8} td:last-child{text-align:right}
  .total td{font-size:18px;font-weight:bold;border-bottom:2px solid #2C2416}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #8B6914;padding-bottom:16px}
  @media print{button{display:none}}
</style></head><body>
<div class="head"><div><h1>${esc(SITE.name.toUpperCase())}</h1><div class="muted">${esc(SITE.address)}<br>${esc(SITE.phone)} · ${esc(SITE.email)}</div></div>
<div class="muted" style="text-align:right">BOOKING RECEIPT<br><strong>${esc(ref)}</strong><br>${esc(fmtDate(new Date().toISOString()))}</div></div>
<table>
<tr><td>Guest</td><td>${esc(guestName || booking.user?.name || '-')}</td></tr>
<tr><td>Hotel</td><td>${esc(hotel?.name || '-')}</td></tr>
<tr><td>Room</td><td>${esc(room.type?.name || 'Room')}${room.roomNumber && booking.status === 'checked_in' ? ' · Room ' + esc(room.roomNumber) : ''}</td></tr>
<tr><td>Check-in</td><td>${esc(fmtDate(booking.checkInDate))} (from ${esc(SITE.checkInTime)})</td></tr>
<tr><td>Check-out</td><td>${esc(fmtDate(booking.checkOutDate))} (by ${esc(SITE.checkOutTime)})</td></tr>
<tr><td>Nights</td><td>${esc(nights)}</td></tr>
${booking.guests ? `<tr><td>Guests</td><td>${esc(booking.guests)}</td></tr>` : ''}
<tr><td>Booking status</td><td>${esc(label(booking.status))}</td></tr>
<tr><td>Payment</td><td>${esc(label(booking.paymentStatus))}</td></tr>
${breakdown}
<tr class="total"><td>Total</td><td>${esc(total)}</td></tr>
</table>
<p class="muted">Thank you for choosing ${esc(SITE.name)}.</p>
<button onclick="window.print()" style="padding:10px 20px;background:#8B6914;color:#fff;border:0;border-radius:4px;cursor:pointer">Print / Save as PDF</button>
</body></html>`;

    const win = window.open('', '_blank', 'width=720,height=860');
    if (!win) {
        toast.warning('Please allow pop-ups to view your receipt.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
};
