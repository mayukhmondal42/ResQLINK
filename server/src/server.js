// -----------------------------------------------------------------------------
// server.js — application entry point. Wires together Express (REST API),
// Socket.IO (real-time events) on one shared HTTP server, and MongoDB.
// -----------------------------------------------------------------------------

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');

connectDB();

const app = express();

// --- Core middleware ---------------------------------------------------
// FIXED: allow CLIENT_URL or localhost, not '*', because credentials: true
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'));
    }
    return callback(null, true); // allow any in dev only
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ResQLink API is running', demoMode: process.env.DEMO_MODE === 'true' });
});

// --- Feature routes ------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

// --- HTTP + Socket.IO share the same server ---
const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[server] ResQLink API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = { app, httpServer };