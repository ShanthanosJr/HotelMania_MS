import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import {
  BsArrowLeft,
  BsPlusCircle,
  BsSearch,
  BsGrid,
  BsList,
  BsFilter,
  BsPeople,
  BsPersonBadge,
  BsEnvelope,
  BsTelephone,
  BsTrash,
  BsPencil,
  BsX,
  BsCamera,
  BsCheckCircle,
  BsExclamationCircle
} from 'react-icons/bs';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token !== null && token !== undefined && token !== '';
};

type Role = 'admin' | 'manager' | 'guest' | string;

interface User {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  profilePhoto?: string;
  createdAt: string;
}

interface UserFormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  profilePhoto?: string;
  userId?: string;
}

interface UserErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: string;
  server?: string;
}

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<UserFormState>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'guest',
    profilePhoto: '',
    userId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false); // Operation loading (submit)
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<UserErrors>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] =
    useState<'all' | 'admin' | 'manager' | 'guest'>('all');

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showModal, setShowModal] = useState(false);

  const chartColors = ['#8D6E63', '#5D4037', '#D4AF37', '#81C784'];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to fetch users: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      fetchUsers();
    } else {
      setError(
        'You must be logged in as an admin to access this page. Please log in first.',
      );
      setLoading(false);
    }
  }, []);

  // Validation Logic (copied/adapted from Register.tsx)
  const validateField = (fieldName: keyof UserFormState, value: string) => {
    let error = '';

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          error = 'Name can only contain letters and spaces';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      case 'email':
        if (value.trim() && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
          error = 'Enter a valid email address';
        } else if (!value.trim()) {
          error = 'Email is required';
        }
        break;
      case 'phone':
        if (value.trim() && !/^\+94\d{9}$|^0\d{9}$/.test(value.trim())) {
          error = 'Phone must be in format +94xxxxxxxxx or 0xxxxxxxxx';
        }
        break;
      case 'password':
        // Only validate password if it's provided (for edit) or strictly required (for new)
        if (!editingId) {
          if (!value) error = 'Password is required';
          else if (value.length < 6) error = 'Password must be at least 6 characters';
        } else if (value && value.length < 6) {
          error = 'Password must be at least 6 characters';
        }
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: error || undefined
    }));

    return error;
  };

  const handleInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement
  > = e => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
    validateField(name as keyof UserFormState, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserForm(prev => ({ ...prev, profilePhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: UserErrors = {};

    // Name validation
    if (!userForm.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(userForm.name.trim())) {
      newErrors.name = 'Name can only contain letters and spaces';
    } else if (userForm.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!userForm.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userForm.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    // Phone validation
    if (userForm.phone.trim() && !/^\+94\d{9}$|^0\d{9}$/.test(userForm.phone.trim())) {
      newErrors.phone = 'Phone must be in format +94xxxxxxxxx or 0xxxxxxxxx';
    }

    // Password validation
    if (!editingId && !userForm.password) {
      newErrors.password = 'Password is required needed for new users';
    } else if (userForm.password && userForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setOpLoading(true);
      setFormErrors({});
      let response;
      if (editingId) {
        const { password, ...updateData } = userForm;
        const dataToSend = password ? userForm : updateData;
        response = await api.put(`/api/users/${editingId}`, dataToSend);
      } else {
        response = await api.post('/api/users', userForm);
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Operation failed');
      }

      const result = await response.json();
      if (result.success) {
        if (editingId) {
          setUsers(prev =>
            prev.map(u => (u._id === editingId ? result.data : u)),
          );
          alert('User updated successfully!');
        } else {
          setUsers(prev => [...prev, result.data]);
          alert('User created successfully!');
        }
        setEditingId(null);
        resetForm();
        setShowModal(false);
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setFormErrors(prev => ({ ...prev, server: err.message || 'Operation failed' }));
        // Also show alert for visibility
        // alert(`Operation failed: ${err.message}`);
      }
      console.error(err);
    } finally {
      setOpLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role || 'guest',
      profilePhoto: user.profilePhoto || '',
      userId: user.userId || '',
    });
    setEditingId(user._id);
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await api.delete(`/api/users/${id}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delete operation failed');
      }
      const result = await response.json();
      if (result.success) {
        setUsers(prev => prev.filter(u => u._id !== id));
        alert('User deleted successfully!');
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to delete user: ${err.message}`);
        alert(
          `Failed to delete user: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    }
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'guest',
      profilePhoto: '',
      userId: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setEditingId(null);
    setFormErrors({});
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const filteredUsers = useMemo(
    () =>
      users.filter(u => {
        const label = `${u.name} ${u.email} ${u.phone || ''}`;
        const matchesSearch = label
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesRole =
          roleFilter === 'all' ? true : u.role === roleFilter;
        return matchesSearch && matchesRole;
      }),
    [users, searchTerm, roleFilter],
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
    [filteredUsers, currentPage],
  );

  const metrics = useMemo(() => {
    const total = users.length;
    const roleCounts: Record<string, number> = {};
    users.forEach(u => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });
    const roleData = Object.entries(roleCounts).map(([name, value]) => ({
      name,
      value,
    }));

    const byMonth: Record<string, number> = {};
    users.forEach(u => {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthData = Object.entries(byMonth)
      .sort()
      .map(([name, value]) => ({ name, value }));

    return { total, roleData, monthData };
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center text-[#5D4037] font-serif text-xl">
        Loading users...
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* HERO */}
      <div className="relative bg-gradient-to-r from-[#4E342E] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                <BsPeople className="text-3xl text-[#E6E2D3]" />
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight">
                User Management
              </h1>
            </div>
            <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
              Manage staff and guest accounts, roles, and contact information for the Hotelmania platform.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 font-semibold"
            >
              <BsArrowLeft /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#E6E2D3] text-[#5D4037] hover:bg-white hover:shadow-xl rounded-full transition-all duration-300 font-bold shadow-lg transform hover:-translate-y-1"
            >
              <BsPlusCircle /> Add User
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-2 text-red-500 hover:text-red-700 text-sm font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-[#FDFBF7] text-[#8D6E63]">
              <BsPeople size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Total Users
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {metrics.total}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-blue-50 text-blue-600">
              <BsPersonBadge size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Admins
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {users.filter(u => u.role === 'admin').length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-amber-50 text-amber-600">
              <BsEnvelope size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Guests
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {users.filter(u => u.role === 'guest').length}
              </h3>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex bg-[#F9F7F2] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'grid'
                ? 'bg-[#5D4037] text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100 hover:text-[#5D4037]'
                }`}
            >
              <BsGrid /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'table'
                ? 'bg-[#5D4037] text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100 hover:text-[#5D4037]'
                }`}
            >
              <BsList /> Table
            </button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative group w-full md:w-72">
              <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                className="pl-10 pr-4 py-2.5 w-full bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5D4037] border border-[#E6E2D3] rounded-full hover:bg-[#F9F7F2]"
            >
              <BsFilter /> Reset Filters
            </button>
          </div>
        </div>

        {/* FILTER STRIP */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-wrap gap-4 items-center">
          <select
            className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
            value={roleFilter}
            onChange={e =>
              setRoleFilter(e.target.value as typeof roleFilter)
            }
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="manager">Managers</option>
            <option value="guest">Guests</option>
          </select>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
            <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4">
              Users by Role
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.roleData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                  >
                    {metrics.roleData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={chartColors[idx % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F9F7F2',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] lg:col-span-2">
            <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4">
              New Users by Month
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E6E2D3"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#5D4037"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#5D4037"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F9F7F2',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#8D6E63"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MAIN VIEW */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E6E2D3] text-center text-sm text-gray-500">
            No users found.
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedUsers.map(user => (
                <div
                  key={user._id}
                  className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-serif font-bold text-[#5D4037]">
                        {user.name}
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-[#F9F7F2] px-3 py-1 text-xs font-semibold text-[#5D4037] mt-1">
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {user.userId ? (
                        <p className="font-mono text-[#8B6914]">{user.userId}</p>
                      ) : null}
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Photo & Detailed Info */}
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-[#E6E2D3] bg-[#F9F7F2] flex items-center justify-center shrink-0">
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl text-[#8D6E63]">{user.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BsEnvelope className="text-gray-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BsTelephone className="text-gray-400" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-[#E6E2D3] mt-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <BsPencil />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION (GRID) */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
              <p className="text-sm text-[#5D4037]">
                Showing{' '}
                <span className="font-semibold">
                  {filteredUsers.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredUsers.length,
                  )}
                </span>{' '}
                of{' '}
                <span className="font-semibold">{filteredUsers.length}</span>{' '}
                users
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(p => Math.max(p - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${currentPage === page
                          ? 'bg-[#5D4037] text-white shadow-md'
                          : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'
                          }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(p => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-[#F9F7F2] text-[#5D4037] font-serif">
                    <tr>
                      <th className="p-4 font-bold border-b border-[#E6E2D3]">
                        User
                      </th>
                      <th className="p-4 font-bold border-b border-[#E6E2D3]">
                        Email
                      </th>
                      <th className="p-4 font-bold border-b border-[#E6E2D3]">
                        Role
                      </th>
                      <th className="p-4 font-bold border-b border-[#E6E2D3]">
                        Phone
                      </th>
                      <th className="p-4 font-bold border-b border-[#E6E2D3]">
                        Created
                      </th>
                      <th className="p-4 font-bold border-b border-[#E6E2D3] text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2D3]">
                    {paginatedUsers.map(user => (
                      <tr
                        key={user._id}
                        className="hover:bg-[#FDFBF7] transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F9F7F2] border border-[#E6E2D3] flex items-center justify-center shrink-0">
                              {user.profilePhoto ? (
                                <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-[#8D6E63]">{user.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{user.name}</p>
                              <p className="text-xs text-[#8B6914] font-mono">{user.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full bg-[#F9F7F2] px-3 py-1 text-xs font-semibold text-[#5D4037]">
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">{user.phone || '-'}</td>
                        <td className="p-4">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <BsPencil />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <BsTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGINATION (TABLE) */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
              <p className="text-sm text-[#5D4037]">
                Showing{' '}
                <span className="font-semibold">
                  {filteredUsers.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredUsers.length,
                  )}
                </span>{' '}
                of{' '}
                <span className="font-semibold">{filteredUsers.length}</span>{' '}
                users
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(p => Math.max(p - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${currentPage === page
                          ? 'bg-[#5D4037] text-white shadow-md'
                          : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'
                          }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(p => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#5D4037]/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 transform transition-all scale-100 animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center relative overflow-hidden">
              {/* Decorative circle */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-2xl font-serif font-bold">
                  {editingId ? 'Edit User Profile' : 'Create New User'}
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  {editingId
                    ? 'Update user details and permissions.'
                    : 'Add a new member to the Hotelmania system.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="relative z-10 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors backdrop-blur-sm"
              >
                <BsX size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-8 space-y-8 overflow-y-auto max-h-[80vh]"
            >
              {formErrors.server && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm">
                  <BsExclamationCircle /> {formErrors.server}
                </div>
              )}

              {/* Top Section: Photo & User ID */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Photo Upload - Circular with Overlay */}
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32 rounded-full border-4 border-[#FDFBF7] shadow-lg bg-[#F9F7F2] overflow-hidden group">
                    {userForm.profilePhoto ? (
                      <img src={userForm.profilePhoto} alt="Preview" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-[#E6E2D3]">
                        <BsPeople className="text-5xl text-[#5D4037] opacity-50" />
                      </div>
                    )}

                    {/* Upload Overlay */}
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                      <BsCamera className="text-white text-2xl mb-1" />
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Profile Photo</p>
                </div>


                {/* User ID Field - Input ReadOnly */}
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-[#8D6E63] uppercase tracking-wider mb-2">
                    User ID
                  </label>
                  <div className="w-full relative">
                    <input
                      type="text"
                      value={userForm.userId || ''}
                      readOnly
                      className="w-full p-4 pl-12 bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl font-mono font-medium text-[#5D4037] outline-none"
                    />
                    <BsPersonBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] text-lg" />
                    {editingId && <BsCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    System generated unique identifier. Cannot be changed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase tracking-wider mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={userForm.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className={`w-full p-3 bg-white border ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-[#E6E2D3]'} rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder:text-gray-300`}

                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase tracking-wider mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userForm.email}
                    onChange={handleInputChange}
                    placeholder="e.g. john@example.com"
                    className={`w-full p-3 bg-white border ${formErrors.email ? 'border-red-300 bg-red-50' : 'border-[#E6E2D3]'} rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder:text-gray-300`}

                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase tracking-wider mb-2">
                    Password {editingId ? '(Optional)' : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleInputChange}
                    placeholder={editingId ? 'Leave blank to keep current' : 'Min 6 characters'}
                    className={`w-full p-3 bg-white border ${formErrors.password ? 'border-red-300 bg-red-50' : 'border-[#E6E2D3]'} rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder:text-gray-300`}

                  />
                  {formErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={userForm.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 0771234567"
                    className={`w-full p-3 bg-white border ${formErrors.phone ? 'border-red-300 bg-red-50' : 'border-[#E6E2D3]'} rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder:text-gray-300`}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.phone}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#5D4037] uppercase tracking-wider mb-2">
                    Access Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['guest', 'manager', 'admin'].map((role) => (
                      <label key={role} className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${userForm.role === role ? 'border-[#8D6E63] bg-[#FDFBF7]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={userForm.role === role}
                          onChange={handleInputChange}
                          className="absolute opacity-0"
                        />
                        <span className={`text-sm font-bold capitalize ${userForm.role === role ? 'text-[#8D6E63]' : 'text-gray-500'}`}>{role}</span>
                        {userForm.role === role && <BsCheckCircle className="absolute top-2 right-2 text-[#8D6E63] text-xs" />}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-dashed border-[#E6E2D3]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-transparent text-gray-500 font-bold rounded-full hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={opLoading}
                  className="px-8 py-3 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center gap-2"
                >
                  {opLoading ? (
                    <>Processing...</>
                  ) : (
                    <>{editingId ? 'Update User' : 'Create Account'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}
    </AdminLayout >
  );
};

export default ManageUsers;
