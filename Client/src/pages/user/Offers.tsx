import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import Reveal from '../../components/site/Reveal';
import { IMAGES, OFFERS } from '../../config/content';

const Offers: React.FC = () => (
    <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
        <Navbar />
        <PageHero eyebrow="Offers" title="Packages and seasonal offers"
            subtitle="Our best rates are always on this website. These packages add a little more to your stay. Send us an enquiry and we'll confirm the details and the price for your dates."
            image={IMAGES.poolNight} />
        <main id="main" className="mx-auto max-w-[1400px] space-y-16 px-4 py-16 sm:px-6 md:space-y-24 md:py-24">
            {OFFERS.map((o, i) => (
                <article key={o.slug} id={o.slug} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                    <Reveal className="overflow-hidden rounded-2xl">
                        <img src={o.image} alt="" loading={i ? 'lazy' : undefined} className="aspect-[4/3] w-full object-cover" />
                    </Reveal>
                    <Reveal delay={0.1}>
                        <span className="inline-block rounded-full bg-parchment px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-bronze dark:bg-gold/15 dark:text-gold">{o.tag}</span>
                        <h2 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl md:text-5xl dark:text-cream">{o.title}</h2>
                        <p className="mt-5 max-w-lg text-[1.02rem] leading-8 text-taupe dark:text-gray-300">{o.text}</p>
                        <p className="mt-4 max-w-lg border-l-2 border-gold pl-4 text-sm leading-6 text-taupe dark:text-gray-400">{o.terms}</p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link to={`/contact?offer=${o.slug}`} className="rounded-lg bg-bronze px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white hover:bg-bronze-deep dark:bg-gold dark:text-night">
                                Enquire about this offer
                            </Link>
                            <Link to="/rooms" className="rounded-lg border border-wheat px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-umber hover:border-bronze hover:text-bronze dark:border-graphite dark:text-cream dark:hover:border-gold dark:hover:text-gold">
                                See rooms
                            </Link>
                        </div>
                    </Reveal>
                </article>
            ))}
        </main>
        <Footer />
    </div>
);

export default Offers;
