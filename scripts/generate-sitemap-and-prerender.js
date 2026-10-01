import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://www.furniturehubdhangadhi.com';
const TODAY = new Date().toISOString().slice(0, 10);

// Load product catalog
const productsPath = path.resolve('src/data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Custom categories are managed dynamically by administrator
const categories = [];

// Core pages
const staticPages = [
  { path: '', priority: '1.0', changefreq: 'weekly', title: 'Furniture Hub Dhangadhi | Quality Furniture in Dhangadhi, Kailali', description: 'Handcrafted wooden furniture, modern sofas, beds, dining tables, and office seating in Dhangadhi, Kailali. Order via WhatsApp with delivery across Sudurpashchim, Nepal.' },
  { path: 'shop', priority: '0.9', changefreq: 'weekly', title: 'Shop Furniture Collection | Furniture Hub Dhangadhi', description: 'Browse our complete catalog of living room, bedroom, dining, and office furniture available in Dhangadhi with delivery across Nepal.' },
  { path: 'about', priority: '0.6', changefreq: 'monthly', title: 'About Furniture Hub Dhangadhi | Our Heritage & Quality Craftsmanship', description: 'Learn about Furniture Hub Dhangadhi, our dedication to solid wood durability, kiln-dried timber standards, and white-glove setup service in Kailali, Nepal.' },
  { path: 'faq', priority: '0.6', changefreq: 'monthly', title: 'Frequently Asked Questions & Support | Furniture Hub Dhangadhi', description: 'Find answers about furniture ordering, WhatsApp delivery, payment options, custom sizing, and warranty coverage at Furniture Hub Dhangadhi.' },
  { path: 'terms', priority: '0.4', changefreq: 'yearly', title: 'Terms & Conditions | Furniture Hub Dhangadhi', description: 'Terms of service, warranty policies, delivery guidelines, and customer protections for Furniture Hub Dhangadhi.' },
  { path: 'privacy', priority: '0.4', changefreq: 'yearly', title: 'Privacy Policy | Furniture Hub Dhangadhi', description: 'Privacy policy and data protection commitments for customers ordering furniture through Furniture Hub Dhangadhi.' }
];

// 1. Generate XML Sitemap
function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Static Pages
  for (const page of staticPages) {
    const url = page.path ? `${SITE_URL}/${page.path}` : `${SITE_URL}/`;
    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ne" href="${url}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url}"/>
  </url>
`;
  }

  // Category Pages
  for (const cat of categories) {
    const url = `${SITE_URL}/category/${cat.slug}`;
    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ne" href="${url}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url}"/>
  </url>
`;
  }

  // Product Pages
  for (const p of products) {
    const url = `${SITE_URL}/products/${p.id}`;
    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ne" href="${url}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url}"/>
    <image:image>
      <image:loc>${SITE_URL}${p.image || '/images/hero-living-room.webp'}</image:loc>
      <image:title>${p.name} — Furniture Hub Dhangadhi</image:title>
    </image:image>
  </url>
