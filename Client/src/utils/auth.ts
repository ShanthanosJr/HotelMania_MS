export type Role = 'guest' | 'admin' | 'receptionist' | 'housekeeping';

export interface StoredUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    [key: string]: unknown;
}

export const STAFF_ROLES: Role[] = ['admin', 'receptionist', 'housekeeping'];

/** Which roles may open each admin page (the API enforces the same rules). */
export const ADMIN_ROUTE_ROLES: Record<string, Role[]> = {
    '/admin': ['admin'],
    '/admin/dashboard': ['admin'],
    '/admin/hotels': ['admin'],
    '/admin/rooms': ['admin'],
    '/admin/bookings': ['admin', 'receptionist'],
    '/admin/transactions': ['admin'],
    '/admin/feedbacks': ['admin', 'receptionist', 'housekeeping'],
    '/admin/users': ['admin'],
};

/** Landing page after login for each role. */
export const homeForRole = (role?: string): string => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'receptionist') return '/admin/bookings';
    if (role === 'housekeeping') return '/admin/feedbacks';
    return '/';
};

export const getStoredUser = (): StoredUser | null => {
    try {
        const raw = localStorage.getItem('user');
        return raw ? (JSON.parse(raw) as StoredUser) : null;
    } catch {
        return null;
    }
};

export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
};
