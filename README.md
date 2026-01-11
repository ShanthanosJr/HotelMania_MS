# HotelMania

A comprehensive hotel management system built with MERN stack

## Description

HotelMania is a full-stack hotel management application that allows users to browse hotels, book rooms, manage reservations, and provides administrative controls for hotel management.

## Features

### User Features:
- User registration and authentication
- Browse hotels and room types
- View hotel details and amenities
- Book rooms with date selection
- Manage personal bookings
- View booking history
- User profile management

### Admin Features:
- Dashboard with analytics
- Manage hotels (add, edit, delete)
- Manage rooms and room types
- Manage user accounts
- Manage bookings
- Manage transactions
- View feedback and reviews

## Tech Stack

### Frontend:
- React.js
- TypeScript
- Vite
- Tailwind CSS

### Backend:
- Node.js
- Express.js

### Database:
- MongoDB

### Other Technologies:
- JWT for authentication
- Multer for file uploads

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ShanthanosJr/HotelMania_MS.git
   ```

2. Install server dependencies:
   ```bash
   cd HotelMania_MS/Server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../Client
   npm install
   ```

4. Set up environment variables in the Server directory:
   Create a `.env` file with the following variables:
   ```
   PORT=your_port_number
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

## Usage

### Running the Server:
```bash
cd Server
npm start
```

### Running the Client:
```bash
cd Client
npm run dev
```

## Project Structure

```
HotelMania_MS/
├── Client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context providers
│   │   └── utils/       # Utility functions
├── Server/              # Backend Node.js application
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware functions
│   └── config/          # Configuration files
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires authentication)

### Hotels
- `GET /api/hotels` - Get all hotels
- `GET /api/hotels/:id` - Get a specific hotel
- `POST /api/hotels` - Create a new hotel (admin only)
- `PUT /api/hotels/:id` - Update a hotel (admin only)
- `DELETE /api/hotels/:id` - Delete a hotel (admin only)

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get a specific room
- `POST /api/rooms` - Create a new room (admin only)
- `PUT /api/rooms/:id` - Update a room (admin only)
- `DELETE /api/rooms/:id` - Delete a room (admin only)

### Bookings
- `GET /api/bookings` - Get all bookings (admin) or user's bookings
- `POST /api/bookings` - Create a new booking
- `PUT /api/bookings/:id` - Update a booking
- `DELETE /api/bookings/:id` - Cancel a booking

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.