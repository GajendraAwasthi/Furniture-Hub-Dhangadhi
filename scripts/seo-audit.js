import fs from 'node:fs';
import path from 'node:path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✔ ${message}`);
  } else {
    failCount++;
    console.error(`  ✖ FAIL: ${message}`);
  }
}

console.log('\n🔍 Running Automated SEO Safety & Compliance Audit Suite...');

// 1. Audit Sitemap
console.log('\n[1/5] Auditing Sitemap (public/sitemap.xml)...');
const sitemapPath = path.resolve('public/sitemap.xml');
assert(fs.existsSync(sitemapPath), 'sitemap.xml exists in public directory');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

const urlMatches = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert(urlMatches.length >= 20, `Sitemap contains all canonical pages (${urlMatches.length} URLs found, >= 20 expected)`);

const hasHashUrls = urlMatches.some(u => u.includes('#'));
assert(!hasHashUrls, 'Sitemap contains ZERO client-side hash fragments (#)');

const hasPrivateUrls = urlMatches.some(u => u.includes('/admin') || u.includes('/customer') || u.includes('/cart') || u.includes('/checkout'));
assert(!hasPrivateUrls, 'Sitemap contains ZERO private/admin/cart URLs');

const uniqueUrls = new Set(urlMatches);
assert(uniqueUrls.size === urlMatches.length, 'Sitemap contains ZERO duplicate URLs');

// 2. Audit Robots.txt
console.log('\n[2/5] Auditing Robots Directives (public/robots.txt)...');
const robotsPath = path.resolve('public/robots.txt');
assert(fs.existsSync(robotsPath), 'robots.txt exists in public directory');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('Sitemap: https://www.furniturehubdhangadhi.com/sitemap.xml'), 'robots.txt references canonical XML sitemap');
assert(robotsContent.includes('Disallow: /admin'), 'robots.txt disallows /admin');
assert(robotsContent.includes('User-agent: Googlebot'), 'robots.txt explicitly configures Googlebot');

// 3. Audit index.html Base Document & Policy Compliance
console.log('\n[3/5] Auditing Base Document & Zero-Hallucination Compliance (index.html)...');
const indexPath = path.resolve('index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(indexHtml.includes('<title>Furniture Hub Dhangadhi | Quality Furniture in Dhangadhi, Kailali</title>'), 'index.html has verified, non-superlative title');
assert(!indexHtml.includes('#1 Furniture Store'), 'index.html contains NO unverified "#1" claims');
assert(!indexHtml.includes('+977-9800000000'), 'index.html contains NO fake phone numbers');
assert(!indexHtml.includes('"@type": "AggregateRating"'), 'index.html contains NO fake AggregateRating schema');
assert(!indexHtml.includes('Ramesh Joshi'), 'index.html contains NO fake customer review schema');
assert(!indexHtml.includes('<meta name="keywords"'), 'index.html does not contain keyword stuffing tag');
assert(!indexHtml.includes('"sameAs"'), 'index.html contains NO generic platform sameAs URLs');

// Check JSON-LD validity in index.html
const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(Boolean(jsonLdMatch), 'index.html contains valid application/ld+json script tag');
if (jsonLdMatch) {
  try {
    const parsed = JSON.parse(jsonLdMatch[1]);
    assert(parsed['@context'] === 'https://schema.org', 'JSON-LD context is schema.org');
    assert(Array.isArray(parsed['@graph']), 'JSON-LD uses standard @graph format');
  } catch (err) {
    assert(false, `index.html JSON-LD syntax error: ${err.message}`);
  }
}

// 4. Audit Catalog & Category Integration
console.log('\n[4/5] Auditing Catalog and Category Route Completeness...');
const productsPath = path.resolve('src/data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
assert(products.length >= 10, `Product catalog has ${products.length} verified products`);

let allProductsInSitemap = true;
for (const p of products) {
  const expectedUrl = `https://www.furniturehubdhangadhi.com/products/${p.id}`;
  if (!urlMatches.includes(expectedUrl)) {
    allProductsInSitemap = false;
    console.error(`  ✖ Missing in sitemap: ${expectedUrl}`);
  }
}
assert(allProductsInSitemap, 'All catalog products are present in sitemap.xml');

// 5. Audit Pre-rendered Dist Outputs (if dist exists)
console.log('\n[5/5] Auditing Static HTML Snapshots (dist/)...');
if (fs.existsSync(path.resolve('dist'))) {
  const testProductPath = path.resolve('dist/products/argo-office-chair/index.html');
  assert(fs.existsSync(testProductPath), 'Pre-rendered static HTML exists for /products/argo-office-chair');
  if (fs.existsSync(testProductPath)) {
    const prodHtml = fs.readFileSync(testProductPath, 'utf8');
    assert(prodHtml.includes('<title>Argo Office Chair | Furniture Hub Dhangadhi</title>'), 'Product snapshot has unique title');
    assert(prodHtml.includes('https://www.furniturehubdhangadhi.com/products/argo-office-chair'), 'Product snapshot has self-referential canonical URL');
    assert(prodHtml.includes('"@type": "Product"'), 'Product snapshot has valid Schema.org Product schema');
  }

  const testCategoryPath = path.resolve('dist/category/seatings/index.html');
  assert(fs.existsSync(testCategoryPath), 'Pre-rendered static HTML exists for /category/seatings');
} else {
  console.log('  ℹ dist directory not yet built. Will be validated during full build.');
}

console.log(`\n==================================================`);
console.log(`SEO Audit Completed: ${passCount} passed, ${failCount} failed.`);
console.log(`==================================================\n`);

if (failCount > 0) {
  process.exit(1);
}
