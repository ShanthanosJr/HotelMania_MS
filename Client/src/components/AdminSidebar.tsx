import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BsGrid,
    BsBuilding,
    BsDoorOpen,
    BsCalendarCheck,
    BsCreditCard,
    BsChatSquareQuote,
    BsPeople,
    BsList,
    BsChevronLeft,
    BsBoxArrowLeft,
    BsSun,
    BsMoon,
    BsEnvelopeOpen,
    BsPersonBadge,
    BsCalendar3,
    BsBrush,
    BsTag
} from 'react-icons/bs';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_ROUTE_ROLES, getStoredUser } from '../utils/auth';

interface AdminSidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const role = getStoredUser()?.role;
    const allModules = [
        { title: 'Dashboard', path: '/admin/dashboard', icon: <BsGrid size={20} /> },
        { title: 'Front desk', path: '/admin/frontdesk', icon: <BsPersonBadge size={20} /> },
        { title: 'Calendar', path: '/admin/calendar', icon: <BsCalendar3 size={20} /> },
        { title: 'Bookings', path: '/admin/bookings', icon: <BsCalendarCheck size={20} /> },
        { title: 'Housekeeping', path: '/admin/housekeeping', icon: <BsBrush size={20} /> },
        { title: 'Rates & settings', path: '/admin/rates', icon: <BsTag size={20} /> },
        { title: 'Hotels', path: '/admin/hotels', icon: <BsBuilding size={20} /> },
        { title: 'Rooms', path: '/admin/rooms', icon: <BsDoorOpen size={20} /> },
        { title: 'Transactions', path: '/admin/transactions', icon: <BsCreditCard size={20} /> },
        { title: 'Enquiries', path: '/admin/enquiries', icon: <BsEnvelopeOpen size={20} /> },
        { title: 'Feedbacks', path: '/admin/feedbacks', icon: <BsChatSquareQuote size={20} /> },
        { title: 'Users', path: '/admin/users', icon: <BsPeople size={20} /> },
    ];
    // Only show modules this role can open
    const adminModules = allModules.filter(m => !!role && (ADMIN_ROUTE_ROLES[m.path] || []).includes(role));

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <aside
            className={`fixed top-0 left-0 h-full bg-ivory dark:bg-night border-r border-sand dark:border-gray-800 z-50 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            <div className="p-4 flex items-center justify-between border-b border-sand dark:border-gray-800 h-20">
                {!isCollapsed && (
                    <h1
                        className="text-lg font-semibold tracking-[0.08em] text-ink dark:text-ivory whitespace-nowrap overflow-hidden"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        HOTELMANIA
                        <br />
                        <span className="text-[0.65rem] font-sans font-normal tracking-wider opacity-70">ADMIN PANEL</span>
                    </h1>
                )}
                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg hover:bg-parchment dark:hover:bg-gray-800 cursor-pointer text-bronze dark:text-[#D0C3A5] transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                >
                    {isCollapsed ? <BsList size={24} /> : <BsChevronLeft size={20} />}
                </button>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden">
                <ul className="space-y-2 px-3">
                    {adminModules.map((module) => (
                        <li key={module.path}>
                            <button
                                onClick={() => navigate(module.path)}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} cursor-pointer gap-4 px-3 py-3 rounded-xl text-[0.9rem] transition-all group relative ${isActive(module.path)
                                    ? 'bg-bronze text-white shadow-lg shadow-bronze/20 dark:bg-gold dark:text-night'
                                    : 'text-umber hover:bg-parchment dark:text-[#A0A0A0] dark:hover:bg-white/5 dark:hover:text-ivory'
                                    }`}
                                title={isCollapsed ? module.title : ''}
                            >
                                <span className="shrink-0">{module.icon}</span>
                                {!isCollapsed && (
                                    <span className="font-medium tracking-wide">{module.title}</span>
                                )}

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-ink text-ivory text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                        {module.title}
                                    </div>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-sand dark:border-gray-800 space-y-2">
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} cursor-pointer gap-3 px-4 py-3 rounded-xl text-[0.85rem] text-bronze hover:bg-parchment transition-colors dark:text-[#D0C3A5] dark:hover:bg-white/5`}
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <BsSun size={20} /> : <BsMoon size={20} />}
                    {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button
                    onClick={() => navigate('/')}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} cursor-pointer gap-3 px-4 py-3 rounded-xl text-[0.85rem] text-bronze hover:bg-parchment transition-colors dark:text-[#D0C3A5] dark:hover:bg-white/5`}
                    title="Back to Site"
                >
                    <BsBoxArrowLeft size={20} />
                    {!isCollapsed && <span>Back to Site</span>}
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;