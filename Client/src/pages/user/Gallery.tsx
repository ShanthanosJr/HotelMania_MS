import React, { useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import Lightbox from '../../components/site/Lightbox';
import { GALLERY, IMAGES } from '../../config/content';

const CATEGORIES = ['All', ...Array.from(new Set(GALLERY.map(g => g.category)))];

const Gallery: React.FC = () => {
    const [cat, setCat] = useState('All');
    const [open, setOpen] = useState<number | null>(null);
    const items = useMemo(() => (cat === 'All' ? GALLERY : GALLERY.filter(g => g.category === cat)), [cat]);
    return (
        <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
            <Navbar />
            <PageHero eyebrow="Gallery" title="A look around the hotel" image={IMAGES.resort} />
            <main id="main" className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
                <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter photos">
                    {CATEGORIES.map(c => (
                        <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
                            className={`rounded-full border px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${cat === c
                                ? 'border-bronze bg-bronze text-white dark:border-gold dark:bg-gold dark:text-night'
                                : 'border-wheat text-umber hover:border-bronze hover:text-bronze dark:border-graphite dark:text-cream dark:hover:border-gold dark:hover:text-gold'}`}>
                            {c}
                        </button>
                    ))}
                </div>
                <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
                    {items.map((g, i) => (
                        <li key={g.src} className="break-inside-avoid">
                            <button type="button" onClick={() => setOpen(i)} aria-label={`Open photo: ${g.alt}`}
                                className="group block w-full overflow-hidden rounded-xl bg-stone dark:bg-graphite cursor-zoom-in">
                                <img src={g.src} alt={g.alt} loading="lazy" className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'}`} />
                            </button>
                        </li>
                    ))}
                </ul>
            </main>
            <Lightbox images={items} index={open} onChange={setOpen} />
            <Footer />
        </div>
    );
};

export default Gallery;
