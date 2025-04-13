const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
      console.log('Using existing database connection');
      return;
  }

  try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
          dbName: process.env.DB_NAME,
          serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
          connectTimeoutMS: 30000,         // Connection timeout
      });

      isConnected = conn.connections[0].readyState === 1;
      console.log('MongoDB Connected');
  } catch (err) {
      console.error('MongoDB Connection Error:', err);
      res.status(500).json({ message: "Failed to connect to database" });
  }
};

module.exports = connectDB;