/**
 * Guest emails (booking confirmed, cancelled, refund processed).
 *
 * Configure SMTP in .env to send real mail (works with Gmail app passwords, SendGrid,
 * Resend, Amazon SES SMTP, Mailtrap...):
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_SECURE (true for port 465)
 *   MAIL_FROM  e.g. "HotelMania <reservations@yourhotel.lk>"
 * Without SMTP_HOST, emails are printed to the server console in development and
 * skipped in tests. Sending never blocks or fails a booking request.
 */
const nodemailer = require('nodemailer');

let transporter;
const sent = []; // last few messages, for tests

const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
};

const BRAND = () => process.env.HOTEL_NAME || 'HotelMania';
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtMoney = (amount, currency) => `${currency || ''} ${Number(amount || 0).toFixed(2)}`.trim();

const layout = (title, bodyHtml) => `<!doctype html>
<html><body style="margin:0;background:#FDF8F3;font-family:Georgia,serif;color:#2C2416">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #E6E2D3;border-radius:12px;overflow:hidden">
        <tr><td style="background:#2C2416;padding:20px 28px;color:#D4AF37;font-size:18px;letter-spacing:3px">${escapeHtml(BRAND().toUpperCase())}</td></tr>
        <tr><td style="padding:28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
          <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #E6E2D3;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6B5B4F">
          Questions? Reply to this email or call us. Manage your booking at <a href="${clientUrl()}/bookings" style="color:#8B6914">${clientUrl()}/bookings</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

/** Summary rows shared by all booking emails. */
const stayTable = (b) => {
  const type = b.room && b.room.type ? b.room.type.name : 'Room';
  const hotel = b.room && b.room.hotel ? b.room.hotel : null;
  const rows = [
    ['Confirmation', `<strong>${escapeHtml(b.confirmationCode)}</strong>`],
    ['Hotel', escapeHtml(hotel ? `${hotel.name}${hotel.address ? `, ${hotel.address}` : ''}` : BRAND())],
    ['Room', escapeHtml(type)],
    ['Check-in', escapeHtml(fmtDate(b.checkInDate))],
    ['Check-out', escapeHtml(fmtDate(b.checkOutDate))],
    ['Guests', escapeHtml(b.guests)],
    ['Total', escapeHtml(fmtMoney(b.totalPrice, b.pricing && b.pricing.currency))],
  ];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse">
    ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#6B5B4F;border-bottom:1px solid #F5F0E6;width:40%">${k}</td><td style="padding:8px 0;border-bottom:1px solid #F5F0E6">${v}</td></tr>`).join('')}
  </table>`;
};

const recipient = (b) => (b.guestDetails && b.guestDetails.email) || (b.user && b.user.email);
const guestName = (b) => (b.guestDetails && b.guestDetails.name) || (b.user && b.user.name) || 'Guest';

const TEMPLATES = {
  confirmed: (b) => ({
    subject: `Your stay is confirmed — ${b.confirmationCode}`,
    html: layout(`See you soon, ${guestName(b).split(' ')[0]}!`, `
      <p>Thank you for booking with ${escapeHtml(BRAND())}. Your reservation is confirmed and paid.</p>
      ${stayTable(b)}
      <p>Check-in is from 2:00 PM and check-out is by 11:00 AM. Your room number will be given to you at check-in.</p>`),
  }),
  cancelled: (b) => ({
    subject: `Booking cancelled — ${b.confirmationCode}`,
    html: layout('Your booking has been cancelled', `
      <p>We have cancelled the reservation below.</p>
      ${stayTable(b)}
      ${b.refund && b.refund.status === 'due'
    ? `<p>A refund of <strong>${escapeHtml(fmtMoney(b.refund.amount, b.pricing && b.pricing.currency))}</strong> is being processed to your original payment method. We will email you when it has been sent.</p>`
    : ''}`),
  }),
  refunded: (b) => ({
    subject: `Refund sent — ${b.confirmationCode}`,
    html: layout('Your refund is on its way', `
      <p>We have refunded <strong>${escapeHtml(fmtMoney(b.refund && b.refund.amount, b.pricing && b.pricing.currency))}</strong> for booking ${escapeHtml(b.confirmationCode)}.
      Depending on your bank it can take 5–10 working days to appear.</p>
      ${b.refund && b.refund.reference ? `<p>Reference: ${escapeHtml(b.refund.reference)}</p>` : ''}`),
  }),
};

/**
 * Sends a booking email. `booking` must be populated (user, room.type, room.hotel).
 * Fire-and-forget: never throws.
 */
const sendBookingEmail = async (kind, booking) => {
  try {
    const to = recipient(booking);
    if (!to || !TEMPLATES[kind]) return;
    const { subject, html } = TEMPLATES[kind](booking);
    const message = { from: process.env.MAIL_FROM || `${BRAND()} <no-reply@hotelmania.local>`, to, subject, html };

    sent.push({ kind, to, subject });
    if (sent.length > 50) sent.shift();

    const t = getTransporter();
    if (t) {
      await t.sendMail(message);
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`[mail] (SMTP not configured) ${kind} → ${to}: ${subject}`);
    }
  } catch (err) {
    console.error(`[mail] could not send ${kind} email:`, err.message);
  }
};

module.exports = { sendBookingEmail, sentEmails: sent };
