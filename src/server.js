import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db, { initDatabase } from './db/database.js';
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
import {
  getBaseUrl,
  generateSitemapXml,
  generateRobotsTxt,
  injectProductSeo,
  injectHomeSeo
} from './services/seo.js';

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

// Serve static frontend assets (without automatic index.html override so SEO injector handles root)
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath, { index: false }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fluffoo E-Commerce Backend & Services',
    timestamp: new Date().toISOString()
  });
});

// ================= SEO & SEARCH CRAWLER DIRECTIVES =================

// Dynamic XML Sitemap with Image Namespace for Google & Bing
app.get('/sitemap.xml', (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const xml = generateSitemapXml(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap.xml:', err);
    res.status(500).send('Error generating sitemap.xml');
  }
});

// Search Engine Robots Directives
app.get('/robots.txt', (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const txt = generateRobotsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(txt);
  } catch (err) {
    console.error('Error generating robots.txt:', err);
    res.status(500).send('Error generating robots.txt');
  }
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

// ================= DYNAMIC SEARCH-OPTIMIZED PAGES =================

// 1. Root / Customer Storefront with Pre-rendered Organization & WebSite JSON-LD
app.get('/', (req, res) => {
  try {
    const rawHtml = fs.readFileSync(path.join(publicPath, 'index.html'), 'utf8');
    const baseUrl = getBaseUrl(req);
    const seoHtml = injectHomeSeo(rawHtml, baseUrl);
    res.send(seoHtml);
  } catch (err) {
    console.error('Error serving homepage SEO:', err);
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// 2. Product Detail Page with Pre-rendered Product, BreadcrumbList, VideoObject JSON-LD & OG Meta
app.get(['/product/:slug', '/products/:slug'], (req, res) => {
  try {
    const { slug } = req.params;
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.slug = ? OR p.id = ?) AND p.is_active = 1
    `).get(slug, isNaN(Number(slug)) ? -1 : Number(slug));

    const rawHtml = fs.readFileSync(path.join(publicPath, 'product.html'), 'utf8');
    const baseUrl = getBaseUrl(req);

    if (product) {
      const seoHtml = injectProductSeo(rawHtml, product, baseUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(seoHtml);
    } else {
      // Return 404 with proper search engine header if product not found
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(rawHtml.replace(/<title id="pageTitle">[\s\S]*?<\/title>/i, '<title>Product Not Found — Fluffoo Pakistan</title>'));
    }
  } catch (err) {
    console.error('Error rendering product SEO:', err);
    res.sendFile(path.join(publicPath, 'product.html'));
  }
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
