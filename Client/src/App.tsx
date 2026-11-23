
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import RequireRole from './components/RequireRole';
import { Spinner, Toaster } from './components/ui';
import { SITE } from './config/site';
import { ADMIN_ROUTE_ROLES } from './utils/auth';
import Home from './pages/user/Home';
import About from './pages/user/About';
import Rooms from './pages/user/Rooms';
import RoomDetails from './pages/user/RoomDetails';
import Hotels from './pages/user/Hotels';
import HotelDetails from './pages/user/HotelDetails';
import Bookings from './pages/user/Bookings';
import Book from './pages/user/Book';
import BookingConfirmation from './pages/user/BookingConfirmation';
import Contact from './pages/user/Contact';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Profile from './pages/user/Profile';
import Policies from './pages/user/Policies';
import NotFound from './pages/user/NotFound';
import Offers from './pages/user/Offers';
import Dining from './pages/user/Dining';
import Spa from './pages/user/Spa';
import Gallery from './pages/user/Gallery';
import Faq from './pages/user/Faq';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ManageBookings = lazy(() => import('./pages/admin/ManageBookings'));
const ManageHotels = lazy(() => import('./pages/admin/ManageHotels'));
const ManageRooms = lazy(() => import('./pages/admin/ManageRooms'));
const ManageTransactions = lazy(() => import('./pages/admin/ManageTransactions'));
const ManageFeedbacks = lazy(() => import('./pages/admin/ManageFeedbacks'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManageEnquiries = lazy(() => import('./pages/admin/ManageEnquiries'));
const FrontDesk = lazy(() => import('./pages/admin/FrontDesk'));
const ReservationsCalendar = lazy(() => import('./pages/admin/ReservationsCalendar'));
const Housekeeping = lazy(() => import('./pages/admin/Housekeeping'));
const RatesSettings = lazy(() => import('./pages/admin/RatesSettings'));

// Browser-tab titles per route (detail pages keep the default until they load their own)
const PAGE_TITLES: Record<string, string> = {
  '/': `${SITE.name} | Boutique Hotels in Sri Lanka`,
  '/about': 'About Us',
  '/rooms': 'Rooms & Suites',
  '/hotels': 'Our Hotels',
  '/bookings': 'My Bookings',
  '/book': 'Book Your Stay',
  '/contact': 'Contact',
  '/login': 'Sign In',
  '/register': 'Create Account',
  '/profile': 'My Profile',
  '/policies': 'Policies',
  '/offers': 'Offers & Packages',
  '/dining': 'Dining',
  '/spa': 'Spa & Wellness',
  '/gallery': 'Gallery',
  '/faq': 'FAQ',
  '/admin/enquiries': 'Enquiries · Admin',
  '/admin/frontdesk': 'Front desk · Admin',
  '/admin/calendar': 'Calendar · Admin',
  '/admin/housekeeping': 'Housekeeping · Admin',
  '/admin/rates': 'Rates & settings · Admin',
  '/admin': 'Dashboard · Admin',
  '/admin/dashboard': 'Dashboard · Admin',
  '/admin/bookings': 'Bookings · Admin',
  '/admin/hotels': 'Hotels · Admin',
  '/admin/rooms': 'Rooms · Admin',
  '/admin/transactions': 'Payments · Admin',
  '/admin/feedbacks': 'Feedback & Requests · Admin',
  '/admin/users': 'Users · Admin',
};

// Search-result descriptions per public page (others keep the site default from index.html)
const DEFAULT_DESCRIPTION = 'Book your stay at HotelMania: ocean-view rooms in Colombo, Sri Lankan dining, an Ayurvedic spa and our best rates when you book direct.';
const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/rooms': 'Rooms and suites at HotelMania, Colombo. Check live availability and the full price for your dates.',
  '/hotels': 'Our hotels in Sri Lanka, from the seafront in Colombo to the hills.',
  '/dining': 'The Verandah, Salt & Spice seafood grill and Skyline rooftop bar: Sri Lankan flavours by the ocean.',
  '/spa': 'Ayurvedic treatments, steam and a garden pool at the HotelMania spa in Colombo.',
  '/offers': 'Packages and seasonal offers at HotelMania, Colombo: long stays, honeymoons and early-booking savings.',
  '/gallery': 'Photos of HotelMania: rooms, dining, spa and the pool terrace.',
  '/faq': 'Answers about booking, payments, check-in times, airport transfers and more.',
  '/contact': 'Contact HotelMania reservations by phone, email or our enquiry form.',
  '/about': 'The story of HotelMania and the team behind it.',
};

const setMeta = (selector: string, attr: string, value: string) => {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute(attr, value);
};

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const title = PAGE_TITLES[pathname];
    document.title = !title ? SITE.name : pathname === '/' ? title : `${title} | ${SITE.name}`;
    const description = PAGE_DESCRIPTIONS[pathname] || DEFAULT_DESCRIPTION;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', document.title);
    // New page starts at the top, unless it links to an anchor (e.g. /policies#privacy)
    if (!hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <RouteEffects />
        <Toaster />
        <div className="bg-ivory text-ink dark:bg-night dark:text-cream">
          {/* Staff pages load on demand so guests never download them */}
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/room/:id" element={<RoomDetails />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotel/:id" element={<HotelDetails />} />
            <Route path="/book" element={<Book />} />
            <Route path="/booking/:id" element={<RequireRole roles={['guest', 'admin', 'receptionist', 'housekeeping']}><BookingConfirmation /></RequireRole>} />
            <Route path="/bookings" element={<RequireRole roles={['guest', 'admin', 'receptionist', 'housekeeping']}><Bookings /></RequireRole>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<RequireRole roles={['guest', 'admin', 'receptionist', 'housekeeping']}><Profile /></RequireRole>} />

            <Route path="/policies" element={<Policies />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/dining" element={<Dining />} />
            <Route path="/spa" element={<Spa />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/faq" element={<Faq />} />

            <Route path="/admin" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin']}><Dashboard /></RequireRole>} />
            <Route path="/admin/dashboard" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/dashboard']}><Dashboard /></RequireRole>} />
            <Route path="/admin/bookings" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/bookings']}><ManageBookings /></RequireRole>} />
            <Route path="/admin/hotels" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/hotels']}><ManageHotels /></RequireRole>} />
            <Route path="/admin/rooms" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/rooms']}><ManageRooms /></RequireRole>} />
            <Route path="/admin/transactions" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/transactions']}><ManageTransactions /></RequireRole>} />
            <Route path="/admin/feedbacks" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/feedbacks']}><ManageFeedbacks /></RequireRole>} />
            <Route path="/admin/users" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/users']}><ManageUsers /></RequireRole>} />
            <Route path="/admin/enquiries" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/enquiries']}><ManageEnquiries /></RequireRole>} />
            <Route path="/admin/frontdesk" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/frontdesk']}><FrontDesk /></RequireRole>} />
            <Route path="/admin/calendar" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/calendar']}><ReservationsCalendar /></RequireRole>} />
            <Route path="/admin/housekeeping" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/housekeeping']}><Housekeeping /></RequireRole>} />
            <Route path="/admin/rates" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/rates']}><RatesSettings /></RequireRole>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;