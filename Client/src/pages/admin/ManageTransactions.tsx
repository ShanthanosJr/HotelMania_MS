import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import {
  BsArrowLeft,
  BsPlusCircle,
  BsSearch,
  BsGrid,
  BsList,
  BsCreditCard,
  BsWallet2,
  BsCheckCircle,
  BsExclamationTriangle,
  BsX,
  BsTrash,
  BsPencil,
  BsFilter,
  BsClockHistory,
  BsChevronLeft,
  BsChevronRight,
} from 'react-icons/bs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type TransactionType = 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer' | string;
type TransactionStatus = 'success' | 'failed' | 'pending';

interface BookingUser {
  name?: string;
}

interface BookingRoom {
  roomNumber?: string | number;
}

interface Booking {
  _id: string;
  user?: BookingUser;
  room?: BookingRoom;
  totalPrice?: number;
}

interface Transaction {
  _id: string;
  booking: Booking | string;
  amount: number;
  type: TransactionType;
  transactionId: string;
  createdAt: string;
}

interface TransactionFormState {
  booking: string;
  amount: string;
  type: TransactionType;
  transactionId: string;
}

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token !== null && token !== undefined && token !== '';
};

const ManageTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [transactionForm, setTransactionForm] = useState<TransactionFormState>({
    booking: '',
    amount: '',
    type: 'credit_card',
    transactionId: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] =
    useState<'all' | TransactionStatus>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const chartColors = ['#8D6E63', '#5D4037', '#D4AF37', '#81C784', '#E57373'];

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/transactions');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch transactions');
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTransactions(data.data);
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to fetch transactions: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/api/bookings');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      fetchTransactions();
      fetchBookings();
    } else {
      setError(
        'You must be logged in as an admin to access this page. Please log in first.',
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dateRange]);

  const handleInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement
  > = e => {
    const { name, value } = e.target;

    if (name === 'booking') {
      const selectedBooking = bookings.find(b => b._id === value);
      if (selectedBooking) {
        const autoAmount = selectedBooking.totalPrice
          ? String(selectedBooking.totalPrice)
          : '';
        const autoTxnId = `TXN-${Date.now()}`; // Simple auto-generation

        setTransactionForm(prev => ({
          ...prev,
          booking: value,
          amount: autoAmount,
          transactionId: prev.transactionId || autoTxnId, // Only auto-fill if empty? Or always? User said "auto generated", usually implies convenience. Let's do it if empty or if we want to force distinct IDs for every new selection. Let's prefer standard behavior: fill if empty or overwrite to ensure uniqueness for *this* transaction. Actually, for a new transaction, overwriting is helpful.
        }));
        return;
      }
    }

    setTransactionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();
    try {
      let response;
      if (editingId) {
        response = await api.put(
          `/api/transactions/${editingId}`,
          transactionForm,
        );
      } else {
        response = await api.post('/api/transactions', transactionForm);
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
          setTransactions(prev =>
            prev.map(t => (t._id === editingId ? result.data : t)),
          );
          alert('Transaction updated successfully!');
        } else {
          setTransactions(prev => [...prev, result.data]);
          alert('Transaction created successfully!');
        }
        setEditingId(null);
        resetForm();
        setShowModal(false);
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Operation failed: ${err.message}`);
        alert(
          `Operation failed: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    const bookingId =
      typeof transaction.booking === 'string'
        ? transaction.booking
        : transaction.booking?._id;
    setTransactionForm({
      booking: bookingId || '',
      amount: String(transaction.amount),
      type: transaction.type,
      transactionId: transaction.transactionId,
    });
    setEditingId(transaction._id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this transaction? This action cannot be undone.',
      )
    )
      return;
    try {
      const response = await api.delete(`/api/transactions/${id}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delete operation failed');
      }
      const result = await response.json();
      if (result.success) {
        setTransactions(prev => prev.filter(t => t._id !== id));
        alert('Transaction deleted successfully!');
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to delete transaction: ${err.message}`);
        alert(
          `Failed to delete transaction: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    }
  };

  const resetForm = () => {
    setTransactionForm({
      booking: '',
      amount: '',
      type: 'credit_card',
      transactionId: '',
    });
    setEditingId(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDateRange({ from: '', to: '' });
  };

  const getStatusForTransaction = (t: Transaction): TransactionStatus => {
    if (t.amount <= 0) return 'failed';
    const created = new Date(t.createdAt).getTime();
    const now = Date.now();
    if (now - created < 1000 * 60) return 'pending';
    return 'success';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const bookingObj =
        typeof t.booking === 'string'
          ? bookings.find(b => b._id === t.booking)
          : t.booking;

      const bookingLabel = bookingObj
        ? `Room ${bookingObj.room?.roomNumber || ''} ${bookingObj.user?.name || ''}`
        : '';

      const matchesSearch =
        bookingLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.transactionId)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === 'all' ? true : t.type === typeFilter;

      const status = getStatusForTransaction(t);
      const matchesStatus =
        statusFilter === 'all' ? true : status === statusFilter;

      const txDate = new Date(t.createdAt).setHours(0, 0, 0, 0);
      const fromOk =
        !dateRange.from ||
        txDate >= new Date(dateRange.from).setHours(0, 0, 0, 0);
      const toOk =
        !dateRange.to ||
        txDate <= new Date(dateRange.to).setHours(23, 59, 59, 999);

      return matchesSearch && matchesType && matchesStatus && fromOk && toOk;
    });
  }, [transactions, bookings, searchTerm, typeFilter, statusFilter, dateRange]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredTransactions, currentPage]
  );

  const metrics = useMemo(() => {
    const totalVolume = filteredTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const successCount = filteredTransactions.filter(
      t => getStatusForTransaction(t) === 'success',
    ).length;
    const failedCount = filteredTransactions.filter(
      t => getStatusForTransaction(t) === 'failed',
    ).length;
    const pendingCount = filteredTransactions.filter(
      t => getStatusForTransaction(t) === 'pending',
    ).length;

    const typeMap: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      typeMap[t.type] = (typeMap[t.type] || 0) + (t.amount || 0);
    });

    const typeData = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    }));

    const statusData = [
      { name: 'Success', value: successCount, color: '#81C784' },
      { name: 'Failed', value: failedCount, color: '#E57373' },
      { name: 'Pending', value: pendingCount, color: '#FFB74D' },
    ];

    const byDayMap: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const day = new Date(t.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      byDayMap[day] = (byDayMap[day] || 0) + (t.amount || 0);
    });
    const volumeByDay = Object.entries(byDayMap).map(([name, value]) => ({
      name,
      value,
    }));

    return { totalVolume, successCount, failedCount, pendingCount, typeData, statusData, volumeByDay };
  }, [filteredTransactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center text-[#5D4037] font-serif text-xl">
        Loading transactions...
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* HERO HEADER */}
      <div className="relative bg-gradient-to-r from-[#4E342E] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                <BsWallet2 className="text-3xl text-[#E6E2D3]" />
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight">
                Transactions
              </h1>
            </div>
            <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
              Monitor payment activity, reconcile revenue, and keep your Hotelmania ledger in sync.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 font-semibold cursor-pointer"
            >
              <BsArrowLeft /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#E6E2D3] text-[#5D4037] hover:bg-white hover:shadow-xl rounded-full transition-all duration-300 font-bold shadow-lg transform hover:-translate-y-1 cursor-pointer"
            >
              <BsPlusCircle /> Add Transaction
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
              className="mt-2 text-red-500 hover:text-red-700 text-sm font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-[#FDFBF7] text-[#8D6E63]">
              <BsCreditCard size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Total Volume
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                ${metrics.totalVolume.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-green-50 text-green-600">
              <BsCheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Successful
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {metrics.successCount}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-red-50 text-red-600">
              <BsExclamationTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Failed
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {metrics.failedCount}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
            <div className="p-4 rounded-full bg-amber-50 text-amber-600">
              <BsClockHistory size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                Pending
              </p>
              <h3 className="text-2xl font-serif font-bold text-[#5D4037]">
                {metrics.pendingCount}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'grid'
                ? 'bg-[#5D4037] text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100 hover:text-[#5D4037]'
                }`}
            >
              <BsGrid /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'table'
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
                placeholder="Search by room, guest or ID..."
                className="pl-10 pr-4 py-2.5 w-full bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5D4037] border border-[#E6E2D3] rounded-full hover:bg-[#F9F7F2] cursor-pointer"
            >
              <BsFilter /> Reset Filters
            </button>
          </div>
        </div>

        {/* FILTER STRIP */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-wrap gap-4 items-center">
          <select
            className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
            value={typeFilter}
            onChange={e =>
              setTypeFilter(e.target.value as 'all' | TransactionType)
            }
          >
            <option value="all">All Methods</option>
            <option value="credit_card">Credit card</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>

          <select
            className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as 'all' | TransactionStatus)
            }
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>From</span>
            <input
              type="date"
              className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm focus:ring-2 focus:ring-[#8D6E63] outline-none"
              value={dateRange.from}
              onChange={e =>
                setDateRange(prev => ({ ...prev, from: e.target.value }))
              }
            />
            <span>To</span>
            <input
              type="date"
              className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm focus:ring-2 focus:ring-[#8D6E63] outline-none"
              value={dateRange.to}
              onChange={e =>
                setDateRange(prev => ({ ...prev, to: e.target.value }))
              }
            />
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
            <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4 flex items-center gap-2">
              Payment Methods
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.typeData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                  >
                    {metrics.typeData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F9F7F2',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                    formatter={(value: any) => [`$${value}`, 'Volume']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
            <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4 flex items-center gap-2">
              Status Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.statusData}>
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
                    radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fontSize: 11 }}
                  >
                    {metrics.statusData.map((entry, _index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
            <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4 flex items-center gap-2">
              Volume by Day
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.volumeByDay}>
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
                    formatter={(value: any) => [`$${value}`, 'Volume']}
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

        {/* MAIN VIEW: CARDS OR TABLE */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E6E2D3] text-center text-sm text-gray-500">
            No transactions found.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTransactions.map(t => {
              const bookingObj =
                typeof t.booking === 'string'
                  ? bookings.find(b => b._id === t.booking)
                  : t.booking;
              const status = getStatusForTransaction(t);

              return (
                <div
                  key={t._id}
                  className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Room{' '}
                        {bookingObj?.room?.roomNumber
                          ? String(bookingObj.room.roomNumber)
                          : 'N/A'}
                      </p>
                      <h4 className="text-lg font-serif font-bold text-[#5D4037]">
                        {bookingObj?.user?.name || 'N/A'}
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${status === 'success'
                        ? 'bg-green-50 text-green-700'
                        : status === 'failed'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                        }`}
                    >
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-xl font-bold text-[#5D4037]">
                      ${t.amount.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Method:{' '}
                    <span className="font-semibold text-[#5D4037]">
                      {t.type.replace('_', ' ')}
                    </span>
                  </p>

                  <p className="text-xs text-gray-500">
                    ID:{' '}
                    <span className="font-mono text-[0.7rem]">
                      {t.transactionId}
                    </span>
                  </p>

                  <p className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleString()}
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-[#E6E2D3] mt-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <BsPencil />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#F9F7F2] text-[#5D4037] font-serif">
                  <tr>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Booking
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      User
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Amount
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Type
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Status
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Transaction ID
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3]">
                      Date
                    </th>
                    <th className="p-4 font-bold border-b border-[#E6E2D3] text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2D3]">
                  {paginatedTransactions.map(t => {
                    const bookingObj =
                      typeof t.booking === 'string'
                        ? bookings.find(b => b._id === t.booking)
                        : t.booking;
                    const status = getStatusForTransaction(t);

                    return (
                      <tr
                        key={t._id}
                        className="hover:bg-[#FDFBF7] transition-colors"
                      >
                        <td className="p-4">
                          Room{' '}
                          {bookingObj?.room?.roomNumber
                            ? String(bookingObj.room.roomNumber)
                            : 'N/A'}
                        </td>
                        <td className="p-4">
                          {bookingObj?.user?.name || 'N/A'}
                        </td>
                        <td className="p-4">${t.amount.toFixed(2)}</td>
                        <td className="p-4">
                          {t.type.replace('_', ' ')}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status === 'success'
                              ? 'bg-green-50 text-green-700'
                              : status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                              }`}
                          >
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[0.7rem]">
                            {t.transactionId}
                          </span>
                        </td>
                        <td className="p-4">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(t)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <BsPencil />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <BsTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGINATION */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white border border-[#E6E2D3] rounded-2xl shadow-sm mt-8">
            <div className="text-sm text-[#5D4037] mb-4 md:mb-0">
              Showing <span className="font-bold">{filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-bold">{filteredTransactions.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <BsChevronLeft />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === num ? 'bg-[#5D4037] text-white shadow-md' : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <BsChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D3] dark:border-gray-700 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BsCreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold tracking-wide">
                    {editingId ? 'Edit Transaction' : 'New Transaction'}
                  </h2>
                  <p className="text-white/80 text-sm font-light">
                    Record payment details and link to a booking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
              >
                <BsX size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#1E1E1E] space-y-8"
            >
              {/* Section 1: Link Booking */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsCheckCircle className="text-[#8D6E63]" /> Booking Reference
                </h3>
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                    Select Booking
                  </label>
                  <div className="relative">
                    <select
                      name="booking"
                      value={transactionForm.booking}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                      required
                    >
                      <option value="">Select a booking...</option>
                      {bookings.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.user?.name || 'Unknown Guest'} — Room {b.room?.roomNumber || 'N/A'}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <BsChevronLeft className="-rotate-90 text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsWallet2 className="text-[#8D6E63]" /> Payment Details
                </h3>

                {/* Payment Method - Visual Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'credit_card', label: 'Credit Card', icon: BsCreditCard },
                      { id: 'debit_card', label: 'Debit Card', icon: BsCreditCard },
                      { id: 'cash', label: 'Cash', icon: BsWallet2 },
                      { id: 'bank_transfer', label: 'Bank Transfer', icon: BsArrowLeft }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setTransactionForm(prev => ({ ...prev, type: method.id }))}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${transactionForm.type === method.id
                          ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-lg scale-105 cursor-pointer'
                          : 'bg-[#F9F7F2] text-[#6B5B4F] border-[#E6E2D3] hover:bg-white hover:border-[#8D6E63]'
                          }`}
                      >
                        <method.icon size={20} />
                        <span className="text-xs font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                      Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] font-bold">$</span>
                      <input
                        type="number"
                        name="amount"
                        value={transactionForm.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-bold text-lg"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      value={transactionForm.transactionId}
                      onChange={handleInputChange}
                      placeholder="e.g. TXN-12345"
                      className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 dark:bg-[#121212] border-t border-[#E6E2D3] dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl text-[#5D4037] font-bold hover:bg-[#E6E2D3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleSubmit(e as any)}
                type="button"
                className="px-8 py-2.5 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-xl shadow-lg shadow-[#5D4037]/20 hover:shadow-xl hover:shadow-[#5D4037]/30 transform hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {editingId ? 'Update Transaction' : 'Record Payment'}
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageTransactions;
