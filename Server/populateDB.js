const mongoose = require('mongoose');
const Hotel = require('./models/Hotel');
const RoomType = require('./models/RoomType');
const Room = require('./models/Room');
require('dotenv').config();

async function populateDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotelmania');
    
    // Clear existing data
    await Hotel.deleteMany({});
    await RoomType.deleteMany({});
    await Room.deleteMany({});
    
    console.log('Creating sample hotels...');
    
    // Create sample hotels
    const hotel1 = await Hotel.create({
      name: 'Grand Plaza Hotel',
      address: '123 Galle Face, Colombo 02',
      description: 'Luxury hotel with stunning ocean views and premium amenities',
      rating: 4.8,
      amenities: ['Pool', 'Spa', 'Free WiFi', 'Parking', 'Gym', 'Restaurant', 'Bar'],
      photos: [
        'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200'
      ],
      contactInfo: {
        phone: '+94 11 243 7654',
        email: 'info@grandplaza.lk',
        website: 'https://www.grandplaza.lk'
      }
    });
    
    const hotel2 = await Hotel.create({
      name: 'Mountain View Resort',
      address: 'Hill Street, Kandy 20000',
      description: 'Beautiful resort nestled in the hills with panoramic views',
      rating: 4.5,
      amenities: ['Pool', 'Free WiFi', 'Parking', 'Restaurant', 'Spa'],
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
      ],
      contactInfo: {
        phone: '+94 81 222 3344',
        email: 'reservations@mountainview.lk',
        website: 'https://www.mountainview.lk'
      }
    });
    
    console.log('Creating sample room types...');
    
    // Create sample room types for hotel 1
    const roomType1 = await RoomType.create({
      name: 'Deluxe Ocean View',
      hotel: hotel1._id,
      basePrice: 250,
      maxOccupancy: 2,
      description: 'Spacious room with stunning ocean views and modern amenities',
      amenities: ['Ocean View', 'King Bed', 'Balcony', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'],
      photos: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70334?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
      ]
    });
    
    const roomType2 = await RoomType.create({
      name: 'Standard Room',
      hotel: hotel1._id,
      basePrice: 120,
      maxOccupancy: 2,
      description: 'Comfortable room with essential amenities for a pleasant stay',
      amenities: ['Twin Beds', 'AC', 'TV', 'Desk', 'WiFi'],
      photos: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
      ]
    });
    
    // Create sample room types for hotel 2
    const roomType3 = await RoomType.create({
      name: 'Mountain View Suite',
      hotel: hotel2._id,
      basePrice: 180,
      maxOccupancy: 3,
      description: 'Luxurious suite with breathtaking mountain views',
      amenities: ['Mountain View', 'Queen Bed', 'Balcony', 'AC', 'TV', 'Living Area'],
      photos: [
        'https://images.unsplash.com/photo-1561501900-3701fa6a0864?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
      ]
    });
    
    const roomType4 = await RoomType.create({
      name: 'Garden View Room',
      hotel: hotel2._id,
      basePrice: 100,
      maxOccupancy: 2,
      description: 'Cozy room overlooking the beautiful hotel garden',
      amenities: ['Garden View', 'Twin Beds', 'AC', 'TV', 'Desk'],
      photos: [
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
      ]
    });
    
    console.log('Creating sample rooms...');
    
    // Create sample rooms for hotel 1
    await Room.create([
      {
        roomNumber: 'H1-101',
        hotel: hotel1._id,
        type: roomType1._id,
        status: 'available'
      },
      {
        roomNumber: 'H1-102',
        hotel: hotel1._id,
        type: roomType1._id,
        status: 'available'
      },
      {
        roomNumber: 'H1-201',
        hotel: hotel1._id,
        type: roomType2._id,
        status: 'available'
      },
      {
        roomNumber: 'H1-202',
        hotel: hotel1._id,
        type: roomType2._id,
        status: 'occupied'
      },
      {
        roomNumber: 'H1-301',
        hotel: hotel1._id,
        type: roomType2._id,
        status: 'maintenance'
      }
    ]);
    
    // Create sample rooms for hotel 2
    await Room.create([
      {
        roomNumber: 'H2-101',
        hotel: hotel2._id,
        type: roomType3._id,
        status: 'available'
      },
      {
        roomNumber: 'H2-102',
        hotel: hotel2._id,
        type: roomType3._id,
        status: 'available'
      },
      {
        roomNumber: 'H2-201',
        hotel: hotel2._id,
        type: roomType4._id,
        status: 'available'
      },
      {
        roomNumber: 'H2-202',
        hotel: hotel2._id,
        type: roomType4._id,
        status: 'available'
      },
      {
        roomNumber: 'H2-301',
        hotel: hotel2._id,
        type: roomType4._id,
        status: 'occupied'
      }
    ]);
    
    console.log('Database populated successfully!');
    console.log(`Created ${await Hotel.countDocuments()} hotels`);
    console.log(`Created ${await RoomType.countDocuments()} room types`);
    console.log(`Created ${await Room.countDocuments()} rooms`);
    
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    mongoose.connection.close();
  }
}

populateDatabase();