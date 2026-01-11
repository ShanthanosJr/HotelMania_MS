import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
// NEW: Import animation library
import { motion, useInView, useSpring } from 'framer-motion';
// NEW: Import icons for the new features
import { BsPlayCircle, BsAward, BsPeople, BsBuilding, BsQuote } from 'react-icons/bs';

const galleryImages: string[] = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80',
];

const teamMembers = [
    {
        name: "Alex Johnson",
        role: "General Manager",
        img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    },
    {
        name: "Sarah Williams",
        role: "Head of Operations",
        img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
    },
    {
        name: "Michael Chen",
        role: "Guest Relations",
        img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80",
    },
];

// --- NEW SUB-COMPONENT: Animated Counter ---
const Counter = ({ value, label, icon: Icon }: { value: number, label: string, icon: any }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const springValue = useSpring(0, { duration: 3000 }); // Animation lasts 3 seconds
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) springValue.set(value);
    }, [isInView, value, springValue]);

    useEffect(() => {
        springValue.on("change", (latest) => setDisplayValue(Math.floor(latest)));
    }, [springValue]);

    return (
        <div ref={ref} className="flex flex-col items-center p-6 bg-white/50 backdrop-blur-sm rounded-lg border border-[#8B6914]/20 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-600/20">
            <Icon className="text-4xl text-[#8B6914] mb-4 dark:text-[#D4AF37]" />
            <span className="text-4xl font-serif font-bold text-[#2C2416] dark:text-[#FDF8F3]">{displayValue}+</span>
            <span className="text-sm uppercase tracking-widest text-[#8B6914] mt-2 dark:text-[#D4AF37]">{label}</span>
        </div>
    );
};

const heroImage =
    'https://images.pexels.com/photos/2659629/pexels-photo-2659629.jpeg?auto=compress&cs=tinysrgb&w=1600';

const visitBg =
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80';

