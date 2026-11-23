import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import Reveal from '../../components/site/Reveal';
import { IMAGES, SPA } from '../../config/content';

const Spa: React.FC = () => (
    <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
        <Navbar />
        <PageHero eyebrow="Spa & Wellness" title="Slow down, the Ayurvedic way" subtitle={SPA.intro} image={IMAGES.spa} />
        <main id="main" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24">
            <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
                <section aria-labelledby="treatments">
                    <h2 id="treatments" className="font-display text-3xl text-ink sm:text-4xl dark:text-cream">Signature treatments</h2>
                    <ul className="mt-8 divide-y divide-wheat border-y border-wheat dark:divide-graphite dark:border-graphite">
                        {SPA.treatments.map((t, i) => (
                            <Reveal as="li" key={t.name} delay={i * 0.05} className="grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
                                <div>
                                    <h3 className="font-display text-xl text-ink dark:text-cream">{t.name}</h3>
                                    <p className="mt-1 text-sm leading-6 text-taupe dark:text-gray-400">{t.text}</p>
                                </div>
                                <p className="text-sm font-semibold tabular-nums text-bronze dark:text-gold">{t.duration}</p>
                            </Reveal>
                        ))}
                    </ul>
                    <p className="mt-6 text-sm text-taupe dark:text-gray-400">Prices on request. Hotel guests can charge treatments to their room.</p>
                </section>
                <aside className="space-y-6">
                    <Reveal className="overflow-hidden rounded-2xl">
                        <img src={IMAGES.pool} alt="Garden pool" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    </Reveal>
                    <div className="rounded-2xl border border-sand bg-white p-6 dark:border-graphite dark:bg-charcoal">
                        <h2 className="font-display text-2xl text-ink dark:text-cream">Facilities</h2>
                        <ul className="mt-4 space-y-2 text-sm text-ink dark:text-cream">
                            {SPA.facilities.map(f => <li key={f} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />{f}</li>)}
                        </ul>
                        <p className="mt-5 text-sm text-taupe dark:text-gray-400">Spa open daily, {SPA.hours}.</p>
                        <Link to="/contact?topic=spa" className="mt-6 block rounded-lg bg-bronze py-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white hover:bg-bronze-deep dark:bg-gold dark:text-night">
                            Book a treatment
                        </Link>
                    </div>
                </aside>
            </div>
        </main>
        <Footer />
    </div>
);

export default Spa;
