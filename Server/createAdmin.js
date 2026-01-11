const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotelmania');
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@hotelmania.com',
      password: 'admin123',
      phone: '1234567890',
      role: 'admin'
    });
    
    console.log('Admin user created:', admin.email);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();