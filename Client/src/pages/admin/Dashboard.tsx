
import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
//import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import AdminLayout from '../../components/AdminLayout';
import {
    BsThreeDotsVertical,
    BsArrowUpRight,
    BsArrowDownRight,
    BsSearch,
    BsX
} from 'react-icons/bs';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Mock Data for Charts
const revenueData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
    { name: 'Jul', revenue: 3490 },
];

const bookingStatusData = [
    { name: 'Confirmed', value: 400 },
    { name: 'Pending', value: 300 },
    { name: 'Cancelled', value: 100 },
];

const COLORS = ['#8B6914', '#D4AF37', '#E8DCC8'];

/*
const activeTeam = [
    { name: 'Alex Johnson', role: 'Super Admin', status: 'online', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
    { name: 'Maria Garcia', role: 'Hotel Manager', status: 'online', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { name: 'David Smith', role: 'Support Agent', status: 'offline', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b' },
];
*/

interface User {
    _id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    phone: string;
    profilePhoto?: string;
}

// Mock Data for Recent Activity
const recentActivity = [
    { action: 'New Booking', detail: 'Suite 404 booked by John Doe', time: '2 mins ago', type: 'booking' },
    { action: 'Review', detail: '5-star review for Grand Hotel', time: '1 hour ago', type: 'review' },
    { action: 'System', detail: 'Monthly backup completed', time: '4 hours ago', type: 'system' },
];

interface DashBooking {
    totalPrice?: number;
    status?: string;
    createdAt: string;
    user?: { name?: string };
    room?: { type?: { name?: string } };
}

interface ChartPoint { name: string; value: number }
interface RevenuePoint { name: string; revenue: number }
interface Activity { action: string; detail: string; time: string; type: string }

