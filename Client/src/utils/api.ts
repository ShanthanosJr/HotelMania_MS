// API utility functions

const API_BASE_URL: string = import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_API_URL
    : ''; // Empty string for development since we're using Vite proxy

interface ApiOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    async request(endpoint: string, options: ApiOptions = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        const headers: Record<string, string> = {
            ...options.headers,
        };

        // Only set Content-Type to application/json if body is not FormData
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            // We know headers is a Record<string, string> because we defined it above
            (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        // Add mode: 'cors' and credentials for better CORS handling
        config.mode = 'cors';
        config.credentials = 'include'; // Use 'include' to send cookies with requests when needed

        try {
            const response = await fetch(url, config);
            return response;
        } catch (error) {
            console.error(`API Error for ${url}:`, error);
            throw error;
        }
    },

    async get(endpoint: string): Promise<Response> {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint: string, data: unknown): Promise<Response> {
        const isFormData = data instanceof FormData;
        return this.request(endpoint, {
            method: 'POST',
            body: isFormData ? (data as FormData) : JSON.stringify(data),
        });
    },

    async put(endpoint: string, data: unknown): Promise<Response> {
        const isFormData = data instanceof FormData;
        return this.request(endpoint, {
            method: 'PUT',
            body: isFormData ? (data as FormData) : JSON.stringify(data),
        });
    },

    async delete(endpoint: string): Promise<Response> {
        return this.request(endpoint, { method: 'DELETE' });
    },
};
