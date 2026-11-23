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
    '/admin/enquiries': ['admin', 'receptionist'],
    '/admin/frontdesk': ['admin', 'receptionist'],
    '/admin/calendar': ['admin', 'receptionist'],
    '/admin/housekeeping': ['admin', 'receptionist', 'housekeeping'],
    '/admin/rates': ['admin'],
};

/** Landing page after login for each role. */
export const homeForRole = (role?: string): string => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'receptionist') return '/admin/frontdesk';
    if (role === 'housekeeping') return '/admin/housekeeping';
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

/**
 * Where to go after signing in. Only same-site paths are allowed (never "//evil.com"
 * or "https://..."), so a crafted ?redirect= link can't send users off-site.
 */
export const safeRedirect = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
    return value;
};

/** /login link that brings the user back to the given page (default: the current one) afterwards. */
export const loginUrl = (returnTo: string = window.location.pathname + window.location.search) =>
    `/login?redirect=${encodeURIComponent(returnTo)}`;
