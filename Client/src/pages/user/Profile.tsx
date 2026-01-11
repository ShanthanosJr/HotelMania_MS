import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import { motion } from 'framer-motion';

// --- Types ---

const profileHeroImage =
    'https://images.pexels.com/photos/161758/governor-s-mansion-montgomery-alabama-grand-staircase-161758.jpeg';

type UserRole = 'guest' | 'admin' | 'receptionist' | 'housekeeping' | string;

type ProfileData = {
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    profilePhoto?: string;
    savedCards?: {
        cardNumber: string;
        cardType: string;
        expiryDate: string;
        last4: string;
        cardHolder: string;
    }[];
};

type StatusState = {
    loading: boolean;
    error: string;
};

type Preferences = {
    travelStyle: 'business' | 'leisure' | 'family' | 'romantic' | '';
    prefersHighFloors: boolean;
    newsletter: boolean;
    language: 'en' | 'si' | 'ta' | 'other';
};

// Booking Types (Ported from Bookings.tsx)
type BookingUser = {
    name?: string;
};

type BookingRoomType = {
    name?: string;
};

type BookingRoom = {
    _id?: string;
    type?: BookingRoomType | string;
};

type Booking = {
    _id?: string;
    id?: string;
    checkInDate?: string;
    checkOutDate?: string;
    status?: string;
    paymentStatus?: string;
    totalPrice?: number;
    user?: BookingUser;
    room?: BookingRoom;
};

type ServiceRequest = {
    _id?: string;
    type?: 'food' | 'cleaning' | 'repair' | string;
    description?: string;
    status?: string;
    createdAt?: string;
    room?: {
        _id?: string;
    } | string;
};

type Tab = 'overview' | 'walkthrough' | 'payments' | 'settings' | 'security';

// --- Maps & Helpers ---

const roleLabelMap: Record<UserRole, string> = {
    guest: 'Guest',
    admin: 'Administrator',
    receptionist: 'Receptionist',
    housekeeping: 'Housekeeping',
};

const roleBadgeMap: Record<UserRole, string> = {
    guest: 'Guest Member',
    admin: 'Hotel Management',
    receptionist: 'Front Desk',
    housekeeping: 'Housekeeping Team',
};

const getRoleLabel = (role?: UserRole) =>
    (role && roleLabelMap[role]) || role || 'Member';

const getRoleBadge = (role?: UserRole) =>
    (role && roleBadgeMap[role]) || 'Member';

const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString() : '—';

const formatStatus = (value?: string) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const getPaymentClass = (value?: string) => {
    if (value === 'paid') return 'bg-emerald-100 text-emerald-700';
    if (value === 'pending') return 'bg-amber-100 text-amber-700';
    if (value === 'refunded') return 'bg-sky-100 text-sky-700';
    return 'bg-slate-100 text-slate-700';
};

const getServiceTypeIcon = (type?: string) => {
    if (type === 'food') return '🍽️';
    if (type === 'cleaning') return '🧹';
    if (type === 'repair') return '🔧';
    return '❓';
};

// --- Component ---

