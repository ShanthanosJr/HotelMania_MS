require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
      console.error('Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars), e.g.\n  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node createAdmin.js');
      process.exitCode = 1;
      return;
    }
    await mongoose.connect(MONGO_URI);
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    const admin = await User.create({
      name: 'Admin User',
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
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