`;
  }

  xml += `</urlset>\n`;

  // Write to public/sitemap.xml and dist/sitemap.xml if dist exists
  fs.writeFileSync(path.resolve('public/sitemap.xml'), xml, 'utf8');
  if (fs.existsSync(path.resolve('dist'))) {
    fs.writeFileSync(path.resolve('dist/sitemap.xml'), xml, 'utf8');
    
    // Ensure all critical manifests are mirrored in dist
    const filesToSync = [
      'robots.txt',
      'llms.txt',
      'llms-full.txt',
      'ai-catalog.json',
      '.well-known/ai-catalog.json',
      'data/products.json'
    ];

    for (const f of filesToSync) {
      const src = path.resolve('public', f);
      const dest = path.resolve('dist', f);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
  }
  console.log(`Generated sitemap with ${staticPages.length + categories.length + products.length} canonical URLs.`);
}

// 2. Pre-render Static HTML Snapshots into dist/
function prerenderDist() {
  const distIndex = path.resolve('dist/index.html');
  if (!fs.existsSync(distIndex)) {
    console.log('dist/index.html not found, skipping pre-rendering (run after vite build).');
    return;
  }

  const baseHtml = fs.readFileSync(distIndex, 'utf8');

  function createSnapshot(subPath, title, description, h1Text, bodyHtml, jsonLdObj) {
    const outDir = path.resolve('dist', subPath);
    fs.mkdirSync(outDir, { recursive: true });

    const canonicalUrl = `${SITE_URL}/${subPath}`;

    let snap = baseHtml;
    // Replace Title
    snap = snap.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    // Replace Meta Description
    snap = snap.replace(/<meta name="description" content=".*?"/i, `<meta name="description" content="${description}"`);
    // Replace Canonical Link
    snap = snap.replace(/<link rel="canonical" href=".*?"/i, `<link rel="canonical" href="${canonicalUrl}"`);
    // Replace Open Graph URL & Title
    snap = snap.replace(/<meta property="og:url" content=".*?"/i, `<meta property="og:url" content="${canonicalUrl}"`);
    snap = snap.replace(/<meta property="og:title" content=".*?"/i, `<meta property="og:title" content="${title}"`);
    snap = snap.replace(/<meta property="og:description" content=".*?"/i, `<meta property="og:description" content="${description}"`);
    snap = snap.replace(/<meta name="twitter:title" content=".*?"/i, `<meta name="twitter:title" content="${title}"`);
    snap = snap.replace(/<meta name="twitter:description" content=".*?"/i, `<meta name="twitter:description" content="${description}"`);

    // Inject dynamic JSON-LD if provided
    if (jsonLdObj) {
      const jsonStr = `<script id="dynamic-seo-jsonld" type="application/ld+json">${JSON.stringify(jsonLdObj, null, 2)}</script>`;
      snap = snap.replace('<script id="dynamic-seo-jsonld" type="application/ld+json"></script>', jsonStr);
    }

    // Inject Semantic Noscript / Initial content inside <main id="app-view">
    const semanticContent = `
    <noscript>
      <header>
        <h1>${h1Text}</h1>
        <p>${description}</p>
      </header>
      ${bodyHtml}
    </noscript>
    `;
    snap = snap.replace(/<main id="app-view".*?>[\s\S]*?<\/main>/i, `<main id="app-view" role="main" aria-label="${h1Text}">${semanticContent}</main>`);

    fs.writeFileSync(path.join(outDir, 'index.html'), snap, 'utf8');
  }

  // Pre-render Static Pages
  for (const page of staticPages) {
    if (!page.path) continue; // Root is already dist/index.html
    createSnapshot(
      page.path,
      page.title,
      page.description,
      page.title.split('|')[0].trim(),
      `<p>For full details and online shopping, enable JavaScript or contact Furniture Hub Dhangadhi via WhatsApp at +977 9841234567.</p>`,
      null
    );
  }

  // Pre-render Category Pages
  for (const cat of categories) {
    const catProducts = products.filter(p => p.category && p.category.toLowerCase() === cat.name.toLowerCase());
    const listHtml = `
      <section>
        <h2>${cat.name} Collection in Dhangadhi</h2>
        <ul>
          ${catProducts.map(p => `<li><a href="/products/${p.id}"><strong>${p.name}</strong> — NPR ${(p.price || 0).toLocaleString()}</a>: ${p.description || ''}</li>`).join('\n')}
        </ul>
      </section>
    `;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': `${cat.name} in Dhangadhi`,
      'description': cat.description,
      'url': `${SITE_URL}/category/${cat.slug}`,
      'mainEntity': {
        '@type': 'ItemList',
        'itemListElement': catProducts.map((p, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'url': `${SITE_URL}/products/${p.id}`,
          'name': p.name
        }))
      }
    };

    createSnapshot(
      `category/${cat.slug}`,
      `${cat.name} in Dhangadhi | Furniture Hub`,
      cat.description,
      `${cat.name} in Dhangadhi, Kailali`,
      listHtml,
      schema
    );
  }

  // Pre-render Product Pages
  for (const p of products) {
    const productUrl = `${SITE_URL}/products/${p.id}`;
    const productHtml = `
      <article>
        <h2>Specifications &amp; Craftsmanship</h2>
        <ul>
          <li><strong>Price:</strong> NPR ${(p.price || 0).toLocaleString()} /-</li>
          <li><strong>Category:</strong> ${p.category || 'Furniture'}</li>
          <li><strong>Materials:</strong> ${p.materials || 'Kiln-dried timber'}</li>
          <li><strong>Dimensions:</strong> ${p.dimensions || 'Standard'}</li>
          <li><strong>Weight:</strong> ${p.weight || 'Standard'}</li>
          <li><strong>Availability:</strong> In Stock at Dhangadhi showroom</li>
        </ul>
        <p>${p.description || ''}</p>
        <p><a href="/shop">Back to All Furniture Collections</a></p>
      </article>
    `;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': p.name,
      'description': p.description,
      'image': [`${SITE_URL}${p.image || '/images/hero-living-room.webp'}`],
      'url': productUrl,
      'sku': p.id,
      'brand': {
        '@type': 'Brand',
        'name': 'Furniture Hub Dhangadhi'
      },
      'offers': {
        '@type': 'Offer',
        'url': productUrl,
        'priceCurrency': 'NPR',
        'price': String(p.price || 0),
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': p.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'seller': {
          '@type': 'FurnitureStore',
          'name': 'Furniture Hub Dhangadhi',
          'url': SITE_URL
        }
      }
    };

    createSnapshot(
      `products/${p.id}`,
      `${p.name} | Furniture Hub Dhangadhi`,
      `${p.name} available at Furniture Hub Dhangadhi. ${p.description || ''}`,
      p.name,
      productHtml,
      schema
    );
  }

  console.log(`Pre-rendered ${staticPages.length - 1 + categories.length + products.length} static HTML snapshots in dist/!`);
}

generateSitemap();
prerenderDist();
