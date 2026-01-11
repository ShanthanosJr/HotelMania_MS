import { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';

type RatingProps = { value: number };

const StarRating: React.FC<RatingProps> = ({ value }) => (
  <div className="flex justify-center gap-1 mt-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < value ? 'text-[#E8DCC8]' : 'text-[#D4C4A8]'
          }`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const Home: React.FC = () => {
  const testimonialsVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => { });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );
    if (testimonialsVideoRef.current) {
      observer.observe(testimonialsVideoRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const aboutImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
  ];

  const roomCards = [
    {
      title: 'Deluxe Suite',
      description:
        'Spacious suite with stunning city views, featuring a king-size bed, marble bathroom, and private balcony.',
      price: 350,
      badge: 'Popular',
      image:
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    },
    {
      title: 'Executive Room',
      description:
        'Elegant room designed for business travelers with a dedicated work space and premium amenities.',
      price: 280,
      image:
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
    },
    {
      title: 'Family Suite',
      description:
        'Perfect for families with interconnected rooms, children’s amenities, and a cozy living area.',
      price: 450,
      badge: 'Best Value',
      image:
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    },
  ];

  const galleryImages = [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ];
  const testimonials = [
    {
      text: 'An absolutely magnificent experience. The attention to detail, the impeccable service, and the stunning ambiance made our anniversary celebration truly unforgettable.',
      name: 'Sarah & Michael Johnson',
      location: 'New York, USA',
      rating: 5,
    },
    {
      text: 'From check-in to check-out, everything was flawless. The staff anticipated our needs before we even asked.',
      name: 'Alicia Fernandez',
      location: 'Madrid, Spain',
      rating: 4,
    },
    {
      text: 'The best hotel stay we have ever had – luxurious, warm, and incredibly comfortable.',
      name: 'Kenji Tanaka',
      location: 'Tokyo, Japan',
      rating: 5,
    },
    {
      text: 'A truly exceptional experience. The hotel exceeded our expectations in every way.',
      name: 'Sophia Chen',
      location: 'Shanghai, China',
      rating: 5,
    },
    {
      text: 'A wonderful stay with a friendly and helpful staff. The room was clean and comfortable.',
      name: 'David Lee',
      location: 'Sydney, Australia',
      rating: 4,
    },
    {
      text: 'A fantastic place to unwind and recharge. The hotel is beautifully decorated and the staff is always friendly and helpful.',
      name: 'Emily White',
      location: 'London, UK',
      rating: 5,
    },
    {
      text: 'A perfect getaway with family and friends. The hotel is located in a prime location and the staff went above and beyond to make our stay memorable.',
      name: 'Mark and Lisa',
      location: 'Paris, France',
      rating: 4,
    },
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
      {/* HEADER */}
      <Navbar />

      {/* HERO */}
      <motion.section
        id="home"
        className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.pexels.com/photos/11434425/pexels-photo-11434425.jpeg"
            alt="Luxury hotel exterior"
            className="w-full h-full object-cover scale-105 animate-[heroZoom_20s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,36,22,0.4)] via-[rgba(44,36,22,0.5)] to-[rgba(44,36,22,0.6)]" />
        </div>
        <motion.div
          className="relative z-10 max-w-3xl text-center text-white px-6"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.p
            className="text-subtitle !text-[#E8DCC8] dark:text-[#A8A29E] mb-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Welcome to Luxury
          </motion.p>
          <motion.h1
            className="text-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight drop-shadow-xl text-white dark:text-[#F5F0E6]"
            style={{ fontFamily: 'Playfair Display, serif' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Experience Timeless Elegance &amp; Comfort
          </motion.h1>
          <motion.p
            className="text-sm md:text-base text-[#F5F0E6] dark:text-gray-300 max-w-xl mx-auto mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Discover a sanctuary of refined luxury where every detail is crafted to
            perfection. Immerse yourself in an unforgettable stay at Grand Vista Hotel.
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <button className="px-7 py-3 text-xs font-semibold tracking-[0.2em] uppercase bg-[#8B6914] dark:bg-[#D4AF37] border-2 border-[#8B6914] dark:border-[#D4AF37] rounded text-white hover:bg-white hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition">
              Explore Rooms
            </button>
            <button className="px-7 py-3 text-xs font-semibold tracking-[0.2em] uppercase bg-transparent dark:bg-transparent border-2 border-white dark:border-[#D4AF37] rounded text-white dark:text-[#D4AF37] hover:bg-white hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition">
              Virtual Tour
            </button>
          </motion.div>
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-1/2 flex flex-col items-center text-white animate-[bounce_2s_infinite]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <span className="text-[0.7rem] tracking-[0.2em] uppercase">
            Scroll Down
          </span>
          <svg
            className="w-6 h-6 mt-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M12 5v14M5 12l7 7 7-7" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </motion.div>
      </motion.section>

      {/* BOOKING BAR */}
      <motion.section
        className="-mt-14 pb-16 relative z-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <motion.div
          className="max-w-[1400px] mx-auto px-6"
          variants={fadeInUp}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl px-6 py-6 md:px-8 md:py-7 flex flex-wrap gap-4 items-end justify-between"
            variants={stagger}
          >
            {[
              { label: 'Check In', type: 'date' },
              { label: 'Check Out', type: 'date' },
            ].map(field => (
              <motion.div
                key={field.label}
                className="flex-1 min-w-[150px] max-w-[230px]"
                variants={fadeInUp}
              >
                <label className="block text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[#6B5B4F] mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  className="w-full px-3 py-3 rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] border border-[#D4C4A8] dark:border-[#444] text-sm text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#333] transition"
                />
              </motion.div>
            ))}
            <motion.div
              className="flex-1 min-w-[150px] max-w-[230px]"
              variants={fadeInUp}
            >
              <label className="block text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[#6B5B4F] dark:text-gray-300 mb-2">
                Guests
              </label>
              <select className="w-full px-3 py-3 rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] border border-[#D4C4A8] dark:border-[#444] text-sm text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#333] transition">
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n}>{n} Guest{n > 1 && 's'}</option>
                ))}
              </select>
            </motion.div>
            <motion.div
              className="flex-1 min-w-[150px] max-w-[230px]"
              variants={fadeInUp}
            >
              <label className="block text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[#6B5B4F] dark:text-gray-300 mb-2">
                Room Type
              </label>
              <select className="w-full px-3 py-3 rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] border border-[#D4C4A8] dark:border-[#444] text-sm text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#333] transition">
                <option>All Rooms</option>
                <option>Deluxe Suite</option>
                <option>Executive Room</option>
                <option>Family Suite</option>
              </select>
            </motion.div>
            <motion.button
              className="px-6 py-3 bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black text-[0.75rem] font-semibold tracking-[0.18em] uppercase rounded border-none shadow-md hover:bg-[#5C4033] dark:hover:bg-[#A67C52] transition"
              variants={fadeInUp}
            >
              Check Availability
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ABOUT */}
      <motion.section
        id="about"
        className="py-24 bg-[#FDF8F3] dark:bg-[#121212]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <motion.div
          className="max-w-[1400px] mx-auto px-6 grid md:grid-cols-2 gap-14 items-center"
          variants={fadeInUp}
        >
          <motion.div
            className="grid grid-cols-2 gap-4 relative"
            variants={stagger}
          >
            <motion.div
              className="col-span-2 rounded-lg overflow-hidden shadow-xl"
              variants={fadeInUp}
            >
              <img
                src={aboutImages[0]}
                alt="Luxury hotel lobby"
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
            <motion.div
              className="rounded-lg overflow-hidden shadow-xl"
              variants={fadeInUp}
            >
              <img
                src={aboutImages[1]}
                alt="Hotel exterior"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
            <motion.div
              className="rounded-lg overflow-hidden shadow-xl"
              variants={fadeInUp}
            >
              <img
                src={aboutImages[2]}
                alt="Hotel pool"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </motion.div>
          <motion.div
            className="md:pl-6"
            variants={stagger}
          >
            <motion.p
              className="text-subtitle text-[#2C2416] dark:text-[#F5F0E6]"
              variants={fadeInUp}
            >
              About Our Hotel
            </motion.p>
            <motion.h2
              className="text-section-title text-[#2C2416] dark:text-[#F5F0E6]"
              variants={fadeInUp}
            >
              A Legacy of Luxury Since 1920
            </motion.h2>
            <motion.p
              className="text-body mb-4 text-[#6B5B4F] dark:text-gray-300"
              variants={fadeInUp}
            >
              Nestled in the heart of the city, Grand Vista Hotel has been a beacon of
              elegance and sophistication for over a century. Our commitment to exceptional
              service and attention to detail has made us the preferred destination for
              discerning travelers from around the world.
            </motion.p>
            <motion.p
              className="text-body mb-6 text-[#6B5B4F] dark:text-gray-300"
              variants={fadeInUp}
            >
              Every corner of our establishment tells a story of timeless beauty, where
              modern amenities blend seamlessly with classic charm.
            </motion.p>
            <motion.div
              className="grid grid-cols-2 gap-4 mb-6"
              variants={stagger}
            >
              {['24/7 Security', 'Concierge Service', '5-Star Rating', 'Premium Wellness'].map(
                feature => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-3"
                    variants={fadeInUp}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#E8DCC8] flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-[#8B6914]" />
                    </div>
                    <span className="text-sm font-medium text-[#2C2416] dark:text-gray-300">{feature}</span>
                  </motion.div>
                )
              )}
            </motion.div>
            <motion.button
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#8B6914] dark:border-[#D4AF37] text-[#8B6914] dark:text-[#D4AF37] text-[0.8rem] font-semibold uppercase tracking-[0.16em] rounded hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black transition"
              variants={fadeInUp}
            >
              Learn More
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ROOMS */}
      <motion.section
        id="rooms"
        className="py-24 bg-[#F5F0E6] dark:bg-[#1E1E1E]"
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
            className="text-center max-w-xl mx-auto mb-12"
            variants={fadeInUp}
          >
            <motion.p
              className="text-subtitle"
              variants={fadeInUp}
            >
              Our Accommodations
            </motion.p>
            <motion.h2
              className="text-section-title"
              variants={fadeInUp}
            >
              Exquisite Rooms &amp; Suites
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger}
          >
            {roomCards.map((room) => (
              <motion.article
                key={room.title}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:-translate-y-2 hover:shadow-xl transition"
                variants={fadeInUp}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={room.image}
                    alt={room.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                  />
                  {room.badge && (
                    <span className="absolute top-4 left-4 px-3 py-1 text-[0.7rem] uppercase tracking-[0.14em] bg-[#8B6914] text-white rounded">
                      {room.badge}
                    </span>
                  )}
                </div>
                <div className="px-6 py-6">
                  <h3
                    className="text-display text-xl mb-2"
                  >
                    {room.title}
                  </h3>
                  <p className="text-sm text-[#6B5B4F] dark:text-gray-300 mb-4 leading-6">
                    {room.description}
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4 text-[0.78rem] text-[#6B5B4F]">
                    {['Smart TV', 'Free WiFi', 'Mini Bar'].map(label => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1"
                      >
                        <span className="w-3 h-3 rounded-full bg-[#8B6914]" />
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#E8DCC8]">
                    <div>
                      <span className="text-xl font-semibold text-[#8B6914]">
                        ${room.price}
                      </span>
                      <span className="text-xs text-[#6B5B4F] ml-1">/ night</span>
                    </div>
                    <button className="px-4 py-2 bg-[#E8DCC8] text-[#8B6914] text-[0.75rem] font-semibold uppercase tracking-[0.14em] rounded hover:bg-[#8B6914] hover:text-white transition">
                      Book Now
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* AMENITIES SECTION */}
      <motion.section
        id="amenities"
        className="py-24 bg-[#FDF8F3] dark:bg-[#121212]"
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
            className="text-center max-w-xl mx-auto mb-12"
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
              World-Class Amenities
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-4 gap-6"
            variants={stagger}
          >
            {[
              {
                title: 'Spa & Wellness',
                desc: 'Rejuvenate your body and mind at our award‑winning spa.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16 2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: 'Fine Dining',
                desc: 'Signature restaurants with curated menus and world‑class chefs.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M6 3v7a2 2 0 0 1-2 2M10 3v7a2 2 0 0 1-2 2m0 9V12M14 4h4a1 1 0 0 1 1 1v7h-5V4zM16 21v-7"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: 'Infinity Pool',
                desc: 'Rooftop infinity pool with panoramic skyline and sunset views.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M3 18c1 0 1.5-.5 2.5-.5S7 18 8 18s1.5-.5 2.5-.5S12 18 13 18s1.5-.5 2.5-.5S17 18 18 18s1.5-.5 2.5-.5"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    <path
                      d="M4 10a4 4 0 0 1 7-2 4 4 0 0 1 7 2v4H4v-4z"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: 'Fitness Center',
                desc: 'State‑of‑the‑art gym, personal trainers, and wellness programs.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M6 6v12M18 6v12M3 9h3M18 9h3M3 15h3M18 15h3"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    <rect
                      x="8"
                      y="7"
                      width="8"
                      height="10"
                      rx="2"
                      strokeWidth={1.8}
                    />
                  </svg>
                ),
              },
            ].map((amenity) => (
              <motion.div
                key={amenity.title}
                className="group relative bg-white rounded-xl shadow-md px-7 py-8 text-center overflow-hidden hover:-translate-y-2 hover:shadow-xl transition"
                variants={fadeInUp}
              >
                {/* soft glow behind icon */}
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-[#B8D4E3]/40 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* icon wrapper */}
                <div className="relative mx-auto mb-5 flex items-center justify-center">
                  <div className="relative">
                    {/* outer ring that glows */}
                    <div className="h-16 w-16 rounded-full bg-[#B8D4E3] flex items-center justify-center transition-all duration-300 group-hover:bg-[#8B6914] group-hover:shadow-[0_0_30px_rgba(139,105,20,0.75)]">
                      <span className="text-[#5C4033] group-hover:text-white transition-colors">
                        {amenity.icon}
                      </span>
                    </div>
                    {/* subtle inner highlight */}
                    <div className="pointer-events-none absolute inset-1 rounded-full border border-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <h3
                  className="text-display text-lg mb-2"
                >
                  {amenity.title}
                </h3>
                <p className="text-sm text-[#6B5B4F] leading-6">
                  {amenity.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* GALLERY */}
      <motion.section
        id="gallery"
        className="py-24 bg-[#F5F0E6] dark:bg-[#1E1E1E]"
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
            className="text-center max-w-xl mx-auto mb-12"
            variants={fadeInUp}
          >
            <motion.p
              className="text-subtitle"
              variants={fadeInUp}
            >
              Photo Gallery
            </motion.p>
            <motion.h2
              className="text-section-title"
              variants={fadeInUp}
            >
              Explore Our Space
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-4 gap-4 md:[&>*:first-child]:col-span-2 md:[&>*:first-child]:row-span-2"
            variants={stagger}
          >
            {galleryImages.map((img, idx) => (
              <motion.div
                key={img}
                className="relative rounded-xl overflow-hidden cursor-pointer group shadow-md hover:shadow-2xl transition"
                variants={fadeInUp}
              >
                <img
                  src={img}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-[rgba(44,36,22,0)] group-hover:bg-[rgba(44,36,22,0.45)] transition" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="11" cy="11" r="7" strokeWidth={2} />
                      <path
                        d="M21 21l-4.35-4.35M11 8v6M8 11h6"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* TESTIMONIALS */}
      <motion.section
        className="py-24 relative overflow-hidden bg-[#F5F0E6] dark:bg-[#1E1E1E]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <video
          ref={testimonialsVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={galleryImages[0]}
        >
          <source src="https://www.pexels.com/download/video/6467633/" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(139,105,20,0.85)] to-[rgba(92,64,51,0.9)]" />
        <motion.div
          className="relative max-w-[900px] mx-auto px-6 text-center text-white"
          variants={stagger}
        >
          <motion.p
            className="text-subtitle !text-[#E8DCC8] mb-4"
            variants={fadeInUp}
          >
            Guest Reviews
          </motion.p>
          <motion.h2
            className="text-section-title"
            variants={fadeInUp}
          >
            What Our Guests Say
          </motion.h2>

          <motion.div
            className="relative h-52 md:h-56 mb-10"
            variants={fadeInUp}
          >
            {testimonials.map((t, index) => (
              <div
                key={t.name}
                className={`absolute inset-0 transition-all duration-700 ${index === currentTestimonial
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
              >
                <motion.p
                  className="font-display text-xl md:text-2xl italic mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  “{t.text}”
                </motion.p>
                <motion.h3
                  className="text-sm font-semibold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {t.name}
                </motion.h3>
                <motion.p
                  className="text-xs text-[#E8DCC8]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  {t.location}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <StarRating value={t.rating} />
                </motion.div>
              </div>
            ))}
          </motion.div>

          {/* dots */}
          <motion.div
            className="flex justify-center gap-2 mb-6"
            variants={fadeInUp}
          >
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`h-2 w-6 rounded-full transition-all ${index === currentTestimonial ? 'bg-white' : 'bg-[#E8DCC8]/50'
                  }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </motion.div>

          {/* arrows */}
          <motion.div
            className="flex justify-center gap-4"
            variants={fadeInUp}
          >
            <button
              onClick={() =>
                setCurrentTestimonial(
                  (currentTestimonial - 1 + testimonials.length) % testimonials.length
                )
              }
              className="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() =>
                setCurrentTestimonial((currentTestimonial + 1) % testimonials.length)
              }
              className="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      </motion.section>


      {/* CTA */}
      <motion.section
        className="py-24 relative bg-fixed bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&q=80)',
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#B8D4E3]/90 to-[#7EB5D6]/85" />
        <motion.div
          className="relative max-w-[800px] mx-auto px-6 text-center"
          variants={fadeInUp}
        >
          <motion.h2
            className="text-section-title text-[#2C2416] dark:text-[#F5F0E6]"
            variants={fadeInUp}
          >
            Ready to Experience Luxury?
          </motion.h2>
          <motion.p
            className="text-body text-[#2C2416] dark:text-gray-300 mb-8"
            variants={fadeInUp}
          >
            Book your stay today and discover why Grand Vista Hotel has been the preferred
            choice for travelers seeking exceptional hospitality for over a century.
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            variants={fadeInUp}
          >
            <button className="px-7 py-3 bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black text-[0.8rem] font-semibold tracking-[0.18em] uppercase rounded border-2 border-[#8B6914] dark:border-[#D4AF37] hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition">
              Book Your Stay
            </button>
            <button className="px-7 py-3 bg-transparent dark:bg-transparent text-[#8B6914] dark:text-[#D4AF37] text-[0.8rem] font-semibold tracking-[0.18em] uppercase rounded border-2 border-[#8B6914] dark:border-[#D4AF37] hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black transition">
              Contact Us
            </button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* KEYFRAMES */}
      <style>{`
        @keyframes heroZoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.2); }
        }
        @keyframes bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }
      `}</style>
      <Footer />
    </div>
  );
};

export default Home;
