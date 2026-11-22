import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    // Initialize from local storage or default to false (expanded)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const savedState = localStorage.getItem('adminSidebarCollapsed');
        return savedState === 'true';
    });

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('adminSidebarCollapsed', String(newState));
            return newState;
        });
    };

    return (
        <div className="min-h-screen bg-ivory dark:bg-[#050607] transition-colors duration-300 font-sans text-ink dark:text-cream">
            <AdminSidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

            <main
                className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'
                    }`}
            >
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