const Profile: React.FC = () => {
    // State: Profile & Auth
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [profileStatus, setProfileStatus] = useState<StatusState>({
        loading: true,
        error: '',
    });

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    // State: Tabs
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // State: Contact Editing
    const [editingContact, setEditingContact] = useState(false);
    const [savingContact, setSavingContact] = useState(false);
    const [contactDraft, setContactDraft] = useState<Pick<
        ProfileData,
        'name' | 'phone'
    >>({ name: '', phone: '' });

    // State: Preferences
    const [preferences, setPreferences] = useState<Preferences>({
        travelStyle: '',
        prefersHighFloors: false,
        newsletter: true,
        language: 'en',
    });

    const [savingPrefs, setSavingPrefs] = useState(false);
    const [prefsSaved, setPrefsSaved] = useState(false);

    // State: Profile Photo Edit
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // State: Bookings
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [bookingsStatus, setBookingsStatus] = useState<StatusState>({
        loading: false,
        error: '',
    });

    // --- Effects & Fetchers ---

    const fetchProfile = async () => {
        try {
            setProfileStatus({ loading: true, error: '' });
            const response = await api.get('/api/auth/profile');
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to load profile');
            }
            const data = await response.json();
            setProfile(data.user);
            setContactDraft({
                name: data.user.name || '',
                phone: data.user.phone || '',
            });
            setProfileStatus({ loading: false, error: '' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error loading profile';
            setProfileStatus({ loading: false, error: message });
        }
    };

    const fetchMyBookings = async () => {
        try {
            setBookingsStatus({ loading: true, error: '' });
            const response = await api.get('/api/bookings/my-bookings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    setBookings(data.data);
                }
            } else {
                throw new Error('Failed to fetch bookings');
            }

            // Fetch service requests as well if bookings exist (or generally)
            const srResponse = await api.get('/api/service-requests');
            if (srResponse.ok) {
                const srData = await srResponse.json();
                if (srData.success && Array.isArray(srData.data)) {
                    setServiceRequests(srData.data);
                }
            }

            setBookingsStatus({ loading: false, error: '' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error loading bookings';
            setBookingsStatus({ loading: false, error: message });
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setProfileStatus({
                loading: false,
                error: 'You need to sign in to view your profile.',
            });
            return;
        }
        fetchProfile();
        fetchMyBookings();
    }, []);

    // --- Handlers ---

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout', {});
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login';
        }
    };

    const handleContactChange: React.ChangeEventHandler<HTMLInputElement> = e => {
        const { name, value } = e.target;
        setContactDraft(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveContact = async () => {
        if (!profile) return;

        try {
            setSavingContact(true);
            const response = await api.put('/api/auth/update-details', {
                name: contactDraft.name,
                phone: contactDraft.phone
            });

            if (!response.ok) {
                throw new Error('Failed to update profile details');
            }

            const data = await response.json();
            setProfile(data.user);
            setEditingContact(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            setSavingContact(false);
        }
    };

    const handlePrefChange = <K extends keyof Preferences>(
        key: K,
        value: Preferences[K],
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setPrefsSaved(false);
    };

    const handleSavePreferences = async () => {
        setSavingPrefs(true);
        setTimeout(() => {
            setSavingPrefs(false);
            setPrefsSaved(true);
        }, 800);
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Please select an image under 5MB.');
            return;
        }

        setUploadingPhoto(true);
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64String = reader.result as string;

            try {
                // Optimistic update
                setProfile(prev => prev ? { ...prev, profilePhoto: base64String } : null);

                const response = await api.put('/api/auth/update-details', {
                    profilePhoto: base64String
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to update photo');
                }

                // Refresh profile to confirm
                fetchProfile();
            } catch (error: unknown) {
                console.error('Error uploading photo:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                alert(`Failed to update profile photo: ${errorMessage}`);
                // Revert optimistic update
                fetchProfile();
            } finally {
                setUploadingPhoto(false);
            }
        };

        reader.readAsDataURL(file);
    };

    // --- Derived State ---

    const initials = profile?.name
        ? profile.name
            .split(' ')
            .map(p => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'GV';

    const upcoming = useMemo(
        () =>
            bookings.filter(
                b =>
                    b.checkOutDate &&
                    new Date(b.checkOutDate).getTime() >= new Date().getTime(),
            ),
        [bookings],
    );

    const past = useMemo(
        () =>
            bookings.filter(
                b =>
                    b.checkOutDate &&
                    new Date(b.checkOutDate).getTime() < new Date().getTime(),
            ),
        [bookings],
    );

    const getRelatedServiceRequests = (booking: Booking) => {
        if (!booking.room?._id) return [];
        return serviceRequests.filter(request => {
            const roomRef = request.room;
            const bookingRoomId = booking.room?._id;
            if (!bookingRoomId) return false;
            // Handle populated vs unpopulated room field
            if (typeof roomRef === 'string') {
                return roomRef === bookingRoomId;
            }
            return roomRef?._id === bookingRoomId;
        });
    };

    // --- Loading / Error Views ---

    if (profileStatus.loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-[#6B5B4F] dark:text-gray-300">
                    Loading profile...
                </div>
                <Footer />
            </div>
        );
    }

    if (profileStatus.error || !profile) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-300">
                    {profileStatus.error || 'Unable to load profile.'}
                </div>
                <Footer />
            </div>
        );
    }

    // --- Tabs Content Renderers ---

    const renderOverview = () => (
        <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
        >
            {/* Quick Stats */}
            <section className="grid gap-4 rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(92,64,51,0.08)] md:grid-cols-3 dark:bg-gray-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] text-xl dark:bg-gray-700 dark:text-[#D4AF37]">
                        🛎️
                    </div>
                    <div>
                        <p className="text-[0.7rem] uppercase tracking-[0.12em] text-[#8B6914] dark:text-[#D4AF37]">
                            Membership
                        </p>
                        <p className="text-[1rem] font-medium dark:text-[#FDF8F3]">
                            {getRoleBadge(profile.role)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] text-xl dark:bg-gray-700 dark:text-[#D4AF37]">
                        📅
                    </div>
                    <div>
                        <p className="text-[0.7rem] uppercase tracking-[0.12em] text-[#8B6914] dark:text-[#D4AF37]">
                            Next Stay
                        </p>
                        <p className="text-[1rem] font-medium dark:text-[#FDF8F3]">
                            {upcoming.length > 0 ? formatDate(upcoming[0].checkInDate) : 'No upcoming stays'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] text-xl dark:bg-gray-700 dark:text-[#D4AF37]">
                        ✨
                    </div>
                    <div>
                        <p className="text-[0.7rem] uppercase tracking-[0.12em] text-[#8B6914] dark:text-[#D4AF37]">
                            Total Stays
                        </p>
                        <p className="text-[1rem] font-medium dark:text-[#FDF8F3]">
                            {past.length} Completed
                        </p>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(92,64,51,0.08)]">
                    <h3 className="mb-4 text-lg font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Welcome Back, {profile.name?.split(' ')[0] || 'Guest'}
                    </h3>
                    <p className="text-[0.9rem] text-[#6B5B4F] leading-relaxed dark:text-gray-300">
                        We are delighted to have you with us. Use this dashboard to manage your reservations,
                        update your personal preferences, and ensure your next stay at Grand Vista is nothing
                        short of perfection.
                    </p>
                    <button
                        onClick={() => setActiveTab('walkthrough')}
                        className="mt-6 text-[0.8rem] font-bold text-[#8B6914] uppercase tracking-wider hover:underline dark:text-[#D4AF37] dark:hover:text-[#D4AF37]"
                    >
                        View My Bookings &rarr;
                    </button>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-[#2C2416] p-6 text-[#F5F0E6] shadow-[0_2px_12px_rgba(92,64,51,0.08)] dark:bg-gray-900 dark:text-[#FDF8F3]">
                    <div className="relative z-10">
                        <h3 className="mb-2 text-lg font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Seasonal Offer
                        </h3>
                        <p className="text-[0.9rem] opacity-90 mb-4 dark:text-gray-300">
                            Enjoy 15% off spa treatments during your next weekend stay. Exclusive for members.
                        </p>
                        <button className="rounded-full bg-[#F5F0E6] px-4 py-2 text-[0.75rem] font-bold uppercase tracking-wider text-[#2C2416] hover:bg-white transition dark:bg-gray-700 dark:text-[#FDF8F3] dark:hover:bg-gray-600">
                            View Details
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-[#8B6914] opacity-20 blur-2xl"></div>
                </div>
            </div>
        </motion.div>
    );

    const renderBookings = () => (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
        >
            {bookingsStatus.loading ? (
                <div className="py-12 text-center text-[#6B5B4F] dark:text-gray-300">Loading your bookings...</div>
            ) : bookingsStatus.error ? (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">{bookingsStatus.error}</div>
            ) : (
                <>
                    {/* Upcoming */}
                    <section>
                        <h3 className="mb-4 text-xl dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>Upcoming Stays</h3>
                        {upcoming.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#D4C4A8] p-8 text-center text-[#6B5B4F] dark:border-gray-600 dark:text-gray-300">
                                <p className="mb-2">No upcoming reservations found.</p>
                                <p className="text-sm">Ready to plan your next escape?</p>
                                <a href="/rooms" className="mt-4 inline-block text-sm font-bold text-[#8B6914] uppercase tracking-wider hover:underline dark:text-[#D4AF37] dark:hover:text-[#D4AF37]">Browse Rooms</a>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcoming.map(booking => (
                                    <div key={booking._id || booking.id} className="rounded-xl bg-white p-5 shadow-sm border border-[#EBE5DA] hover:shadow-md transition dark:bg-gray-800 dark:border-gray-700">
                                        <div className="flex flex-wrap justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-[#8B6914] uppercase tracking-wider mb-1 dark:text-[#D4AF37]">
                                                    {formatStatus(booking.status)}
                                                </p>
                                                <h4 className="text-lg font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    {formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)}
                                                </h4>
                                                <p className="text-sm text-[#6B5B4F] mt-1 dark:text-gray-300">
                                                    Room: {typeof booking.room?.type === 'object' && booking.room?.type?.name ? booking.room.type.name : 'Standard Room'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold text-[#2C2416] dark:text-[#FDF8F3]">
                                                    {booking.totalPrice ? `$${booking.totalPrice}` : 'TBD'}
                                                </p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[0.7rem] font-bold uppercase ${getPaymentClass(booking.paymentStatus)}`}>
                                                    {booking.paymentStatus}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Service Requests Short View */}
                                        {getRelatedServiceRequests(booking).length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-[#F5F0E6] dark:border-gray-700">
                                                <p className="text-xs font-bold text-[#6B5B4F] uppercase mb-2 dark:text-gray-300">Active Requests</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {getRelatedServiceRequests(booking).map(req => (
                                                        <span key={req._id} className="inline-flex items-center gap-1 rounded-full bg-[#F9F7F2] px-2.5 py-1 text-xs text-[#6B5B4F] border border-[#EBE5DA] dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                                            <span>{getServiceTypeIcon(req.type)}</span>
                                                            <span className="truncate max-w-[150px]">{req.description}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Past */}
                    <section>
                        <h3 className="mb-4 text-xl dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>Tracking History</h3>
                        {past.length === 0 ? (
                            <p className="text-sm text-[#6B5B4F] dark:text-gray-300">No past stay history available.</p>
                        ) : (
                            <div className="space-y-4">
                                {past.map(booking => (
                                    <div key={booking._id} className="flex items-center justify-between rounded-xl bg-white p-4 opacity-80 hover:opacity-100 transition shadow-sm dark:bg-gray-800">
                                        <div>
                                            <p className="text-[0.95rem] font-medium dark:text-[#FDF8F3]">
                                                {formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)}
                                            </p>
                                            <p className="text-sm text-[#6B5B4F] dark:text-gray-300">
                                                Total: ${booking.totalPrice}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-[#F5F0E6] px-3 py-1 text-xs font-semibold text-[#6B5B4F] uppercase dark:bg-gray-700 dark:text-gray-300">
                                            {booking.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </motion.div>
    );

    const renderSettings = () => (
        <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] animate-fadeIn">
            {/* Preferences */}
            <div className="space-y-6">
                <div className="rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(92,64,51,0.08)] dark:bg-gray-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                    <h3 className="mb-4 text-lg font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>Stay Preferences</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#6B5B4F] mb-2 dark:text-gray-300">Travel Style</label>
                            <select
                                value={preferences.travelStyle}
                                onChange={e => handlePrefChange('travelStyle', e.target.value as any)}
                                className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:focus:border-[#D4AF37]"
                            >
                                <option value="">Select style</option>
                                <option value="business">Business</option>
                                <option value="leisure">Leisure</option>
                                <option value="family">Family</option>
                                <option value="romantic">Romantic</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#6B5B4F] mb-2 dark:text-gray-300">Language</label>
                            <select
                                value={preferences.language}
                                onChange={e => handlePrefChange('language', e.target.value as any)}
                                className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:focus:border-[#D4AF37]"
                            >
                                <option value="en">English</option>
                                <option value="si">Sinhala</option>
                                <option value="ta">Tamil</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="flex items-center gap-3 text-sm text-[#2C2416] cursor-pointer dark:text-[#FDF8F3]">
                                <div className={`flex h-5 w-5 items-center justify-center rounded border transition ${preferences.prefersHighFloors ? 'bg-[#8B6914] border-[#8B6914]' : 'border-[#D4C4A8] bg-[#FDF8F3]'} dark:border-gray-600 dark:bg-gray-700 ${preferences.prefersHighFloors ? 'dark:bg-[#D4AF37]' : ''}`}>
                                    {preferences.prefersHighFloors && <span className="text-white text-xs">✓</span>}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={preferences.prefersHighFloors}
                                    onChange={e => handlePrefChange('prefersHighFloors', e.target.checked)}
                                />
                                Prefer high-floor rooms
                            </label>

                            <label className="flex items-center gap-3 text-sm text-[#2C2416] cursor-pointer dark:text-[#FDF8F3]">
                                <div className={`flex h-5 w-5 items-center justify-center rounded border transition ${preferences.newsletter ? 'bg-[#8B6914] border-[#8B6914]' : 'border-[#D4C4A8] bg-[#FDF8F3]'}`}>
                                    {preferences.newsletter && <span className="text-white text-xs">✓</span>}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={preferences.newsletter}
                                    onChange={e => handlePrefChange('newsletter', e.target.checked)}
                                />
                                Receive curated offers & updates
                            </label>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-xs text-emerald-700 h-4 dark:text-emerald-400">{prefsSaved && 'Preferences saved.'}</span>
                        <button
                            onClick={handleSavePreferences}
                            disabled={savingPrefs}
                            className="rounded-full bg-[#8B6914] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#725611] transition disabled:opacity-50 dark:bg-[#D4AF37] dark:text-[#2C2416] dark:hover:bg-[#b8952d]"
                        >
                            {savingPrefs ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Details Edit */}
            <div className="rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(92,64,51,0.08)] h-fit dark:bg-gray-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>Contact Info</h3>
                    <button
                        onClick={() => {
                            if (editingContact) handleSaveContact();
                            else {
                                setEditingContact(true);
                                setContactDraft({ name: profile?.name || '', phone: profile?.phone || '' });
                            }
                        }}
                        disabled={savingContact}
                        className="text-xs font-bold text-[#8B6914] uppercase hover:underline disabled:opacity-50 dark:text-[#D4AF37] dark:hover:text-[#D4AF37]"
                    >
                        {savingContact ? 'Saving...' : (editingContact ? 'Save' : 'Edit')}
                    </button>
                </div>

                <div className="space-y-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-[#6B5B4F] uppercase tracking-wide mb-1 dark:text-gray-300">User ID</p>
                        <p className="py-1 font-mono text-[#8B6914] dark:text-[#D4AF37]">{profile?.userId || 'Generating...'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#6B5B4F] uppercase tracking-wide mb-1 dark:text-gray-300">Full Name</p>
                        {editingContact ? (
                            <input
                                name="name"
                                value={contactDraft.name}
                                onChange={handleContactChange}
                                className="w-full border-b border-[#D4C4A8] py-1 focus:border-[#8B6914] focus:outline-none bg-transparent dark:border-gray-600 dark:focus:border-[#D4AF37]"
                            />
                        ) : (
                            <p className="py-1 dark:text-[#FDF8F3]">{profile?.name || '-'}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#6B5B4F] uppercase tracking-wide mb-1 dark:text-gray-300">Email Address</p>
                        <p className="py-1 text-[#6B5B4F] dark:text-gray-300">{profile?.email || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#6B5B4F] uppercase tracking-wide mb-1 dark:text-gray-300">Phone Number</p>
                        {editingContact ? (
                            <input
                                name="phone"
                                value={contactDraft.phone}
                                onChange={handleContactChange}
                                className="w-full border-b border-[#D4C4A8] py-1 focus:border-[#8B6914] focus:outline-none bg-transparent dark:border-gray-600 dark:focus:border-[#D4AF37]"
                            />
                        ) : (
                            <p className="py-1 dark:text-[#FDF8F3]">{profile?.phone || 'Not set'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div className="max-w-xl mx-auto space-y-8 animate-fadeIn">
            <div className="rounded-xl bg-white p-8 text-center shadow-[0_2px_12px_rgba(92,64,51,0.08)] dark:bg-gray-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] text-2xl text-[#8B6914] mb-4 dark:bg-gray-700 dark:text-[#D4AF37]">
                    🔒
                </div>
                <h3 className="mb-2 text-xl font-medium dark:text-[#FDF8F3]" style={{ fontFamily: 'Playfair Display, serif' }}>Account Security</h3>
                <p className="text-sm text-[#6B5B4F] mb-6 dark:text-gray-300">
                    Manage your session and ensure your account remains secure.
                    If you suspect any unauthorized activity, please sign out from all devices immediately.
                </p>

                <button
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-[#E5E5E5] px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-100 transition dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-700"
                >
                    Sign Out
                </button>
            </div>

            <div className="text-center text-xs text-[#9CA3AF] dark:text-gray-400">
                <p>Last login: Today, via Web</p>
                <p>Member ID: {profile?.userId || profile?.id || '...'}</p>
            </div>
        </div>
    );


    const renderPayments = () => (
        <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
            <div className="rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(92,64,51,0.08)] dark:bg-gray-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                <h3
                    className="mb-6 text-xl font-medium dark:text-[#FDF8F3]"
                    style={{ fontFamily: 'Playfair Display, serif' }}
                >
                    Saved Payment Methods
                </h3>
                {!profile?.savedCards || profile.savedCards.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-[#D4C4A8] rounded-xl dark:border-gray-600">
                        <p className="text-sm text-[#6B5B4F] dark:text-gray-300 mb-2">
                            No saved payment methods found.
                        </p>
                        <p className="text-xs text-[#6B5B4F] opacity-70 dark:text-gray-400">
                            Book a room to save your card details securely.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {profile.savedCards.map((card: any, idx: number) => (
                            <div
                                key={idx}
                                className="relative rounded-xl border border-[#D4C4A8] bg-[#FDF8F3] p-5 shadow-sm transition hover:shadow-md dark:bg-gray-700 dark:border-gray-600"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-8 w-12 rounded bg-[#2C2416] text-[#F5F0E6] flex items-center justify-center text-[0.65rem] font-bold uppercase tracking-wide dark:bg-gray-900">
                                        {card.cardType === 'credit_card' ? 'CREDIT' : 'DEBIT'}
                                    </div>
                                </div>
                                <p className="font-mono text-lg tracking-wider text-[#2C2416] dark:text-[#FDF8F3] mb-4">
                                    {card.cardNumber}
                                </p>
                                <div className="flex justify-between text-xs text-[#6B5B4F] uppercase tracking-wide dark:text-gray-300">
                                    <span className="truncate max-w-[120px]" title={card.cardHolder}>
                                        {card.cardHolder || profile?.name}
                                    </span>
                                    <span>Exp: {card.expiryDate}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-8 rounded-lg bg-[#F5F0E6] p-4 text-xs text-[#6B5B4F] dark:bg-gray-700/50 dark:text-gray-400">
                    <p>
                        <span className="font-bold">Note:</span> Payment methods are saved securely during the booking
                        process. You can select one of these cards for faster checkout on your next reservation.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
            <Navbar />

            {/* HERO SECTION */}
            <section className="relative flex min-h-[360px] items-end overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${profileHeroImage})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(44,36,22,1)_0%,rgba(44,36,22,0.8)_30%,rgba(44,36,22,0.4)_100%)]" />

                <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-12 text-white dark:text-[#FDF8F3]">
                    <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
                        <div className="relative group">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#F5F0E6] text-3xl font-medium text-[#2C2416] border-4 border-[#2C2416] overflow-hidden dark:bg-gray-700 dark:text-[#FDF8F3] dark:border-gray-600">
                                {profile.profilePhoto ? (
                                    <img src={profile.profilePhoto} alt={profile.name} className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition cursor-pointer text-white text-xs font-bold uppercase tracking-wider dark:bg-gray-800/70">
                                {uploadingPhoto ? '...' : 'Edit'}
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                            </label>
                        </div>
                        <div className="mb-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#E8DCC8] mb-2 dark:text-[#D4AF37] dark:text-opacity-80">
                                {getRoleLabel(profile.role)}
                            </p>
                            <h1
                                className="text-3xl md:text-5xl font-medium mb-3 dark:text-[#FDF8F3]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                {profile.name || 'Valued Guest'}
                            </h1>
                            <p className="text-sm text-[#F5F0E6]/80 max-w-lg dark:text-gray-300 dark:text-opacity-70">
                                Manage your profile, view your bookings, and customize your stay preferences all in one place.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* MAIN CONTENT + TABS */}
            <main className="mx-auto max-w-[1200px] px-6 py-10 -mt-16 relative z-20">
                {/* TABS NAVIGATION */}
                <div className="mb-8 flex flex-wrap gap-2 rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur-sm w-fit border border-[#EBE5DA] dark:bg-gray-800/95 dark:border-gray-700">
                    {(['overview', 'walkthrough', 'payments', 'settings', 'security'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-lg px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition-all
                                ${activeTab === tab
                                    ? 'bg-[#2C2416] text-[#F5F0E6] shadow-md dark:bg-gray-700 dark:text-[#FDF8F3]'
                                    : 'text-[#6B5B4F] hover:bg-[#F5F0E6] hover:text-[#2C2416] dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-[#FDF8F3]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* TAB PANELS */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'walkthrough' && renderBookings()}
                    {activeTab === 'payments' && renderPayments()}
                    {activeTab === 'settings' && renderSettings()}
                    {activeTab === 'security' && renderSecurity()}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Profile;
