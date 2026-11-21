import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDatabase } from './db/database.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import inventoryRouter from './routes/inventory.js';
import couponsRouter from './routes/coupons.js';
import logisticsRouter from './routes/logistics.js';
import settingsRouter from './routes/settings.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fluffoo E-Commerce Backend & Services',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/coupons', couponsRouter);
app.use('/api/v1/shipping', logisticsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/admin', adminRouter);

// Specific page routes
app.get('/product/:slug', (req, res) => {
  res.sendFile(path.join(publicPath, 'product.html'));
});

app.get('/products/:slug', (req, res) => {
  res.sendFile(path.join(publicPath, 'product.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin', 'index.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(publicPath, 'track', 'index.html'));
});

// Fallback to customer storefront or 404 for API
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(publicPath, 'admin', 'index.html'));
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fluffoo E-Commerce Backend & Services running on http://127.0.0.1:${PORT}`);
  console.log(`🛍️ Customer Storefront: http://127.0.0.1:${PORT}/`);
  console.log(`🛡️ Admin Back-Office Panel: http://127.0.0.1:${PORT}/admin`);
  console.log(`📦 Order Tracking: http://127.0.0.1:${PORT}/track`);
});

export default app;
