# Fluffoo — Handcrafted Soft Plushies & Cuddle Buddies 🧸

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mirzashark/fluffoo)

Fluffoo is a complete full-stack e-commerce platform and boutique storefront designed for premium plush toys, huggable bears, and cuddle gifts across Pakistan.

Built with high-performance Node.js, Express, Tailwind CSS, SQLite, and optimized for **Vercel Serverless & Edge deployment**.

---

## 🚀 One-Click Deploy to Vercel

Click the button below to deploy this repository directly to your Vercel account:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mirzashark/fluffoo)

### Recommended Environment Variables on Vercel:
| Variable | Default Value | Description |
|---|---|---|
| `JWT_SECRET` | `fluffoo_super_secret_jwt_key_2026_cuddle_forever` | Staff JWT signing key |
| `SITE_URL` | `https://your-project.vercel.app` | Canonical store URL for sitemap & SEO |
| `FREE_SHIPPING_THRESHOLD` | `3500` | Free delivery threshold in PKR |
| `STANDARD_DELIVERY_FEE` | `250` | Standard delivery fee across Pakistan |
| `WHATSAPP_BUSINESS_NUMBER` | `+923001234567` | WhatsApp customer support |

---

## ✨ Features

- **🛍️ Sunshine Plush Sanctuary Storefront**: Fluid e-commerce catalog with search, category filtering, cart drawer, and guest checkout.
- **📱 Rich Product Detail Pages (PDP)**:
  - Interactive gallery with zoom viewer and embedded video player.
  - Reactive color and size swatches with live inventory tracking.
  - High-resolution visual storytelling infographics and embedded video demonstrations.
  - Structured specifications matrix (Material, Filling, Dimensions, Care, Packaging).
  - Sticky mobile buy bar for high conversion.
- **🛡️ Comprehensive Admin Back-Office Panel (`/admin`)**:
  - Live revenue analytics (Gross revenue vs. payments actually collected).
  - Product catalog CRUD with Rich Text, Image URL, and Video embedding provision.
  - Real-time Google SERP Snippet Preview with character counters.
  - Manual payment verification review queue with proof inspection.
  - Inventory management with stock adjustment audit logs.
- **🔍 Search Engine Optimization (SEO & SERP)**:
  - Dynamic XML sitemap with Google Image namespace (`/sitemap.xml`).
  - Search engine directives (`/robots.txt`).
  - Server-side pre-rendered Open Graph, Twitter Cards, and Schema.org JSON-LD (`Product`, `BreadcrumbList`, `VideoObject`, `Organization`, `WebSite`).
- **💳 Payment & Logistics Workflow**:
  - Cash on Delivery (COD) with immediate confirmation and unique `FLF-YYYY-XXXXX` order numbers.
  - Manual Bank Transfer / EasyPaisa / JazzCash verification workflow with receipt uploads.
  - Multi-courier tracking integration (TCS, Trax, Leopard, Call Courier).

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm start
```

Storefront will be live at `http://127.0.0.1:3000/`.
Admin Back-Office at `http://127.0.0.1:3000/admin`.
