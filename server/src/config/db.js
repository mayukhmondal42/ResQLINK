const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      '[db] MONGO_URI is not set. The API will start, but any request that ' +
      'touches the database will fail until you set MONGO_URI in your .env ' +
      '(see .env.example). Get a free cluster at https://www.mongodb.com/atlas'
    );
    return;
  }

  try {
    
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[db] MongoDB connection error: ${err.message}`);
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
