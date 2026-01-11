
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
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
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/bookings" element={<ManageBookings />} />
            <Route path="/admin/hotels" element={<ManageHotels />} />
            <Route path="/admin/rooms" element={<ManageRooms />} />
            <Route path="/admin/transactions" element={<ManageTransactions />} />
            <Route path="/admin/feedbacks" element={<ManageFeedbacks />} />
            <Route path="/admin/users" element={<ManageUsers />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;