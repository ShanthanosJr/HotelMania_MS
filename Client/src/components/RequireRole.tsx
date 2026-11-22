import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { clearSession, homeForRole, Role } from '../utils/auth';

interface RequireRoleProps {
    roles: Role[];
    children: React.ReactNode;
}

type State = { status: 'checking' } | { status: 'ok' } | { status: 'login' } | { status: 'forbidden'; role: string };

/**
 * Guards a route on the client. The role is verified with the API rather than
 * trusted from localStorage; the API also enforces every permission itself.
 */
const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
    const location = useLocation();
    const [state, setState] = useState<State>({ status: 'checking' });
    const rolesKey = roles.join(',');

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('token');
        if (!token) {
            setState({ status: 'login' });
            return;
        }

        api.get('/api/auth/profile')
            .then(async res => {
                if (cancelled) return;
                if (res.status === 401) {
                    clearSession();
                    setState({ status: 'login' });
                    return;
                }
                const data = await res.json();
                const role: string = data?.user?.role;
                localStorage.setItem('user', JSON.stringify(data.user));
                setState(rolesKey.split(',').includes(role) ? { status: 'ok' } : { status: 'forbidden', role });
            })
            .catch(() => !cancelled && setState({ status: 'login' }));

        return () => {
            cancelled = true;
        };
    }, [rolesKey, location.pathname]);

    if (state.status === 'checking') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FDF8F3] text-sm text-[#6B5B4F] dark:bg-[#121212] dark:text-gray-300">
                Checking access…
            </div>
        );
    }
    if (state.status === 'login') {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    if (state.status === 'forbidden') {
        const home = homeForRole(state.role);
        // Avoid a redirect loop if the role's home page is the one being denied
        return <Navigate to={home === location.pathname ? '/' : home} replace />;
    }
    return <>{children}</>;
};

export default RequireRole;
