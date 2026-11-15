/**
 * Bus Booking Management System – Express Server
 * ALGIONS AI LABS PRIVATE LIMITED
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// ─── Route modules (stubs – fully implemented in later phases) ───
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const operatorRoutes = require('./modules/operators/operators.routes');
const busRoutes = require('./modules/buses/buses.routes');
const routeRoutes = require('./modules/routes/routes.routes');
const tripRoutes = require('./modules/trips/trips.routes');
const seatRoutes = require('./modules/seats/seats.routes');
const bookingRoutes = require('./modules/bookings/bookings.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const cancellationRoutes = require('./modules/cancellations/cancellations.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const auditLogRoutes = require('./modules/auditLogs/auditLogs.routes');

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────────
connectDB();

// ─── Security & Utility Middleware ───────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for Swagger UI; re-enable in production
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logger (dev only) ──────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiter ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', globalLimiter);

// ─── Stricter Rate Limiter for Auth routes ────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ─── Swagger API Documentation ────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BusBooking API Docs',
  })
);

// ─── Health Check ────────────────────────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Server health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bus Booking API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.all('{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚌 Bus Booking Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health:   http://localhost:${PORT}/api/health\n`);
});

// ─── Handle unhandled promise rejections ─────────────────────────
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app; // Export for testing
