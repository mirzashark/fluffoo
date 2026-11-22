import db from '../db/database.js';

export function getBaseUrl(req) {
  if (process.env.SITE_URL && process.env.SITE_URL.trim()) {
    return process.env.SITE_URL.trim().replace(/\/$/, '');
  }
  if (!req) return 'https://fluffoo.pk';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || '127.0.0.1:3000';
  return `${proto}://${host}`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generate Schema.org JSON-LD graph for a single product page
 */
export function generateProductJsonLd(product, baseUrl) {
  const images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
  const featured = product.featured_image || images[0] || `${baseUrl}/images/og-default.jpg`;
  const absoluteImages = [featured, ...images.filter(i => i !== featured)].map(img => 
    img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`
  );

  const price = product.sale_price || product.regular_price;
  const inStock = (product.stock_quantity ?? 0) > 0 && product.stock_status !== 'out_of_stock';
  const productUrl = `${baseUrl}/product/${product.slug}`;

  const cleanDesc = escapeHtml(
    product.seo_description ||
    product.short_description ||
    stripHtml(product.full_description).slice(0, 200) ||
    `Buy ${product.name} online in Pakistan from Fluffoo. Ultra-soft plushie with cash on delivery and nationwide shipping.`
  );

  const graph = [
    // 1. BreadcrumbList Schema
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': baseUrl
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': product.category_name || 'Plushies',
          'item': `${baseUrl}/#cuddle-collection`
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': product.name,
          'item': productUrl
        }
      ]
    },

    // 2. Product Schema
    {
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      'name': product.name,
      'description': cleanDesc,
      'sku': product.sku,
      'url': productUrl,
      'image': absoluteImages,
      'brand': {
        '@type': 'Brand',
        'name': 'Fluffoo'
      },
      'category': product.category_name || 'Plush Toys & Stuffed Animals',
      'offers': {
        '@type': 'Offer',
        '@id': `${productUrl}#offer`,
        'url': productUrl,
        'priceCurrency': 'PKR',
        'price': price,
        'priceValidUntil': '2027-12-31',
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'seller': {
          '@type': 'Organization',
          'name': 'Fluffoo Pakistan',
          'url': baseUrl
        },
        'shippingDetails': {
          '@type': 'OfferShippingDetails',
          'shippingRate': {
            '@type': 'MonetaryAmount',
            'value': price >= 3500 ? 0 : 250,
            'currency': 'PKR'
          },
          'shippingDestination': {
            '@type': 'DefinedRegion',
            'addressCountry': 'PK'
          },
          'deliveryTime': {
            '@type': 'ShippingDeliveryTime',
            'handlingTime': {
              '@type': 'QuantitativeValue',
              'minValue': 1,
              'maxValue': 2,
              'unitCode': 'DAY'
            },
            'transitTime': {
              '@type': 'QuantitativeValue',
              'minValue': 2,
              'maxValue': 4,
              'unitCode': 'DAY'
            }
          }
        }
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.9',
        'reviewCount': '84',
        'bestRating': '5',
        'worstRating': '1'
      }
    }
  ];

  // 3. VideoObject Schema (if product has video)
  if (product.video_url) {
    const videoUrl = product.video_url.startsWith('http')
      ? product.video_url
      : `${baseUrl}${product.video_url.startsWith('/') ? '' : '/'}${product.video_url}`;

    graph.push({
      '@type': 'VideoObject',
      'name': `${product.name} Video Showcase`,
      'description': `Watch ${product.name} live in action, showing squishy softness and huggable dimensions.`,
      'thumbnailUrl': absoluteImages[0],
      'uploadDate': product.created_at || '2026-01-01T00:00:00Z',
      'contentUrl': videoUrl,
      'embedUrl': videoUrl
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

/**
 * Generate Schema.org JSON-LD graph for homepage
 */
export function generateHomeJsonLd(baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        'name': 'Fluffoo',
        'legalName': 'Fluffoo Cuddle Buddies Pakistan',
        'url': baseUrl,
        'logo': `${baseUrl}/images/fluffoo-logo.png`,
        'contactPoint': [
          {
            '@type': 'ContactPoint',
            'telephone': '+92-300-1234567',
            'contactType': 'customer service',
            'areaServed': 'PK',
            'availableLanguage': ['English', 'Urdu']
          }
        ],
        'sameAs': [
          'https://www.instagram.com/fluffoopk',
          'https://www.facebook.com/fluffoopk',
          'https://www.tiktok.com/@fluffoopk'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        'url': baseUrl,
        'name': 'Fluffoo — Cuddles Forever',
        'description': 'Pakistan’s favorite plushie boutique. Handcrafted soft cuddle buddies, giant teddy bears, bunny squishies, and gift bundles with cash on delivery.',
        'publisher': {
          '@id': `${baseUrl}/#organization`
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${baseUrl}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
}

/**
 * Generate XML Sitemap with image namespace
 */
export function generateSitemapXml(baseUrl) {
  const products = db.prepare(`
    SELECT p.name, p.slug, p.featured_image, p.images, p.updated_at, p.created_at
    FROM products p
    WHERE p.is_active = 1
    ORDER BY p.id DESC
  `).all();

  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // 1. Homepage
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // 2. Order Tracking
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/track</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `    <changefreq>monthly</changefreq>\n`;
  xml += `    <priority>0.5</priority>\n`;
  xml += `  </url>\n`;

  // 3. Products
  for (const p of products) {
    const productUrl = `${baseUrl}/product/${p.slug}`;
    const lastMod = (p.updated_at ? new Date(p.updated_at) : new Date(p.created_at || Date.now())).toISOString();
    
    let images = [];
    try {
      images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]');
    } catch (_) {}
    if (p.featured_image && !images.includes(p.featured_image)) {
      images.unshift(p.featured_image);
    }

    xml += `  <url>\n`;
    xml += `    <loc>${escapeHtml(productUrl)}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;

    for (const img of images.slice(0, 5)) {
      const fullImg = img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeHtml(fullImg)}</image:loc>\n`;
      xml += `      <image:title>${escapeHtml(p.name)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }

    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

/**
 * Generate Robots.txt
 */
export function generateRobotsTxt(baseUrl) {
  return [
    '# Fluffoo Search Engine Robots Directives',
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/*',
    'Disallow: /api/*',
    'Disallow: /uploads/proofs/*',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    'Crawl-delay: 1'
  ].join('\n');
}

/**
 * Server-side render SEO meta tags into product.html
 */
export function injectProductSeo(html, product, baseUrl) {
  const images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
  const rawFeatured = product.featured_image || images[0] || '/images/og-default.jpg';
  const featuredImage = rawFeatured.startsWith('http') ? rawFeatured : `${baseUrl}${rawFeatured.startsWith('/') ? '' : '/'}${rawFeatured}`;

  const title = product.seo_title || `${product.name} — Fluffoo Cuddles Forever`;
  const description = product.seo_description ||
    product.short_description ||
    stripHtml(product.full_description).slice(0, 160) ||
    `Order ${product.name} online at Fluffoo. Crafted with ultra-soft plush velvet, hypoallergenic 3D polyfill, and nationwide COD in Pakistan.`;

  const canonicalUrl = `${baseUrl}/product/${product.slug}`;
  const price = product.sale_price || product.regular_price;
  const inStock = (product.stock_quantity ?? 0) > 0 && product.stock_status !== 'out_of_stock';

  const jsonLd = JSON.stringify(generateProductJsonLd(product, baseUrl));

  // Build Meta Block
  const seoMetaTags = `
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(product.name)}, fluffoo plushies, plush toys pakistan, buy teddy bear online, soft toys karachi lahore islamabad, ${escapeHtml(product.category_name || 'plushies')}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta name="theme-color" content="#FFD52A">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Fluffoo">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(featuredImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(featuredImage)}">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="PKR">
  <meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}">
  <meta property="product:condition" content="new">
  <meta property="product:retailer_item_id" content="${escapeHtml(product.sku)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@fluffoopk">
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(featuredImage)}">

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">
${jsonLd}
  </script>
`;

  // Replace existing title or inject into <head>
  let modifiedHtml = html.replace(/<title id="pageTitle">[\s\S]*?<\/title>/i, '');
  modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, '');
  modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>\n${seoMetaTags}`);

  return modifiedHtml;
}

/**
 * Server-side render SEO meta tags into index.html
 */
export function injectHomeSeo(html, baseUrl) {
  const title = 'Fluffoo — Premium Handcrafted Cuddle Buddies & Soft Plushies in Pakistan';
  const description = 'Shop Pakistan’s softest handcrafted plush toys, giant huggable bears, bunny cuddlers, and luxury cuddle surprise gifts. Free nationwide shipping on orders over Rs. 3,500. Cash on Delivery across Pakistan.';
  const canonicalUrl = `${baseUrl}/`;
  const ogImage = `${baseUrl}/images/fluffoo-hero-banner.jpg`;

  const jsonLd = JSON.stringify(generateHomeJsonLd(baseUrl));

  const seoMetaTags = `
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="plushies pakistan, buy teddy bear pakistan, soft toys online karachi, cuddle buddies, stuffed animals lahore, baby safe toys pakistan, fluffoo">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta name="theme-color" content="#FFD52A">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Fluffoo">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@fluffoopk">
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">
${jsonLd}
  </script>
`;

  let modifiedHtml = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>\n${seoMetaTags}`);

  return modifiedHtml;
}