const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};
const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const About: React.FC = () => {
    const [visibleCount, setVisibleCount] = useState<number>(4);

    const visibleImages = galleryImages.slice(0, visibleCount);
    const canLoadMore = visibleCount < galleryImages.length;

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + 3, galleryImages.length));
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
            <Navbar />
            {/* HERO */}
            <motion.section
                className="relative min-h-[480px] relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <div
                    className="absolute inset-0 bg-cover bg-center scale-[1.08] animate-[aboutHeroZoom_20s_ease-in-out_infinite_alternate]"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(44,36,22,0.9)_0%,rgba(139,105,20,0.82)_45%,rgba(184,212,227,0.25)_100%)]" />
                <motion.div
                    className="relative z-10 max-w-[1400px] mx-auto px-6 py-20 text-white mt-10"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <motion.p
                        className="text-subtitle !text-[#E8DCC8] mt-10 dark:text-[#D4AF37]"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        About Hotelmania
                    </motion.p>
                    <motion.h1
                        className="text-display text-3xl md:text-4xl lg:text-5xl mb-4 max-w-xl dark:text-[#FDF8F3]"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        Where Every Stay Feels Curated
                    </motion.h1>
                    <motion.p
                        className="max-w-xl text-sm md:text-[0.98rem] leading-7 text-[#F5F0E6] dark:text-gray-300"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        Discover the story behind Hotelmania, the digital concierge crafted to bring
                        luxury hotel experiences closer to guests and teams around the world.
                    </motion.p>

                    {/* Watch Story Button */}
                    <motion.div
                        className="mt-8"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                    >
                        <button className="group flex items-center gap-4 hover:scale-105 transition-transform duration-300 dark:hover:text-[#D4AF37]">
                            <BsPlayCircle className="text-5xl text-white group-hover:text-[#8B6914] transition-colors bg-black/20 rounded-full backdrop-blur-md dark:group-hover:text-[#D4AF37]" />
                            <span className="text-sm tracking-widest uppercase border-b border-transparent group-hover:border-white transition-all dark:border-gray-600">Watch Our Story</span>
                        </button>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* --- UPGRADED STATS SECTION --- */}
            <motion.section
                className="bg-[#2C2416] py-20 relative overflow-hidden dark:bg-gray-900"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                {/* Subtle Pattern Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                <motion.div
                    className="max-w-7xl mx-auto px-6 relative z-10"
                    variants={fadeInUp}
                >
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        variants={stagger}
                    >
                        {/* These will now count up automatically */}
                        <Counter value={150} label="Luxury Rooms" icon={BsBuilding} />
                        <Counter value={45} label="Awards Won" icon={BsAward} />
                        <Counter value={120} label="Dedicated Staff" icon={BsPeople} />
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* ABOUT PLATFORM */}
            <motion.section
                className="py-16 bg-[#FDF8F3] dark:bg-[#121212]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <motion.div
                    className="max-w-[1400px] mx-auto px-6 grid md:grid-cols-[1.6fr,1.2fr] gap-10 items-start"
                    variants={fadeInUp}
                >
                    <motion.div
                        variants={fadeInUp}
                    >
                        <motion.p
                            className="text-subtitle dark:text-[#D4AF37]"
                            variants={fadeInUp}
                        >
                            About Our Website
                        </motion.p>
                        <motion.h2
                            className="text-section-title dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            What Is Hotelmania?
                        </motion.h2>
                        <motion.p
                            className="text-body mb-3 dark:text-gray-300"
                            variants={fadeInUp}
                        >
                            Hotelmania is a modern hotel management and guest experience platform that
                            showcases rooms, manages bookings, and provides a seamless journey from first
                            click to final checkout.
                        </motion.p>
                        <motion.p
                            className="text-body mb-6 dark:text-gray-300"
                            variants={fadeInUp}
                        >
                            Built with a focus on clarity and warmth, the interface brings together
                            guests, reception, and administration into a single elegant environment.
                        </motion.p>

                        <motion.div
                            className="grid sm:grid-cols-3 gap-4 mb-6"
                            variants={stagger}
                        >
                            <motion.div
                                className="rounded-xl bg-white shadow-md px-4 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                                variants={fadeInUp}
                            >
                                <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">For Guests</h3>
                                <p className="text-xs text-[#6B5B4F] leading-6">
                                    Explore rooms, track bookings, and manage stays with a calm, guided flow.
                                </p>
                            </motion.div>
                            <motion.div
                                className="rounded-xl bg-white shadow-md px-4 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                                variants={fadeInUp}
                            >
                                <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">For Staff</h3>
                                <p className="text-xs text-[#6B5B4F] leading-6">
                                    Handle reservations, rooms, and users with structured admin tools.
                                </p>
                            </motion.div>
                            <motion.div
                                className="rounded-xl bg-white shadow-md px-4 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                                variants={fadeInUp}
                            >
                                <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">For Management</h3>
                                <p className="text-xs text-[#6B5B4F] leading-6">
                                    Get an overview of occupancy, guests, and core operations at a glance.
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="space-y-4"
                        variants={stagger}
                    >
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-5 py-5 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Designed Around the Journey
                            </h3>
                            <ul className="space-y-2 text-sm text-[#6B5B4F] dark:text-gray-300">
                                <li>Homepage inspiration to introduce the property.</li>
                                <li>Dedicated rooms, bookings, and profile flows.</li>
                                <li>Admin pages for deeper operational control.</li>
                            </ul>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-[#F5F0E6] px-5 py-5 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Consistency in Every Detail
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                From typography to color, each screen follows the same visual language so
                                guests always know where they are and what comes next.
                            </p>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* EXPERIENCES SECTION */}
            <motion.section
                className="py-16 bg-[#F5F0E6] dark:bg-[#1E1E1E]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <motion.div
                    className="max-w-[1400px] mx-auto px-6 grid md:grid-cols-[1.3fr,1.7fr] gap-10 items-start"
                    variants={fadeInUp}
                >
                    <motion.div
                        variants={fadeInUp}
                    >
                        <motion.p
                            className="text-subtitle"
                            variants={fadeInUp}
                        >
                            Experiences
                        </motion.p>
                        <motion.h2
                            className="text-section-title"
                            variants={fadeInUp}
                        >
                            Beyond Rooms &amp; Bookings
                        </motion.h2>
                        <motion.p
                            className="text-body mb-6"
                            variants={fadeInUp}
                        >
                            Beyond the room, enjoy our curated selection of premium facilities designed
                            for relaxation and wellness.
                        </motion.p>
                    </motion.div>
                    <motion.div
                        className="grid sm:grid-cols-2 gap-5"
                        variants={stagger}
                    >
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-5 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">Luxury Spa</h3>
                            <p className="text-xs text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Indulge in holistic treatments and massages in our serene wellness center.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-5 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">Fine Dining</h3>
                            <p className="text-xs text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Experience gourmet cuisine cooked by world‑renowned chefs in an elegant
                                setting.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-5 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">Infinity Pool</h3>
                            <p className="text-xs text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Relax by our skyline infinity pool with breathtaking views of the city.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-5 py-4 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3 className="text-display text-sm mb-1 dark:text-[#FDF8F3]">Private Theater</h3>
                            <p className="text-xs text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Enjoy exclusive screenings in our comfortable, state‑of‑the‑art private
                                theater.
                            </p>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* SERVICES / PLATFORM MODULES */}
            <motion.section
                className="py-16 bg-[#FDF8F3] dark:bg-[#121212]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <motion.div
                    className="max-w-[1400px] mx-auto px-6"
                    variants={fadeInUp}
                >
                    <motion.div
                        className="text-center max-w-xl mx-auto mb-10"
                        variants={fadeInUp}
                    >
                        <motion.p
                            className="text-subtitle"
                            variants={fadeInUp}
                        >
                            What We Offer
                        </motion.p>
                        <motion.h2
                            className="text-section-title"
                            variants={fadeInUp}
                        >
                            A Platform Built for Hotels
                        </motion.h2>
                        <motion.p
                            className="text-body"
                            variants={fadeInUp}
                        >
                            The platform groups hotel operations into intuitive sections so guests and
                            staff can focus on experiences, not complexity.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-3 gap-6"
                        variants={stagger}
                    >
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Room Discovery
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Curated room carousels, galleries, and highlights help guests quickly find
                                the stay that matches their style.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Booking Management
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                A refined booking experience with summary cards, timelines, and admin tools
                                for viewing, updating, and reviewing stays.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Profiles &amp; Preferences
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Guests can see their details and link every booking to a profile designed
                                around clarity and trust.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 md:col-span-3 lg:col-span-1 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Operations Backbone
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Admin pages for rooms, users, and bookings bring structure behind the
                                scenes, while guests see only the polished front.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 md:col-span-3 lg:col-span-1 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Customizable Branding
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Tailor the platform to match your hotel's personality with customizable
                                branding options.
                            </p>
                        </motion.div>
                        <motion.div
                            className="rounded-xl bg-white shadow-md px-6 py-6 md:col-span-3 lg:col-span-1 dark:bg-gray-800 dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            <h3
                                className="text-display text-lg mb-2 dark:text-[#FDF8F3]"
                            >
                                Easy Check‑In/Check‑Out
                            </h3>
                            <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                Streamline the guest experience with easy check-in and check-out processes.
                                processes.
                            </p>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* --- UPGRADED TEAM SECTION --- */}
            <section className="py-24 max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <span className="text-[#8B6914] tracking-[0.2em] text-sm font-bold uppercase dark:text-[#D4AF37]">The Artisans</span>
                    <h2 className="font-serif text-4xl text-[#2C2416] mt-3 dark:text-[#FDF8F3]">Meet the Team</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Note: Ensure you have your 'teamMembers' array defined at the top of the file */}
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="group relative overflow-hidden rounded-lg cursor-pointer h-[450px]"
                        >
                            <img
                                src={member.img}
                                alt={member.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* Dark Gradient Overlay that appears on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>

                            {/* Text slides up on hover */}
                            <div className="absolute bottom-0 left-0 p-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <h3 className="text-white font-serif text-2xl mb-1 dark:text-[#FDF8F3]">{member.name}</h3>
                                <p className="text-[#D4C4A8] uppercase tracking-widest text-xs font-semibold dark:text-[#D4AF37]">{member.role}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* STORY / TIMELINE */}
            <motion.section
                className="py-16 bg-[#F5F0E6] dark:bg-[#1E1E1E]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <motion.div
                    className="max-w-[1400px] mx-auto px-6"
                    variants={fadeInUp}
                >
                    <motion.div
                        className="text-center max-w-xl mx-auto mb-10"
                        variants={fadeInUp}
                    >
                        <motion.p
                            className="text-subtitle dark:text-[#D4AF37]"
                            variants={fadeInUp}
                        >
                            How It All Comes Together
                        </motion.p>
                        <motion.h2
                            className="text-section-title dark:text-[#FDF8F3]"
                            variants={fadeInUp}
                        >
                            From Idea to Guest Journey
                        </motion.h2>
                    </motion.div>
                    <motion.div
                        className="relative max-w-3xl mx-auto"
                        variants={stagger}
                    >
                        <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-[#D4C4A8]" />
                        <motion.div
                            className="space-y-8"
                            variants={stagger}
                        >
                            <motion.div
                                className="relative pl-10"
                                variants={fadeInUp}
                            >
                                <div className="absolute left-1.5 top-1 h-4 w-4 rounded-full bg-[#8B6914]" />
                                <h3 className="text-sm font-semibold mb-1 dark:text-[#FDF8F3]">Inspiration</h3>
                                <p className="text-sm text-[#6B5B4F] leading-6">
                                    Start with a classic luxury hotel feel, then design a digital experience
                                    that matches the real‑world atmosphere.
                                </p>
                            </motion.div>
                            <motion.div
                                className="relative pl-10"
                                variants={fadeInUp}
                            >
                                <div className="absolute left-1.5 top-1 h-4 w-4 rounded-full bg-[#8B6914] dark:bg-[#D4AF37]" />
                                <h3 className="text-sm font-semibold mb-1 dark:text-[#FDF8F3]">Structure</h3>
                                <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                    Map out pages for home, rooms, bookings, profiles, and admin, keeping a
                                    single visual language across them all.
                                </p>
                            </motion.div>
                            <motion.div
                                className="relative pl-10"
                                variants={fadeInUp}
                            >
                                <div className="absolute left-1.5 top-1 h-4 w-4 rounded-full bg-[#8B6914] dark:bg-[#D4AF37]" />
                                <h3 className="text-sm font-semibold mb-1 dark:text-[#FDF8F3]">Polish</h3>
                                <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                    Add carousels, zooming hero images, timelines, and gallery interactions
                                    so the website feels alive yet calm.
                                </p>
                            </motion.div>
                            <motion.div
                                className="relative pl-10"
                                variants={fadeInUp}
                            >
                                <div className="absolute left-1.5 top-1 h-4 w-4 rounded-full bg-[#8B6914] dark:bg-[#D4AF37]" />
                                <h3 className="text-sm font-semibold mb-1 dark:text-[#FDF8F3]">Live Platform</h3>
                                <p className="text-sm text-[#6B5B4F] leading-6 dark:text-gray-300">
                                    Launch the website and start inviting guests to book their stays. The
                                    website is now live and guests can start booking their stays, enjoying a
                                    world of timeless luxury and unforgettable moments.
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* VISIT / CTA STYLE STRIP */}
            <motion.section
                className="py-24 relative bg-fixed bg-cover bg-center"
                style={{ backgroundImage: `url(${visitBg})` }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <div className="absolute inset-0 bg-[rgba(44,36,22,0.75)]" />
                <motion.div
                    className="relative max-w-[1400px] mx-auto px-6 text-center text-white"
                    variants={fadeInUp}
                >
                    <motion.h2
                        className="text-section-title text-white mb-3 dark:text-[#FDF8F3]"
                        variants={fadeInUp}
                    >
                        Experience Hotelmania in Action
                    </motion.h2>
                    <motion.p
                        className="max-w-xl mx-auto text-sm md:text-[0.98rem] leading-7 text-[#F5F0E6] mb-6 dark:text-gray-300"
                        variants={fadeInUp}
                    >
                        Scroll through curated images that echo the mood of Hotelmania: warm lobbies,
                        tranquil rooms, and quietly luxurious details.
                    </motion.p>
                    <motion.p
                        className="text-xs md:text-sm text-[#E8DCC8] dark:text-[#D4AF37]"
                        variants={fadeInUp}
                    >
                        Whether for a weekend getaway or a long vacation, we are ready to welcome you
                        to a world of timeless luxury and unforgettable moments.
                    </motion.p>
                </motion.div>
            </motion.section>

            {/* --- NEW TESTIMONIALS SECTION --- */}
            <motion.section
                className="py-24 bg-[#E8DCC8]/30 dark:bg-gray-900/30"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
            >
                <motion.div
                    className="max-w-4xl mx-auto px-6 text-center"
                    variants={fadeInUp}
                >
                    <motion.div
                        variants={fadeInUp}
                    >
                        <BsQuote className="text-6xl text-[#8B6914]/30 mx-auto mb-8 dark:text-[#D4AF37]/30" />
                    </motion.div>
                    <motion.h2
                        className="font-serif text-3xl md:text-4xl text-[#2C2416] mb-12 dark:text-[#FDF8F3]"
                        variants={fadeInUp}
                    >
                        "What our guests say"
                    </motion.h2>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        variants={stagger}
                    >
                        {/* You can move this array to the top of your file later */}
                        {[
                            { text: "An absolute dream. The service was impeccable.", author: "James & Claire" },
                            { text: "The definition of luxury. I never wanted to leave.", author: "Michael T." },
                            { text: "A hidden gem in the heart of the city.", author: "Sarah W." }
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                variants={fadeInUp}
                                whileHover={{ y: -10 }}  // Lifts card up on hover
                                className="bg-white p-8 rounded-xl shadow-sm border border-[#FDF8F3] dark:bg-gray-800 dark:border-gray-700"
                            >
                                <p className="text-[#6B5B4F] italic mb-6 dark:text-gray-300">"{t.text}"</p>
                                <div className="font-bold text-[#8B6914] text-sm uppercase tracking-widest dark:text-[#D4AF37]">{t.author}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* GALLERY */}
            <motion.section
                className="py-20 bg-[#FDF8F3] dark:bg-[#121212]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7 }}
            >
                <motion.div
                    className="max-w-[1400px] mx-auto px-6"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    <motion.div
                        className="text-center max-w-xl mx-auto mb-10"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <motion.p
                            className="text-subtitle dark:text-[#D4AF37]"
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            Gallery
                        </motion.p>
                        <motion.h2
                            className="text-section-title dark:text-[#FDF8F3]"
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        >
                            A Glimpse Into Our World
                        </motion.h2>
                        <motion.p
                            className="text-body dark:text-gray-300"
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                        >
                            Scroll through curated images that echo the mood of Hotelmania: warm lobbies,
                            tranquil rooms, and quietly luxurious details.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-4 gap-4 md:[&>*:first-child]:col-span-2 md:[&>*:first-child]:row-span-2 mb-8"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        {visibleImages.map((src, index) => (
                            <motion.article
                                key={`${src}-${index}`}
                                className={`relative rounded-xl overflow-hidden shadow-md cursor-pointer group ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''
                                    }`}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                            >
                                <img
                                    src={src}
                                    alt={`Hotel view ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-[rgba(44,36,22,0)] group-hover:bg-[rgba(44,36,22,0.45)] transition" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                    <span className="px-4 py-2 rounded-full bg-white/20 text-white text-xs tracking-[0.16em] uppercase">
                                        View
                                    </span>
                                </div>
                            </motion.article>
                        ))}
                    </motion.div>

                    <motion.div
                        className="flex justify-center"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        {canLoadMore ? (
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                className="px-6 py-3 border-2 border-[#8B6914] text-[#8B6914] text-[0.8rem] font-semibold uppercase tracking-[0.16em] rounded hover:bg-[#8B6914] hover:text-white transition dark:border-[#D4AF37] dark:text-[#D4AF37] dark:hover:bg-[#D4AF37]"
                            >
                                Load More Photos
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setVisibleCount(4)}
                                className="px-6 py-3 border-2 border-[#8B6914] text-[#8B6914] text-[0.8rem] font-semibold uppercase tracking-[0.16em] rounded hover:bg-[#8B6914] hover:text-white transition dark:border-[#D4AF37] dark:text-[#D4AF37] dark:hover:bg-[#D4AF37]"
                            >
                                See Less
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* KEYFRAMES */}
            <style>{`
        @keyframes aboutHeroZoom {
          0% { transform: scale(1.08); }
          100% { transform: scale(1.12); }
        }
      `}</style>
            <Footer />
        </div>
    );
};

export default About;