const Dashboard: React.FC = () => {
    const { theme } = useTheme();
    const [user, setUser] = useState<User | null>(null);
    const [team, setTeam] = useState<User[]>([]);
    const [showUserModal, setShowUserModal] = useState(false);

    // Real Data State
    const [dashboardMetrics, setDashboardMetrics] = useState({
        totalRevenue: 0,
        tempRevenueChange: 0, // Placeholder for comparison
        totalBookings: 0,
        bookingChange: 0,
        occupancyRate: 0,
        pendingReviews: 0, // Placeholder until reviews API linked
    });
    const [bookingChartData, setBookingChartData] = useState<RevenuePoint[]>([]);
    const [statusChartData, setStatusChartData] = useState<ChartPoint[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Current User Profile
                const profileRes = await api.get('/api/auth/profile');
                const profileData = await profileRes.json();
                if (profileData.success) {
                    setUser(profileData.user);
                }

                // 2. Fetch Active Team
                const usersRes = await api.get('/api/users');
                const usersData = await usersRes.json();
                if (usersData.success && Array.isArray(usersData.data)) {
                    setTeam(usersData.data.filter((u: User) => u.role !== 'guest').slice(0, 5));
                }

                // 3. Fetch Bookings for Metrics & Charts
                const bookingRes = await api.get('/api/bookings');
                const bookingData = await bookingRes.json();

                if (bookingData.success && Array.isArray(bookingData.data)) {
                    const bookings: DashBooking[] = bookingData.data;

                    // --- METRICS CALCULATION ---
                    const totalRev = bookings.reduce((acc: number, b) => acc + (b.totalPrice || 0), 0);
                    const totalBks = bookings.length;

                    // Occupancy (Simple Mock logic: based on active bookings vs fixed 50 rooms)
                    const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in').length;
                    const occupancy = Math.min(100, Math.round((activeBookings / 50) * 100));

                    setDashboardMetrics({
                        totalRevenue: totalRev,
                        tempRevenueChange: 12.5, // Keep mock for now
                        totalBookings: totalBks,
                        bookingChange: 8.2, // Keep mock
                        occupancyRate: occupancy,
                        pendingReviews: 28, // Keep mock
                    });

                    // --- PIE CHART (Status) ---
                    const statusCounts: Record<string, number> = {};
                    bookings.forEach((b) => {
                        const s = b.status || 'unknown';
                        statusCounts[s] = (statusCounts[s] || 0) + 1;
                    });
                    const processedStatusData = Object.entries(statusCounts).map(([name, value]) => ({
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        value
                    }));
                    setStatusChartData(processedStatusData.length > 0 ? processedStatusData : [{ name: 'No Data', value: 1 }]);

                    // --- REVENUE CHART (By Month) ---
                    const revenueByMonth: Record<string, number> = {};
                    bookings.forEach((b) => {
                        const date = new Date(b.createdAt);
                        const month = date.toLocaleString('default', { month: 'short' });
                        revenueByMonth[month] = (revenueByMonth[month] || 0) + (b.totalPrice || 0);
                    });
                    // Sort months usually requires better logic, simplified here to existing keys
                    const processedRevenueData = Object.entries(revenueByMonth).map(([name, revenue]) => ({ name, revenue }));
                    setBookingChartData(processedRevenueData.length > 0 ? processedRevenueData : []);

                    // --- RECENT ACTIVITY ---
                    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
                    const activities = sortedBookings.map((b) => ({
                        action: 'New Booking',
                        detail: `${b.room?.type?.name || 'Room'} booked by ${b.user?.name || 'Guest'}`,
                        time: new Date(b.createdAt).toLocaleDateString(),
                        type: 'booking'
                    }));
                    setRecentActivities(activities);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchData();
    }, []);

    return (
        <AdminLayout>
            <div className="p-8 space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ivory" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Dashboard
                        </h1>
                        <p className="text-taupe dark:text-[#A0A0A0] mt-1">
                            Welcome back, {user?.name}. Here's what's happening today.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 rounded-full bg-white dark:bg-charcoal border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-bronze text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="h-10 w-10 rounded-full bg-bronze text-white flex items-center cursor-pointer justify-center font-bold shadow-lg overflow-hidden hover:opacity-90 transition"
                        >
                            {user?.profilePhoto ? (
                                <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'AD'}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* OVERVIEW CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: 'Total Revenue', value: `$${dashboardMetrics.totalRevenue.toLocaleString()}`, change: `+${dashboardMetrics.tempRevenueChange}%`, isPositive: true },
                        { title: 'Total Bookings', value: dashboardMetrics.totalBookings, change: `+${dashboardMetrics.bookingChange}%`, isPositive: true },
                        { title: 'Occupancy Rate', value: `${dashboardMetrics.occupancyRate}%`, change: '-2.1%', isPositive: false },
                        { title: 'Pending Reviews', value: dashboardMetrics.pendingReviews, change: '+4.5%', isPositive: true },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-charcoal p-6 rounded-2xl border border-sand dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-taupe dark:text-[#A0A0A0] uppercase tracking-wider">{stat.title}</span>
                                <BsThreeDotsVertical className="text-gray-400 cursor-pointer" />
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-bold text-ink dark:text-ivory">{stat.value}</h3>
                                <span className={`flex items - center text - sm font - medium px - 2 py - 1 rounded - full ${stat.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'} `}>
                                    {stat.isPositive ? <BsArrowUpRight className="mr-1" /> : <BsArrowDownRight className="mr-1" />}
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Revenue Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-charcoal p-6 rounded-2xl border border-sand dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-ink dark:text-ivory">Revenue Analytics</h3>
                            <select className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-1 outline-none text-taupe dark:text-[#A0A0A0]">
                                <option>This Year</option>
                                <option>Last Year</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={bookingChartData.length > 0 ? bookingChartData : revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B6914" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8B6914" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B5B4F', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B5B4F', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#333' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#8B6914" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Booking Status Pie Chart */}
                    <div className="bg-white dark:bg-charcoal p-6 rounded-2xl border border-sand dark:border-gray-800 shadow-sm">
                        <h3 className="text-lg font-bold text-ink dark:text-ivory mb-6">Booking Status</h3>
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusChartData.length > 0 ? statusChartData : bookingStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(statusChartData.length > 0 ? statusChartData : bookingStatusData).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-3xl font-bold text-ink dark:text-ivory">{dashboardMetrics.totalBookings}</span>
                                <span className="text-xs text-taupe dark:text-[#A0A0A0] uppercase tracking-wide">Total</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 flex-wrap">
                            {(statusChartData.length > 0 ? statusChartData : bookingStatusData).map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs text-taupe dark:text-[#A0A0A0]">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Team Members */}
                    <div className="bg-white dark:bg-charcoal p-6 rounded-2xl border border-sand dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-ink dark:text-ivory">Active Team</h3>
                            <button className="text-xs text-bronze hover:underline cursor-pointer">View All</button>
                        </div>
                        <div className="space-y-4">
                            {team.map((member, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {member.profilePhoto ? (
                                                <img src={member.profilePhoto} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                                                    {member.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-charcoal rounded-full bg-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-ink dark:text-ivory">{member.name}</p>
                                            <p className="text-xs text-taupe dark:text-[#A0A0A0]">{member.role} {member.userId && `(${member.userId})`}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-bronze cursor-pointer">
                                        <BsThreeDotsVertical />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white dark:bg-charcoal p-6 rounded-2xl border border-sand dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-ink dark:text-ivory">Recent Activity</h3>
                            <button className="text-xs text-bronze hover:underline cursor-pointer">View All</button>
                        </div>
                        <div className="space-y-6">
                            {(recentActivities.length > 0 ? recentActivities : recentActivity).map((activity, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-bronze mt-2" />
                                        {idx !== (recentActivities.length > 0 ? recentActivities : recentActivity).length - 1 && <div className="w-px h-full bg-gray-200 dark:bg-gray-800 my-1" />}
                                    </div>
                                    <div className="flex-1 pb-2">
                                        <p className="text-sm font-medium text-ink dark:text-ivory">{activity.action}</p>
                                        <p className="text-xs text-taupe dark:text-[#A0A0A0] mt-1">{activity.detail}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* User Details Modal */}
            {showUserModal && user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-charcoal rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="relative h-32 bg-bronze">
                            <button
                                onClick={() => setShowUserModal(false)}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition cursor-pointer"
                            >
                                <BsX size={24} />
                            </button>
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-charcoal overflow-hidden bg-white dark:bg-ink flex items-center justify-center shadow-lg">
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-bold text-bronze">{user.name.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pt-16 pb-8 px-8 text-center">
                            <h2 className="text-2xl font-bold text-ink dark:text-ivory mb-1">{user.name}</h2>
                            <p className="text-bronze font-medium uppercase tracking-wider text-xs mb-6">{user.role}</p>

                            <div className="space-y-4 text-left">
                                <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-ink border border-sand dark:border-gray-800">
                                    <p className="text-xs text-taupe dark:text-[#A0A0A0] uppercase font-bold mb-1">User ID</p>
                                    <p className="text-sm font-mono text-ink dark:text-ivory break-all">{user.userId || user._id}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-ink border border-sand dark:border-gray-800">
                                    <p className="text-xs text-taupe dark:text-[#A0A0A0] uppercase font-bold mb-1">Email Address</p>
                                    <p className="text-sm text-ink dark:text-ivory break-all">{user.email}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-ink border border-sand dark:border-gray-800">
                                    <p className="text-xs text-taupe dark:text-[#A0A0A0] uppercase font-bold mb-1">Phone Number</p>
                                    <p className="text-sm text-ink dark:text-ivory">{user.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Dashboard;
