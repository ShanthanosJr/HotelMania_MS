import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';

const loginVideo =
    'https://www.pexels.com/download/video/17550507/';

type LoginForm = {
    email: string;
    password: string;
    rememberMe: boolean;
};

type LoginErrors = {
    email?: string;
    password?: string;
    server?: string;
};

const Login: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<LoginForm>({
        email: '',
        password: '',
        rememberMe: true,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<LoginErrors>({});
    const [loading, setLoading] = useState(false);

    const handleChange: React.ChangeEventHandler<
        HTMLInputElement
    > = e => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const validate = () => {
        const newErrors: LoginErrors = {};
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
            newErrors.email = 'Enter a valid email address';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setErrors({});
        try {
            const response = await api.post('/api/auth/login', {
                email: formData.email,
                password: formData.password,
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/');
                }
            } else {
                setErrors({ server: data.message || 'Login failed' });
            }
        } catch (error) {
            setErrors({ server: 'Network error. Please try again.' });
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
            <div className="grid h-full md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                {/* LEFT: VIDEO / BRAND */}
                <div className="relative hidden md:block overflow-hidden bg-[#2C2416]">
                    <video
                        className="h-full w-full object-cover opacity-70"
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src={loginVideo} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                    <div className="absolute inset-0 flex flex-col justify-between p-8 text-[#F5F0E6] dark:text-[#FDF8F3]">
                        <div>
                            <p className="text-[0.8rem] uppercase tracking-[0.2em] text-[#E8DCC8] mb-2 dark:text-[#D4AF37]">
                                Hotelmania
                            </p>
                            <h1
                                className="text-3xl leading-tight mb-3 dark:text-[#FDF8F3]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Welcome back to your
                                <br />
                                Grand Vista dashboard
                            </h1>
                            <p className="max-w-md text-[0.95rem] text-[#F5F0E6] dark:text-gray-300">
                                Enter your credentials to continue to your personalized
                                Hotelmania dashboard and pick up exactly where you left off.
                            </p>
                        </div>

                        <div className="space-y-3 text-[0.85rem]">
                            <div className="rounded-xl bg-black/35 px-4 py-3 dark:bg-gray-800/35">
                                <p className="font-semibold dark:text-[#FDF8F3]">
                                    Manage bookings in one place
                                </p>
                                <p className="text-[#E8DCC8] dark:text-[#D4AF37]">
                                    Review reservations, special requests, and stay details in
                                    one elegant view.
                                </p>
                            </div>
                            <div className="rounded-xl bg-black/35 px-4 py-3 dark:bg-gray-800/35">
                                <p className="font-semibold dark:text-[#FDF8F3]">
                                    Role-aware tools for every team
                                </p>
                                <p className="text-[#E8DCC8] dark:text-[#D4AF37]">
                                    Admins, reception, and housekeeping enjoy role-based tools
                                    and dashboards.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: FORM */}
                <div className="flex items-center justify-center px-6 dark:bg-[#121212]">
                    <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(92,64,51,0.16)] dark:bg-gray-800 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                        <div className="mb-4 text-center md:text-left">
                            <p className="text-[0.8rem] uppercase tracking-[0.2em] text-[#8B6914] mb-2 dark:text-[#D4AF37]">
                                Sign in
                            </p>
                            <h2
                                className="text-2xl mb-1 dark:text-[#FDF8F3]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Access your account
                            </h2>
                            <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                Sign in to manage bookings, view upcoming stays, and see
                                updates in real time.
                            </p>
                        </div>

                        {errors.server && (
                            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.85rem] text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200">
                                {errors.server}
                            </div>
                        )}

                        <form className="space-y-3" onSubmit={handleSubmit}>
                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F]">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-[0.8rem] text-rose-700 dark:text-rose-300">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F]">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 pr-10 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-[#8B6914] dark:text-[#D4AF37]"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-[0.8rem] text-rose-700 dark:text-rose-300">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[0.85rem]">
                                <label className="inline-flex items-center gap-2 text-[#6B5B4F] dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="h-4 w-4 rounded border-[#D4C4A8] text-[#8B6914] focus:ring-[#8B6914] dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-[#D4AF37]"
                                    />
                                    <span>Remember this device</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-[#8B6914] hover:underline dark:text-[#D4AF37] dark:hover:text-[#D4AF37]"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 w-full rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2.5 text-[0.85rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-[#8B6914] transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:hover:bg-transparent dark:hover:text-[#D4AF37]"
                            >
                                {loading ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>

                        <div className="mt-5 border-t border-[#E8DCC8] pt-4 text-center text-[0.85rem] text-[#6B5B4F] dark:border-gray-600 dark:text-gray-300">
                            <p>
                                New to Hotelmania?{' '}
                                <Link
                                    to="/register"
                                    className="font-semibold text-[#8B6914] hover:underline dark:text-[#D4AF37] dark:hover:text-[#D4AF37]"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
