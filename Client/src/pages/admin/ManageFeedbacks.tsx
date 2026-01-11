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
  BsChatSquareQuote,
  BsTools,
  BsStarFill,
  BsTrash,
  BsPencil,
  BsX,
  BsCheckCircle,
  BsBucket,
  BsCupHot,
  BsClock,
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

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token !== null && token !== undefined && token !== '';
};

type ActiveTab = 'reviews' | 'service';

interface User {
  _id: string;
  name: string;
}

interface HotelRef {
  name?: string;
}

interface RoomRef {
  _id?: string;
  roomNumber?: string | number;
  hotel?: HotelRef;
}

interface Review {
  _id: string;
  user: User | string;
  room: RoomRef | string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ServiceRequest {
  _id: string;
  room: RoomRef | string;
  type: 'cleaning' | 'maintenance' | 'room_service' | string;
  status: 'pending' | 'in_progress' | 'completed' | string;
  requestedAt: string;
}

interface ReviewFormState {
  user: string;
  room: string;
  rating: number;
  comment: string;
}

interface ServiceRequestFormState {
  room: string;
  type: string;
  status: string;
}

const ManageFeedback: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('reviews');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<RoomRef[]>([]);

  const [reviewForm, setReviewForm] = useState<ReviewFormState>({
    user: '',
    room: '',
    rating: 5,
    comment: '',
  });
  const [serviceForm, setServiceForm] = useState<ServiceRequestFormState>({
    room: '',
    type: 'cleaning',
    status: 'pending',
  });

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // search/filters + pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [serviceStatusFilter, setServiceStatusFilter] =
    useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] =
    useState<'all' | 'cleaning' | 'maintenance' | 'room_service'>('all');

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [reviewPage, setReviewPage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const itemsPerPage = 6;

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [statusUpdateLoading, setStatusUpdateLoading] = useState<
    Record<string, boolean>
  >({});

  const chartColors = ['#8D6E63', '#5D4037', '#D4AF37', '#81C784', '#E57373'];

  // --- FETCHING ---

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/reviews');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to fetch reviews');
      }
      const data = await res.json();
      if (data.success) setReviews(data.data);
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to fetch reviews: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/service-requests');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to fetch service requests');
      }
      const data = await res.json();
      if (data.success) setServiceRequests(data.data);
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to fetch service requests: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setRooms(data.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      fetchReviews();
      fetchServiceRequests();
      fetchUsers();
      fetchRooms();
    } else {
      setError(
        'You must be logged in as an admin to access this page. Please log in first.',
      );
      setLoading(false);
    }
  }, []);

  // reset page when filters/search change
  useEffect(() => {
    setReviewPage(1);
  }, [searchTerm, ratingFilter]);

  useEffect(() => {
    setServicePage(1);
  }, [searchTerm, serviceStatusFilter, serviceTypeFilter]);

  // --- FORM HANDLERS ---

  const handleReviewChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  > = e => {
    const { name, value } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: name === 'rating' ? Number(value) : value,
    }));
  };

  const handleServiceChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement
  > = e => {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
  };

  const resetReviewForm = () => {
    setReviewForm({ user: '', room: '', rating: 5, comment: '' });
    setEditingReviewId(null);
  };

  const resetServiceForm = () => {
    setServiceForm({ room: '', type: 'cleaning', status: 'pending' });
    setEditingServiceId(null);
  };

  const handleReviewSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();
    try {
      let res;
      if (editingReviewId) {
        res = await api.put(`/api/reviews/${editingReviewId}`, reviewForm);
      } else {
        res = await api.post('/api/reviews', reviewForm);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed');
      }

      const result = await res.json();
      if (result.success) {
        if (editingReviewId) {
          setReviews(prev =>
            prev.map(r => (r._id === editingReviewId ? result.data : r)),
          );
          alert('Review updated successfully!');
        } else {
          setReviews(prev => [...prev, result.data]);
          alert('Review created successfully!');
        }
        resetReviewForm();
        setShowReviewModal(false);
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

  const handleServiceSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();
    try {
      let res;
      if (editingServiceId) {
        res = await api.put(
          `/api/service-requests/${editingServiceId}`,
          serviceForm,
        );
      } else {
        res = await api.post('/api/service-requests', serviceForm);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed');
      }

      const result = await res.json();
      if (result.success) {
        if (editingServiceId) {
          setServiceRequests(prev =>
            prev.map(r => (r._id === editingServiceId ? result.data : r)),
          );
          alert('Service request updated successfully!');
        } else {
          setServiceRequests(prev => [...prev, result.data]);
          alert('Service request created successfully!');
        }
        resetServiceForm();
        setShowServiceModal(false);
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

  const handleReviewEdit = (review: Review) => {
    const userId =
      typeof review.user === 'string' ? review.user : review.user?._id;
    const roomId =
      typeof review.room === 'string' ? review.room : review.room?._id;
    setReviewForm({
      user: userId || '',
      room: roomId || '',
      rating: review.rating,
      comment: review.comment,
    });
    setEditingReviewId(review._id);
    setShowReviewModal(true);
  };

  const handleServiceEdit = (req: ServiceRequest) => {
    const roomId =
      typeof req.room === 'string' ? req.room : req.room?._id;
    setServiceForm({
      room: roomId || '',
      type: req.type,
      status: req.status,
    });
    setEditingServiceId(req._id);
    setShowServiceModal(true);
  };

  const handleReviewDelete = async (id: string) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const res = await api.delete(`/api/reviews/${id}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Delete operation failed');
      }
      const result = await res.json();
      if (result.success) {
        setReviews(prev => prev.filter(r => r._id !== id));
        alert('Review deleted successfully!');
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to delete review: ${err.message}`);
        alert(
          `Failed to delete review: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    }
  };

  const handleServiceDelete = async (id: string) => {
    if (!window.confirm('Delete this service request?')) return;
    try {
      const res = await api.delete(`/api/service-requests/${id}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Delete operation failed');
      }
      const result = await res.json();
      if (result.success) {
        setServiceRequests(prev => prev.filter(r => r._id !== id));
        alert('Service request deleted successfully!');
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to delete service request: ${err.message}`);
        alert(
          `Failed to delete service request: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      setStatusUpdateLoading(prev => ({ ...prev, [id]: true }));
      const res = await api.put(`/api/service-requests/${id}`, {
        status: newStatus,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please log in as an admin user.');
          alert('Authentication failed. Please log in as an admin user.');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Update operation failed');
      }
      const result = await res.json();
      if (result.success) {
        setServiceRequests(prev =>
          prev.map(r => (r._id === id ? result.data : r)),
        );
        let message = '';
        if (newStatus === 'in_progress') {
          message = 'Service request accepted and is now in progress!';
        } else if (newStatus === 'completed') {
          message = 'Service request marked as completed!';
        }
        alert(message);
      }
    } catch (err: any) {
      if (!String(err.message).includes('Authentication failed')) {
        setError(`Failed to update service request: ${err.message}`);
        alert(
          `Failed to update service request: ${err.message || 'Please check console for details.'}`,
        );
      }
      console.error(err);
    } finally {
      setStatusUpdateLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRatingFilter('all');
    setServiceStatusFilter('all');
    setServiceTypeFilter('all');
  };

  // --- FILTERED DATA ---

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const userObj =
        typeof r.user === 'string' ? users.find(u => u._id === r.user) : r.user;
      const roomObj =
        typeof r.room === 'string' ? rooms.find(rm => rm._id === r.room) : r.room;

      const label = `${userObj?.name || ''} Room ${roomObj?.roomNumber || ''
        } ${roomObj?.hotel?.name || ''}`;

      const matchesSearch = label
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesRating =
        ratingFilter === 'all' ? true : r.rating === Number(ratingFilter);

      return matchesSearch && matchesRating;
    });
  }, [reviews, users, rooms, searchTerm, ratingFilter]);

  const filteredServiceRequests = useMemo(() => {
    return serviceRequests.filter(req => {
      const roomObj =
        typeof req.room === 'string'
          ? rooms.find(rm => rm._id === req.room)
          : req.room;
      const label = `Room ${roomObj?.roomNumber || ''} ${roomObj?.hotel?.name || ''
        }`;

      const matchesSearch = label
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        serviceStatusFilter === 'all'
          ? true
          : req.status === serviceStatusFilter;
      const matchesType =
        serviceTypeFilter === 'all' ? true : req.type === serviceTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [
    serviceRequests,
    rooms,
    searchTerm,
    serviceStatusFilter,
    serviceTypeFilter,
  ]);

  // --- PAGINATION ---

  const reviewTotalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const serviceTotalPages = Math.ceil(
    filteredServiceRequests.length / itemsPerPage,
  );

  const paginatedReviews = useMemo(
    () =>
      filteredReviews.slice(
        (reviewPage - 1) * itemsPerPage,
        reviewPage * itemsPerPage,
      ),
    [filteredReviews, reviewPage],
  );

  const paginatedServiceRequests = useMemo(
    () =>
      filteredServiceRequests.slice(
        (servicePage - 1) * itemsPerPage,
        servicePage * itemsPerPage,
      ),
    [filteredServiceRequests, servicePage],
  );

  // --- METRICS / CHART DATA ---

  const reviewMetrics = useMemo(() => {
    const total = reviews.length;
    const avgRating =
      total > 0
        ? (
          reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total
        ).toFixed(1)
        : '0.0';

    const ratingDist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < 5) ratingDist[idx]++;
    });

    const ratingData = ratingDist.map((count, i) => ({
      name: `${i + 1}★`,
      value: count,
    }));

    return { total, avgRating, ratingData };
  }, [reviews]);

  const serviceMetrics = useMemo(() => {
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
    } as Record<string, number>;

    serviceRequests.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const statusData = [
      { name: 'Pending', value: statusCounts.pending || 0, color: '#FFB74D' },
      {
        name: 'In Progress',
        value: statusCounts.in_progress || 0,
        color: '#64B5F6',
      },
      {
        name: 'Completed',
        value: statusCounts.completed || 0,
        color: '#81C784',
      },
    ];

    const typeCounts: Record<string, number> = {};
    serviceRequests.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return { statusData, typeData };
  }, [serviceRequests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center text-[#5D4037] font-serif text-xl">
        Loading feedback dashboards...
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* HERO HEADER WITH TABS */}
      <div className="relative bg-gradient-to-r from-[#4E342E] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                <BsChatSquareQuote className="text-3xl text-[#E6E2D3]" />
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight">
                Guest Feedback & Service
              </h1>
            </div>
            <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
              Monitor guest sentiment and coordinate service requests from a single control center.
            </p>
          </div>

          <div className="flex flex-col gap-3 items-stretch md:items-end">
            <div className="flex bg-[#F9F7F2]/10 p-1 rounded-full border border-white/30">
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all ${activeTab === 'reviews'
                  ? 'bg-white text-[#5D4037] shadow-md'
                  : 'text-[#E6E2D3] hover:bg-white/10'
                  }`}
              >
                <BsChatSquareQuote /> Reviews
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('service')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all ${activeTab === 'service'
                  ? 'bg-white text-[#5D4037] shadow-md'
                  : 'text-[#E6E2D3] hover:bg-white/10'
                  }`}
              >
                <BsTools /> Service Requests
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 text-sm font-semibold"
              >
                <BsArrowLeft /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'reviews') {
                    resetReviewForm();
                    setShowReviewModal(true);
                  } else {
                    resetServiceForm();
                    setShowServiceModal(true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E6E2D3] text-[#5D4037] hover:bg-white hover:shadow-xl rounded-full transition-all duration-300 text-sm font-bold shadow-lg transform hover:-translate-y-1"
              >
                <BsPlusCircle /> Add{' '}
                {activeTab === 'reviews' ? 'Review' : 'Service'}
              </button>
            </div>
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

        {/* SHARED TOOLBAR (search + view + reset) */}
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
              <BsGrid /> Grid
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
                placeholder={
                  activeTab === 'reviews'
                    ? 'Search by guest or room...'
                    : 'Search by room or hotel...'
                }
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

        {/* FILTER + CHARTS + GRIDS PER TAB */}
        {activeTab === 'reviews' ? (
          <>
            {/* FILTER STRIP FOR REVIEWS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-wrap gap-4 items-center">
              <select
                className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                value={ratingFilter}
                onChange={e =>
                  setRatingFilter(e.target.value as typeof ratingFilter)
                }
              >
                <option value="all">All Ratings</option>
                <option value="5">5★ only</option>
                <option value="4">4★</option>
                <option value="3">3★</option>
                <option value="2">2★</option>
                <option value="1">1★</option>
              </select>
            </div>

            {/* CHARTS FOR REVIEWS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4 flex items-center gap-2">
                  <BsStarFill className="text-yellow-500" /> Rating Overview
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Total reviews:{' '}
                  <span className="font-semibold text-[#5D4037]">
                    {reviewMetrics.total}
                  </span>
                  , average rating{' '}
                  <span className="font-semibold text-[#5D4037]">
                    {reviewMetrics.avgRating}/5
                  </span>
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reviewMetrics.ratingData}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                      >
                        {reviewMetrics.ratingData.map((entry, idx) => (
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
                  Rating Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reviewMetrics.ratingData}>
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

            {/* GRID / TABLE FOR REVIEWS */}
            {filteredReviews.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E6E2D3] text-center text-sm text-gray-500">
                No reviews found.
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedReviews.map(review => {
                    const userObj =
                      typeof review.user === 'string'
                        ? users.find(u => u._id === review.user)
                        : review.user;
                    const roomObj =
                      typeof review.room === 'string'
                        ? rooms.find(rm => rm._id === review.room)
                        : review.room;

                    return (
                      <div
                        key={review._id}
                        className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">
                              {roomObj?.hotel?.name || 'Hotel'}
                            </p>
                            <h4 className="text-lg font-serif font-bold text-[#5D4037]">
                              Room {roomObj?.roomNumber || 'N/A'}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-yellow-400 text-sm">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <BsStarFill
                                  key={i}
                                  className={
                                    i < review.rating ? 'opacity-100' : 'opacity-30'
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              ({review.rating}/5)
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600">
                          {userObj?.name || 'N/A'}
                        </p>

                        <p className="text-sm text-gray-500 line-clamp-3">
                          {review.comment}
                        </p>

                        <p className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>

                        <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-[#E6E2D3] mt-2">
                          <button
                            type="button"
                            onClick={() => handleReviewEdit(review)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <BsPencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewDelete(review._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <BsTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION REVIEWS */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
                  <p className="text-sm text-[#5D4037]">
                    Showing{' '}
                    <span className="font-semibold">
                      {filteredReviews.length === 0
                        ? 0
                        : (reviewPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold">
                      {Math.min(
                        reviewPage * itemsPerPage,
                        filteredReviews.length,
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {filteredReviews.length}
                    </span>{' '}
                    reviews
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewPage(p => Math.max(p - 1, 1))
                      }
                      disabled={reviewPage === 1}
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: reviewTotalPages }, (_, i) => i + 1).map(
                        page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setReviewPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${reviewPage === page
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
                        setReviewPage(p => Math.min(p + 1, reviewTotalPages))
                      }
                      disabled={
                        reviewPage === reviewTotalPages ||
                        reviewTotalPages === 0
                      }
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
                            Room
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3]">
                            Rating
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3]">
                            Comment
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
                        {paginatedReviews.map(review => {
                          const userObj =
                            typeof review.user === 'string'
                              ? users.find(u => u._id === review.user)
                              : review.user;
                          const roomObj =
                            typeof review.room === 'string'
                              ? rooms.find(rm => rm._id === review.room)
                              : review.room;
                          const shortComment =
                            review.comment.length > 50
                              ? `${review.comment.substring(0, 50)}...`
                              : review.comment;

                          return (
                            <tr
                              key={review._id}
                              className="hover:bg-[#FDFBF7] transition-colors"
                            >
                              <td className="p-4">
                                {userObj?.name || 'N/A'}
                              </td>
                              <td className="p-4">
                                {roomObj?.roomNumber || 'N/A'} -{' '}
                                {roomObj?.hotel?.name || 'Hotel'}
                              </td>
                              <td className="p-4">
                                {'★'.repeat(review.rating)}{' '}
                                {'☆'.repeat(5 - review.rating)} (
                                {review.rating}/5)
                              </td>
                              <td className="p-4">{shortComment}</td>
                              <td className="p-4">
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleReviewEdit(review)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    <BsPencil />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewDelete(review._id)
                                    }
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

                {/* PAGINATION REVIEWS (TABLE) */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
                  <p className="text-sm text-[#5D4037]">
                    Showing{' '}
                    <span className="font-semibold">
                      {filteredReviews.length === 0
                        ? 0
                        : (reviewPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold">
                      {Math.min(
                        reviewPage * itemsPerPage,
                        filteredReviews.length,
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {filteredReviews.length}
                    </span>{' '}
                    reviews
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewPage(p => Math.max(p - 1, 1))
                      }
                      disabled={reviewPage === 1}
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: reviewTotalPages }, (_, i) => i + 1).map(
                        page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setReviewPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${reviewPage === page
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
                        setReviewPage(p => Math.min(p + 1, reviewTotalPages))
                      }
                      disabled={
                        reviewPage === reviewTotalPages ||
                        reviewTotalPages === 0
                      }
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* FILTER STRIP FOR SERVICE REQUESTS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-wrap gap-4 items-center">
              <select
                className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                value={serviceStatusFilter}
                onChange={e =>
                  setServiceStatusFilter(
                    e.target.value as typeof serviceStatusFilter,
                  )
                }
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <select
                className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                value={serviceTypeFilter}
                onChange={e =>
                  setServiceTypeFilter(
                    e.target.value as typeof serviceTypeFilter,
                  )
                }
              >
                <option value="all">All Types</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
                <option value="room_service">Room service</option>
              </select>
            </div>

            {/* CHARTS FOR SERVICE REQUESTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] mb-4">
                  Requests by Status
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceMetrics.statusData}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                      >
                        {serviceMetrics.statusData.map((entry, _idx) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
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
                  Requests by Type
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceMetrics.typeData}>
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

            {/* GRID / TABLE FOR SERVICE REQUESTS */}
            {filteredServiceRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E6E2D3] text-center text-sm text-gray-500">
                No service requests found.
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedServiceRequests.map(request => {
                    const roomObj =
                      typeof request.room === 'string'
                        ? rooms.find(rm => rm._id === request.room)
                        : request.room;

                    return (
                      <div
                        key={request._id}
                        className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">
                              {roomObj?.hotel?.name || 'Hotel'}
                            </p>
                            <h4 className="text-lg font-serif font-bold text-[#5D4037]">
                              Room {roomObj?.roomNumber || 'N/A'}
                            </h4>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs rounded-full font-semibold ${request.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : request.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-green-50 text-green-700'
                              }`}
                          >
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600">
                          Type:{' '}
                          <span className="font-semibold text-[#5D4037]">
                            {request.type.replace('_', ' ')}
                          </span>
                        </p>

                        <p className="text-xs text-gray-400">
                          {new Date(request.requestedAt).toLocaleString()}
                        </p>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-[#E6E2D3] mt-2">
                          {request.status === 'pending' && (
                            <button
                              type="button"
                              disabled={statusUpdateLoading[request._id]}
                              onClick={() =>
                                handleStatusUpdate(request._id, 'in_progress')
                              }
                              className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Accept
                            </button>
                          )}
                          {request.status === 'in_progress' && (
                            <button
                              type="button"
                              disabled={statusUpdateLoading[request._id]}
                              onClick={() =>
                                handleStatusUpdate(request._id, 'completed')
                              }
                              className="px-3 py-1 text-xs rounded-full bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleServiceEdit(request)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <BsPencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleServiceDelete(request._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <BsTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION SERVICE (GRID) */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
                  <p className="text-sm text-[#5D4037]">
                    Showing{' '}
                    <span className="font-semibold">
                      {filteredServiceRequests.length === 0
                        ? 0
                        : (servicePage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold">
                      {Math.min(
                        servicePage * itemsPerPage,
                        filteredServiceRequests.length,
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {filteredServiceRequests.length}
                    </span>{' '}
                    requests
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setServicePage(p => Math.max(p - 1, 1))
                      }
                      disabled={servicePage === 1}
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: serviceTotalPages }, (_, i) => i + 1).map(
                        page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setServicePage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${servicePage === page
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
                        setServicePage(p => Math.min(p + 1, serviceTotalPages))
                      }
                      disabled={
                        servicePage === serviceTotalPages ||
                        serviceTotalPages === 0
                      }
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
                            Room
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3]">
                            Type
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3]">
                            Status
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3]">
                            Requested At
                          </th>
                          <th className="p-4 font-bold border-b border-[#E6E2D3] text-center">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E2D3]">
                        {paginatedServiceRequests.map(request => {
                          const roomObj =
                            typeof request.room === 'string'
                              ? rooms.find(rm => rm._id === request.room)
                              : request.room;

                          return (
                            <tr
                              key={request._id}
                              className="hover:bg-[#FDFBF7] transition-colors"
                            >
                              <td className="p-4">
                                {roomObj?.roomNumber || 'N/A'} -{' '}
                                {roomObj?.hotel?.name || 'Hotel'}
                              </td>
                              <td className="p-4">
                                {request.type.replace('_', ' ')}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700'
                                    : request.status === 'in_progress'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-green-50 text-green-700'
                                    }`}
                                >
                                  {request.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="p-4">
                                {new Date(
                                  request.requestedAt,
                                ).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  {request.status === 'pending' && (
                                    <button
                                      type="button"
                                      disabled={
                                        statusUpdateLoading[request._id]
                                      }
                                      onClick={() =>
                                        handleStatusUpdate(
                                          request._id,
                                          'in_progress',
                                        )
                                      }
                                      className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                    >
                                      Accept
                                    </button>
                                  )}
                                  {request.status === 'in_progress' && (
                                    <button
                                      type="button"
                                      disabled={
                                        statusUpdateLoading[request._id]
                                      }
                                      onClick={() =>
                                        handleStatusUpdate(
                                          request._id,
                                          'completed',
                                        )
                                      }
                                      className="px-3 py-1 text-xs rounded-full bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                                    >
                                      Completed
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleServiceEdit(request)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    <BsPencil />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleServiceDelete(request._id)
                                    }
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

                {/* PAGINATION SERVICE (TABLE) */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E2D3] shadow-sm">
                  <p className="text-sm text-[#5D4037]">
                    Showing{' '}
                    <span className="font-semibold">
                      {filteredServiceRequests.length === 0
                        ? 0
                        : (servicePage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold">
                      {Math.min(
                        servicePage * itemsPerPage,
                        filteredServiceRequests.length,
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {filteredServiceRequests.length}
                    </span>{' '}
                    requests
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setServicePage(p => Math.max(p - 1, 1))
                      }
                      disabled={servicePage === 1}
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from(
                        { length: serviceTotalPages },
                        (_, i) => i + 1,
                      ).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setServicePage(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${servicePage === page
                            ? 'bg-[#5D4037] text-white shadow-md'
                            : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setServicePage(p => Math.min(p + 1, serviceTotalPages))
                      }
                      disabled={
                        servicePage === serviceTotalPages ||
                        serviceTotalPages === 0
                      }
                      className="px-3 py-2 rounded-lg border border-[#E6E2D3] text-sm text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D3] dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BsChatSquareQuote size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold tracking-wide">
                    {editingReviewId ? 'Edit Review' : 'New Review'}
                  </h2>
                  <p className="text-white/80 text-sm font-light">
                    Capture guest feedback and rating
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
              >
                <BsX size={22} />
              </button>
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#1E1E1E] space-y-8"
            >
              {/* Guest & Room */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsCheckCircle className="text-[#8D6E63]" /> Guest & Stay
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                      Guest
                    </label>
                    <select
                      name="user"
                      value={reviewForm.user}
                      onChange={handleReviewChange}
                      className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                      required
                    >
                      <option value="">Select guest...</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                      Room
                    </label>
                    <select
                      name="room"
                      value={reviewForm.room}
                      onChange={handleReviewChange}
                      className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                      required
                    >
                      <option value="">Select room...</option>
                      {rooms.map(r => (
                        <option key={r._id} value={r._id}>
                          Room {r.roomNumber} – {r.hotel?.name || 'Hotel'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rating & Comment */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsStarFill className="text-[#8D6E63]" /> Feedback
                </h3>
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-3">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className={`text-2xl transition-all hover:scale-110 ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-200'
                          }`}
                      >
                        <BsStarFill />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                    Comment
                  </label>
                  <textarea
                    name="comment"
                    rows={4}
                    value={reviewForm.comment}
                    onChange={handleReviewChange}
                    placeholder="Write guest feedback here..."
                    className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium resize-none"
                    required
                  />
                </div>
              </div>

            </form>

            <div className="p-6 bg-gray-50 dark:bg-[#121212] border-t border-[#E6E2D3] dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-2.5 rounded-xl text-[#5D4037] font-bold hover:bg-[#E6E2D3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleReviewSubmit(e as any)}
                type="button"
                className="px-8 py-2.5 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-xl shadow-lg shadow-[#5D4037]/20 hover:shadow-xl hover:shadow-[#5D4037]/30 transform hover:-translate-y-0.5 transition-all"
              >
                {editingReviewId ? 'Update Review' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE REQUEST MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D3] dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BsTools size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold tracking-wide">
                    {editingServiceId ? 'Edit Request' : 'New Request'}
                  </h2>
                  <p className="text-white/80 text-sm font-light">
                    Manage hotel service and maintenance tasks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
              >
                <BsX size={22} />
              </button>
            </div>

            <form
              onSubmit={handleServiceSubmit}
              className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#1E1E1E] space-y-8"
            >
              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsCheckCircle className="text-[#8D6E63]" /> Location
                </h3>
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">
                    Target Room
                  </label>
                  <select
                    name="room"
                    value={serviceForm.room}
                    onChange={handleServiceChange}
                    className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                    required
                  >
                    <option value="">Select room...</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>
                        Room {r.roomNumber} – {r.hotel?.name || 'Hotel'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Request Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                  <BsTools className="text-[#8D6E63]" /> Request Details
                </h3>

                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-3">
                    Service Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cleaning', label: 'Cleaning', icon: BsBucket },
                      { id: 'maintenance', label: 'Maintenance', icon: BsTools },
                      { id: 'room_service', label: 'Room Service', icon: BsCupHot },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setServiceForm(prev => ({ ...prev, type: type.id }))}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${serviceForm.type === type.id
                          ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-lg scale-105'
                          : 'bg-[#F9F7F2] text-[#6B5B4F] border-[#E6E2D3] hover:bg-white hover:border-[#8D6E63]'
                          }`}
                      >
                        <type.icon size={24} />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-3">
                    Current Status
                  </label>
                  <div className="flex p-1 bg-[#F9F7F2] rounded-xl border border-[#E6E2D3]">
                    {[
                      { id: 'pending', label: 'Pending', icon: BsClock, color: 'text-amber-600' },
                      { id: 'in_progress', label: 'In Progress', icon: BsTools, color: 'text-blue-600' },
                      { id: 'completed', label: 'Completed', icon: BsCheckCircle, color: 'text-green-600' }
                    ].map(status => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => setServiceForm(prev => ({ ...prev, status: status.id }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${serviceForm.status === status.id
                          ? 'bg-white shadow-md text-[#5D4037]'
                          : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        <status.icon className={serviceForm.status === status.id ? status.color : ''} />
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </form>

            <div className="p-6 bg-gray-50 dark:bg-[#121212] border-t border-[#E6E2D3] dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-6 py-2.5 rounded-xl text-[#5D4037] font-bold hover:bg-[#E6E2D3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleServiceSubmit(e as any)}
                type="button"
                className="px-8 py-2.5 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-xl shadow-lg shadow-[#5D4037]/20 hover:shadow-xl hover:shadow-[#5D4037]/30 transform hover:-translate-y-0.5 transition-all"
              >
                {editingServiceId ? 'Update Request' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout >
  );
};

export default ManageFeedback;
