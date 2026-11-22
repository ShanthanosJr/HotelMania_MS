
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import RequireRole from './components/RequireRole';
import { ADMIN_ROUTE_ROLES } from './utils/auth';
import Home from './pages/user/Home';
import About from './pages/user/About';
import Rooms from './pages/user/Rooms';
import RoomDetails from './pages/user/RoomDetails';
import Hotels from './pages/user/Hotels';
import HotelDetails from './pages/user/HotelDetails';
import Bookings from './pages/user/Bookings';
import Contact from './pages/user/Contact';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Profile from './pages/user/Profile';
import Policies from './pages/user/Policies';
import NotFound from './pages/user/NotFound';

import Dashboard from './pages/admin/Dashboard';
import ManageBookings from './pages/admin/ManageBookings';
import ManageHotels from './pages/admin/ManageHotels';
import ManageRooms from './pages/admin/ManageRooms';
import ManageTransactions from './pages/admin/ManageTransactions';
import ManageFeedbacks from './pages/admin/ManageFeedbacks';
import ManageUsers from './pages/admin/ManageUsers';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="bg-dark text-light">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/room/:id" element={<RoomDetails />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotel/:id" element={<HotelDetails />} />
            <Route path="/bookings" element={<RequireRole roles={['guest', 'admin', 'receptionist', 'housekeeping']}><Bookings /></RequireRole>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<RequireRole roles={['guest', 'admin', 'receptionist', 'housekeeping']}><Profile /></RequireRole>} />

            <Route path="/policies" element={<Policies />} />

            <Route path="/admin" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin']}><Dashboard /></RequireRole>} />
            <Route path="/admin/dashboard" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/dashboard']}><Dashboard /></RequireRole>} />
            <Route path="/admin/bookings" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/bookings']}><ManageBookings /></RequireRole>} />
            <Route path="/admin/hotels" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/hotels']}><ManageHotels /></RequireRole>} />
            <Route path="/admin/rooms" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/rooms']}><ManageRooms /></RequireRole>} />
            <Route path="/admin/transactions" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/transactions']}><ManageTransactions /></RequireRole>} />
            <Route path="/admin/feedbacks" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/feedbacks']}><ManageFeedbacks /></RequireRole>} />
            <Route path="/admin/users" element={<RequireRole roles={ADMIN_ROUTE_ROLES['/admin/users']}><ManageUsers /></RequireRole>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;