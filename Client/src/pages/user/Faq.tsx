import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import { FAQS, IMAGES } from '../../config/content';
import { SITE, telHref } from '../../config/site';

const GROUPS = ['Booking', 'Your stay', 'Payments'] as const;

const Faq: React.FC = () => (
    <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
        <Navbar />
        <PageHero eyebrow="Help" title="Frequently asked questions" image={IMAGES.lounge} />
        <main id="main" className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[220px_1fr]">
            <nav aria-label="FAQ sections" className="lg:sticky lg:top-28 lg:self-start">
                <ul className="flex flex-wrap gap-3 lg:flex-col">
                    {GROUPS.map(g => (
                        <li key={g}><a href={`#${g.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-taupe hover:text-bronze dark:text-gray-400 dark:hover:text-gold">{g}</a></li>
                    ))}
                </ul>
            </nav>
            <div className="space-y-14">
                {GROUPS.map(g => (
                    <section key={g} id={g.toLowerCase().replace(/\s+/g, '-')} aria-labelledby={`h-${g}`}>
                        <h2 id={`h-${g}`} className="font-display text-3xl text-ink dark:text-cream">{g}</h2>
                        <div className="mt-6 divide-y divide-wheat border-y border-wheat dark:divide-graphite dark:border-graphite">
                            {FAQS.filter(f => f.group === g).map(f => (
                                <details key={f.q} className="group py-5">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.02rem] font-semibold text-ink dark:text-cream">
                                        {f.q}<span aria-hidden="true" className="text-xl text-bronze transition-transform group-open:rotate-45 dark:text-gold">+</span>
                                    </summary>
                                    <p className="mt-3 max-w-3xl leading-7 text-taupe dark:text-gray-300">{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                ))}
                <div className="rounded-2xl bg-cream p-8 dark:bg-charcoal">
                    <h2 className="font-display text-2xl text-ink dark:text-cream">Still have a question?</h2>
                    <p className="mt-2 text-taupe dark:text-gray-300">
                        Call us on <a href={telHref(SITE.phone)} className="font-semibold text-bronze underline dark:text-gold">{SITE.phone}</a> or <Link to="/contact" className="font-semibold text-bronze underline dark:text-gold">send a message</Link>.
                    </p>
                </div>
            </div>
        </main>
        <Footer />
    </div>
);

export default Faq;
