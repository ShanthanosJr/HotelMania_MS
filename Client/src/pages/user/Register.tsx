import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';

const registerVideo =
    'https://www.pexels.com/download/video/34867881/';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    profilePhoto: string;
    acceptTerms: boolean;
};

type RegisterErrors = {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    acceptTerms?: string;
    server?: string;
};

const Register: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<RegisterForm>({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'guest',
        profilePhoto: '',
        acceptTerms: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<RegisterErrors>({});
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePhoto: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateField = (fieldName: keyof RegisterForm, value: string) => {
        let error = '';
        
        switch(fieldName) {
            case 'name':
                if (!value.trim()) {
                    error = 'Name is required';
                } else if (!/^[a-zA-Z\\s]+$/.test(value.trim())) {
                    error = 'Name can only contain letters and spaces';
                } else if (value.trim().length < 2) {
                    error = 'Name must be at least 2 characters';
                }
                break;
            case 'email':
                if (value.trim() && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(value.trim())) {
                    error = 'Enter a valid email address';
                }
                break;
            case 'phone':
                if (value.trim() && !/^\\+94\\d{9}$|^0\\d{9}$/.test(value.trim())) {
                    error = 'Phone must be in format +94xxxxxxxxx or 0xxxxxxxxx';
                }
                break;
            case 'password':
                if (value && value.length < 6) {
                    error = 'Password must be at least 6 characters';
                }
                break;
            case 'acceptTerms':
                if (!value) {
                    error = 'You must accept the terms to continue';
                }
                break;
        }
        
        setErrors(prev => ({
            ...prev,
            [fieldName]: error || undefined
        }));
        
        return error;
    };

    const handleChange: React.ChangeEventHandler<
        HTMLInputElement | HTMLSelectElement
    > = e => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const fieldValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: fieldValue,
        }));
        
        // Validate the field in real-time
        validateField(name as keyof RegisterForm, String(fieldValue));
    };

    const validate = () => {
        const newErrors: RegisterErrors = {};
        
        // Name validation: only letters and spaces, at least 2 characters
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (!/^[a-zA-Z\\s]+$/.test(formData.name.trim())) {
            newErrors.name = 'Name can only contain letters and spaces';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        
        // Email validation: proper email format
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(formData.email.trim())) {
            newErrors.email = 'Enter a valid email address';
        }
        
        // Phone validation: +94 or 0xx format
        if (formData.phone.trim() && !/^\\+94\\d{9}$|^0\\d{9}$/.test(formData.phone.trim())) {
            newErrors.phone = 'Phone must be in format +94xxxxxxxxx or 0xxxxxxxxx';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (!formData.acceptTerms) {
            newErrors.acceptTerms = 'You must accept the terms to continue';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();
        
        // Run full validation before submit
        if (!validate()) return;

        setLoading(true);
        setErrors({});
        try {
            const response = await api.post('/api/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                role: formData.role,
                profilePhoto: formData.profilePhoto,
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
                setErrors({ server: data.message || 'Registration failed' });
            }
        } catch (error) {
            setErrors(prev => ({ ...prev, server: 'Network error. Please try again.' }));
            console.error('Registration error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#FDF8F3] transition-colors duration-300">
            <div className="grid h-full md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                {/* LEFT: VIDEO / VALUE PROP */}
                <div className="relative hidden md:block overflow-hidden bg-[#2C2416]">
                    <video
                        className="h-full w-full object-cover opacity-70"
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src={registerVideo} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />
                    <div className="absolute inset-0 flex flex-col justify-between p-8 text-[#F5F0E6] dark:text-[#FDF8F3]">
                        <div>
                            <p className="text-[0.8rem] uppercase tracking-[0.2em] text-[#E8DCC8] mb-2 dark:text-[#D4AF37]">
                                Create your Hotelmania account
                            </p>
                            <h1
                                className="text-3xl leading-tight mb-3 dark:text-[#FDF8F3]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                A single profile for
                                <br />
                                every Grand Vista stay
                            </h1>
                            <p className="max-w-md text-[0.95rem] text-[#F5F0E6] dark:text-gray-300">
                                Save your preferences, manage bookings, and enjoy a seamless
                                experience every time you stay with us.
                            </p>
                        </div>

                        <div className="space-y-3 text-[0.85rem]">
                            <div className="rounded-xl bg-black/35 px-4 py-3 dark:bg-gray-800/35">
                                <p className="font-semibold dark:text-[#FDF8F3]">
                                    Your stays, all in one timeline
                                </p>
                                <p className="text-[#E8DCC8] dark:text-[#D4AF37]">
                                    Access your past and upcoming bookings in a single elegant
                                    view.
                                </p>
                            </div>
                            <div className="rounded-xl bg-black/35 px-4 py-3 dark:bg-gray-800/35">
                                <p className="font-semibold dark:text-[#FDF8F3]">
                                    Tailored recommendations for you
                                </p>
                                <p className="text-[#E8DCC8] dark:text-[#D4AF37]">
                                    Receive curated suggestions based on your travel style and
                                    preferences.
                                </p>
                            </div>
                            <div className="rounded-xl bg-black/35 px-4 py-3 dark:bg-gray-800/35">
                                <p className="font-semibold dark:text-[#FDF8F3]">
                                    Faster check-ins, every time
                                </p>
                                <p className="text-[#E8DCC8] dark:text-[#D4AF37]">
                                    Save guest details once for smoother arrivals at every
                                    stay.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: FORM */}
                <div className="flex items-center justify-center px-6 dark:bg-[#121212]">
                    <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(92,64,51,0.16)] dark:bg-gray-800 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                        <div className="mb-2 text-center md:text-left">
                            <p className="text-[0.8rem] uppercase tracking-[0.2em] text-[#8B6914] mb-2 dark:text-[#D4AF37]">
                                Create account
                            </p>
                            <h2
                                className="text-2xl mb-1 dark:text-[#FDF8F3]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Join Hotelmania
                            </h2>
                            <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                Share a few details to set up your profile. You can update
                                everything later in your profile settings.
                            </p>
                        </div>

                        {errors.server && (
                            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.85rem] text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200">
                                {errors.server}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {/* Profile Photo Upload */}
                            <div className="flex flex-col items-center justify-center mb-4">
                                <div className="relative h-24 w-24 rounded-full border-2 border-[#D4C4A8] bg-[#FDF8F3] overflow-hidden flex items-center justify-center">
                                    {formData.profilePhoto ? (
                                        <img
                                            src={formData.profilePhoto}
                                            alt="Profile Preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl text-[#D4C4A8]">📷</span>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[0.75rem] text-[#8B6914] mt-2 font-semibold uppercase tracking-wider">
                                    Upload Photo
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-1.5 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                    placeholder="Your full name"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-[0.8rem] text-rose-700 dark:text-rose-300">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-1.5 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-[0.8rem] text-rose-700 dark:text-rose-300">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-1.5 pr-10 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                        placeholder="Create a password"
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

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Phone (optional)
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-1.5 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:placeholder:text-gray-400 dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                    placeholder="+94 ..."
                                />
                                {errors.phone && (
                                    <p className="mt-1 text-[0.8rem] text-rose-700 dark:text-rose-300">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-1.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#FDF8F3] dark:focus:border-[#D4AF37] dark:focus:bg-gray-600"
                                >
                                    <option value="guest">Guest</option>
                                    {/* <option value="admin">Admin</option> 
                                    {/* <option value="receptionist">Receptionist</option>
                                    <option value="housekeeping">Housekeeping</option> */}
                                </select>
                            </div>

                            <div className="flex items-start gap-2 text-[0.85rem] text-[#6B5B4F] dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleChange}
                                    className="mt-0.5 h-4 w-4 rounded border-[#D4C4A8] text-[#8B6914] focus:ring-[#8B6914] dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-[#D4AF37]"
                                />
                                <p>
                                    I agree to the Hotelmania terms and privacy policy. I
                                    understand that my account secures access to bookings and
                                    stay history.
                                </p>
                            </div>
                            {errors.acceptTerms && (
                                <p className="text-[0.8rem] text-rose-700 dark:text-rose-300">
                                    {errors.acceptTerms}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 w-full rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2.5 text-[0.85rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-[#8B6914] transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:hover:bg-transparent dark:hover:text-[#D4AF37]"
                            >
                                {loading ? 'Creating account…' : 'Create account'}
                            </button>
                        </form>

                        <div className="mt-3 border-t border-[#E8DCC8] pt-2 text-center text-[0.85rem] text-[#6B5B4F] dark:border-gray-600 dark:text-gray-300">
                            <p>
                                Already have an account?{' '}
                                <Link
                                    to="/login"
                                    className="font-semibold text-[#8B6914] hover:underline dark:text-[#D4AF37] dark:hover:text-[#D4AF37]"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
