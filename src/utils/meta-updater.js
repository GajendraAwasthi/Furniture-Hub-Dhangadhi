import { SEO_CONFIG } from '../config/seo-config.js';

function setMetaTag(attrName, attrValue, content) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content || '');
}

function setCanonical(url) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd(schemaObj) {
  if (typeof document === 'undefined') return;
  let script = document.getElementById('dynamic-seo-jsonld');
  if (!script) {
    script = document.createElement('script');
    script.id = 'dynamic-seo-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  if (!schemaObj) {
    script.textContent = '';
    return;
  }
  script.textContent = JSON.stringify(schemaObj, null, 2);
}

/**
 * Synchronize document head metadata and Schema.org structured data.
 * 
 * @param {Object} options
 * @param {string} options.title - Page title
 * @param {string} options.description - Meta description
 * @param {string} options.canonicalPath - Relative path without hash (e.g. '/shop', '/products/argo-office-chair')
 * @param {string} [options.image] - Custom OG image URL
 * @param {string} [options.type='website'] - OG type ('website', 'product', 'article')
 * @param {boolean} [options.noindex=false] - Whether to prevent indexing (404, admin, customer auth)
 * @param {Object} [options.structuredData] - Page-specific JSON-LD object or null
 */
export function updateDocumentMeta({
  title,
  description,
  canonicalPath = '/',
  image,
  type = 'website',
  noindex = false,
  structuredData = null
}) {
  if (typeof document === 'undefined') return;

  const siteUrl = SEO_CONFIG.siteUrl;
  const pageTitle = title || SEO_CONFIG.defaultTitle;
  const pageDescription = description || SEO_CONFIG.defaultDescription;
  const canonicalUrl = `${siteUrl}${canonicalPath === '/' ? '/' : canonicalPath.replace(/\/+$/, '')}`;
  const ogImage = image 
    ? (image.startsWith('http') ? image : `${siteUrl}${image.startsWith('/') ? image : '/' + image}`)
    : `${siteUrl}${SEO_CONFIG.defaultImage}`;

  // 1. Title
  document.title = pageTitle;

  // 2. Meta description
  setMetaTag('name', 'description', pageDescription);

  // 3. Canonical URL
  setCanonical(canonicalUrl);

  // 4. Robots directive
  if (noindex) {
    setMetaTag('name', 'robots', 'noindex, nofollow');
  } else {
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }

  // 5. Open Graph
  setMetaTag('property', 'og:site_name', SEO_CONFIG.siteName);
  setMetaTag('property', 'og:type', type);
  setMetaTag('property', 'og:title', pageTitle);
  setMetaTag('property', 'og:description', pageDescription);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:image', ogImage);
  setMetaTag('property', 'og:locale', SEO_CONFIG.defaultLocale);

  // 6. Twitter / X Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', pageTitle);
  setMetaTag('name', 'twitter:description', pageDescription);
  setMetaTag('name', 'twitter:image', ogImage);

  // 7. Structured Data (JSON-LD)
  if (structuredData) {
    setJsonLd(structuredData);
  } else {
    setJsonLd(null);
  }
}

/**
 * Builds valid BreadcrumbList Schema.org structured data.
 */
export function buildBreadcrumbsSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.startsWith('http') ? item.url : `${SEO_CONFIG.siteUrl}${item.url}`
    }))
  };
}

/**
 * Builds valid Product Schema.org structured data from a real product object.
 * Strictly adheres to Google Guidelines: NO invented reviews, NO invented ratings.
 */
export function buildProductSchema(product) {
  if (!product) return null;
  const productUrl = `${SEO_CONFIG.siteUrl}/products/${product.id}`;
  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `${SEO_CONFIG.siteUrl}${product.image}`)
    : `${SEO_CONFIG.siteUrl}${SEO_CONFIG.defaultImage}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.name,
    'description': product.description || `${product.name} at Furniture Hub Dhangadhi`,
    'image': [imageUrl],
    'url': productUrl,
    'sku': product.id,
    'brand': {
      '@type': 'Brand',
      'name': 'Furniture Hub Dhangadhi'
    },
    'offers': {
      '@type': 'Offer',
      'url': productUrl,
      'priceCurrency': 'NPR',
      'price': String(product.price || 0),
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'FurnitureStore',
        'name': SEO_CONFIG.siteName,
        'url': SEO_CONFIG.siteUrl
      }
    }
  };

  return schema;
}

/**
 * Builds valid CollectionPage Schema.org structured data for categories.
 */
export function buildCategorySchema(category, products = []) {
  if (!category) return null;
  const categoryUrl = `${SEO_CONFIG.siteUrl}/category/${category.slug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': category.name,
    'description': category.description,
    'url': categoryUrl,
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': products.map((p, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'url': `${SEO_CONFIG.siteUrl}/products/${p.id}`,
        'name': p.name
      }))
    }
  };
}
