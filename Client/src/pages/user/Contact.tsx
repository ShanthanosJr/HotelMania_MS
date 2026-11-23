import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BsEnvelope, BsGeoAlt, BsTelephone, BsWhatsapp, BsCheckCircle } from 'react-icons/bs';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import { api } from '../../utils/api';
import { getStoredUser } from '../../utils/auth';
import { addDays, todayInput } from '../../utils/booking';
import { SITE, directionsUrl, mapEmbedUrl, telHref, whatsappHref } from '../../config/site';
import { ENQUIRY_TOPICS, FAQS, IMAGES, OFFERS } from '../../config/content';

type Form = { name: string; email: string; phone: string; topic: string; checkIn: string; checkOut: string; guests: string; message: string; website: string };
type Errors = Partial<Record<keyof Form, string>>;

const validate = (f: Form): Errors => {
    const e: Errors = {};
    if (!f.name.trim()) e.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Please enter a valid email so we can reply.';
    if (f.message.trim().length < 10) e.message = 'Please write a little more (at least 10 characters).';
    if (f.checkIn && f.checkOut && f.checkOut <= f.checkIn) e.checkOut = 'Check-out must be after check-in.';
    return e;
};

const Contact: React.FC = () => {
    const [params] = useSearchParams();
    const user = getStoredUser();
    const offer = OFFERS.find(o => o.slug === params.get('offer'));
    const initialTopic = ENQUIRY_TOPICS.some(t => t.value === params.get('topic')) ? params.get('topic')! : offer ? 'reservation' : 'general';

    const [form, setForm] = useState<Form>({
        name: user?.name || '',
        email: user?.email || '',
        phone: typeof user?.phone === 'string' ? user.phone : '',
        topic: initialTopic,
        checkIn: '',
        checkOut: '',
        guests: '',
        message: offer ? `Hello, I'm interested in the "${offer.title}" offer. ` : '',
        website: '',
    });
    const [errors, setErrors] = useState<Errors>({});
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [serverError, setServerError] = useState('');

    const field = (k: keyof Form) => ({
        value: form[k],
        error: errors[k],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setForm(f => ({ ...f, [k]: e.target.value }));
            if (errors[k]) setErrors(er => ({ ...er, [k]: undefined }));
        },
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const found = validate(form);
        setErrors(found);
        setServerError('');
        if (Object.keys(found).length) {
            document.getElementById(`contact-${Object.keys(found)[0]}`)?.focus();
            return;
        }
        setSending(true);
        try {
            const res = await api.post('/api/enquiries', { ...form, guests: form.guests || undefined });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'We could not send your message. Please try again.');
            setSent(form.name.split(' ')[0] || 'there');
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'We could not send your message.');
        } finally {
            setSending(false);
        }
    };

    const showDates = ['reservation', 'events', 'general'].includes(form.topic);
    const today = todayInput();

    return (
        <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
            <Navbar />
            <PageHero eyebrow="Contact" title="We'd love to hear from you"
                subtitle="Questions about a stay, an event or a special request? Send us a message and our team will reply within one working day."
                image={IMAGES.lobby} />

            <main id="main" className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
                <Card className="p-6 sm:p-10">
                    {sent ? (
                        <div role="status" className="flex flex-col items-start py-8">
                            <BsCheckCircle className="text-5xl text-emerald-600" aria-hidden="true" />
                            <h2 className="mt-6 font-display text-3xl text-ink dark:text-cream">Thank you, {sent}.</h2>
                            <p className="mt-3 max-w-lg leading-7 text-taupe dark:text-gray-300">
                                Your message is on its way to our team. We have emailed you a copy and will reply to {form.email} within one working day.
                                If it's urgent, please call <a href={telHref(SITE.phone)} className="font-semibold text-bronze underline dark:text-gold">{SITE.phone}</a>.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button onClick={() => { setSent(null); setForm(f => ({ ...f, message: '', checkIn: '', checkOut: '', guests: '' })); }} variant="secondary">Send another message</Button>
                                <Link to="/book" className="inline-flex items-center rounded bg-bronze px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-bronze-deep dark:bg-gold dark:text-night">Book a stay</Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate aria-labelledby="form-title">
                            <h2 id="form-title" className="font-display text-2xl text-ink sm:text-3xl dark:text-cream">Send us a message</h2>
                            <p className="mt-2 text-sm text-taupe dark:text-gray-400">Fields marked * are required.</p>
                            <div className="mt-8 grid gap-5 sm:grid-cols-2">
                                <Input id="contact-name" label="Your name" required autoComplete="name" {...field('name')} />
                                <Input id="contact-email" label="Email" type="email" required autoComplete="email" {...field('email')} />
                                <Input id="contact-phone" label="Phone" type="tel" autoComplete="tel" hint="Optional, if you'd like a call back" {...field('phone')} />
                                <Select id="contact-topic" label="Topic" {...field('topic')}>
                                    {ENQUIRY_TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </Select>
                                {showDates && (
                                    <>
                                        <Input id="contact-checkIn" label="Arrival" type="date" min={today} hint="Optional"
                                            {...field('checkIn')}
                                            onChange={e => setForm(f => ({ ...f, checkIn: e.target.value, checkOut: f.checkOut && f.checkOut > e.target.value ? f.checkOut : e.target.value ? addDays(e.target.value, 1) : '' }))} />
                                        <div className="grid grid-cols-[1fr_7rem] gap-3">
                                            <Input id="contact-checkOut" label="Departure" type="date" min={form.checkIn ? addDays(form.checkIn, 1) : today} {...field('checkOut')} />
                                            <Input id="contact-guests" label="Guests" type="number" min={1} max={50} inputMode="numeric" {...field('guests')} />
                                        </div>
                                    </>
                                )}
                                <Textarea id="contact-message" label="Message" required rows={6} containerClassName="sm:col-span-2" maxLength={2000}
                                    hint={`${form.message.length} / 2000`} {...field('message')} />
                                {/* Honeypot for bots: hidden from people and screen readers */}
                                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                                    <label htmlFor="contact-website">Website</label>
                                    <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                                </div>
                            </div>
                            {serverError && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">{serverError}</p>}
                            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-taupe dark:text-gray-400">We only use your details to reply. See our <Link to="/policies#privacy" className="underline">privacy policy</Link>.</p>
                                <Button type="submit" size="lg" loading={sending}>Send message</Button>
                            </div>
                        </form>
                    )}
                </Card>

                <aside className="space-y-8">
                    <div className="space-y-5">
                        {[
                            { icon: <BsTelephone />, label: 'Call reservations', value: SITE.phone, href: telHref(SITE.phone) },
                            { icon: <BsEnvelope />, label: 'Email', value: SITE.email, href: `mailto:${SITE.email}` },
                            ...(SITE.whatsapp ? [{ icon: <BsWhatsapp />, label: 'WhatsApp', value: 'Message us', href: whatsappHref(SITE.whatsapp, 'Hello, I have a question about a stay.') }] : []),
                            { icon: <BsGeoAlt />, label: 'Address', value: SITE.address, href: directionsUrl(SITE.address) },
                        ].map(c => (
                            <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                                className="group flex items-start gap-4 rounded-xl border border-sand bg-white p-5 transition-colors hover:border-bronze dark:border-graphite dark:bg-charcoal dark:hover:border-gold">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-parchment text-lg text-bronze dark:bg-gold/15 dark:text-gold" aria-hidden="true">{c.icon}</span>
                                <span>
                                    <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-taupe dark:text-gray-400">{c.label}</span>
                                    <span className="mt-1 block break-words font-semibold text-ink group-hover:text-bronze dark:text-cream dark:group-hover:text-gold">{c.value}</span>
                                </span>
                            </a>
                        ))}
                        <p className="text-sm text-taupe dark:text-gray-400">Reception is open 24 hours. Check-in from {SITE.checkInTime}, check-out by {SITE.checkOutTime}.</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-sand dark:border-graphite">
                        <iframe title={`Map showing ${SITE.name}`} src={mapEmbedUrl(SITE.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            className="h-72 w-full border-0 dark:[filter:invert(0.9)_hue-rotate(180deg)]" />
                    </div>
                </aside>
            </main>

            <section className="border-t border-sand bg-cream py-16 dark:border-graphite dark:bg-charcoal" aria-labelledby="quick-faq">
                <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
                    <h2 id="quick-faq" className="font-display text-3xl text-ink dark:text-cream">Quick answers</h2>
                    <div className="mt-8 divide-y divide-wheat border-y border-wheat dark:divide-graphite dark:border-graphite">
                        {FAQS.slice(0, 5).map(f => (
                            <details key={f.q} className="group py-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-ink dark:text-cream">
                                    {f.q}<span aria-hidden="true" className="text-xl text-bronze transition-transform group-open:rotate-45 dark:text-gold">+</span>
                                </summary>
                                <p className="mt-3 max-w-3xl leading-7 text-taupe dark:text-gray-300">{f.a}</p>
                            </details>
                        ))}
                    </div>
                    <Link to="/faq" className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-bronze hover:underline dark:text-gold">All questions →</Link>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default Contact;
