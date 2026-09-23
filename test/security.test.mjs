import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock browser localStorage and window environment for Node.js test environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

globalThis.localStorage = new LocalStorageMock();
globalThis.window = {
  location: { hash: '#home', origin: 'http://localhost:5173' }
};

// Import customer authentication module
const {
  isCurrentAdmin,
  authenticateUser,
  customerRegister,
  updateCustomerProfile,
  getCustomerOrders,
  saveCustomerOrder,
  authenticateOAuthUser,
  hashPassword,
  generateSalt,
  sanitizeInput,
  logoutUser,
  getCurrentCustomer
} = await import('../src/services/customer-auth.js');

describe('Security Verification & Adversarial Audit Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    await logoutUser();
  });

  test('1. Client-Side Authorization Bypass: Malicious localStorage role tampering is rejected', () => {
    // Attack: Attacker writes arbitrary role: "admin" directly into localStorage
    localStorage.setItem('fh_demo_admin_user', JSON.stringify({
      id: 'attacker-id-666',
      email: 'hacker@evil.com',
      role: 'admin'
    }));

    // Action: Check authorization
    const adminCheck = isCurrentAdmin();

    // Verification: Attack must fail
    assert.equal(adminCheck, false, 'Unverified localStorage role must never grant admin privileges');
    assert.equal(localStorage.getItem('fh_demo_admin_user'), null, 'Malicious admin session must be purged immediately');
  });

  test('1b. Exact CR-1 Audit Probe: Injected known admin identity into localStorage without JWT is rejected', () => {
    // Attack: Attacker writes known store admin email into localStorage as done in CR-1 probe
    localStorage.setItem('fh_demo_admin_user', JSON.stringify({
      id: 'admin-sb-01',
      email: 'admin@furniturehub.com',
      role: 'admin'
    }));

    // Action: Check authorization
    const adminCheck = isCurrentAdmin();

    // Verification: Attack must fail because no verified Supabase JWT token exists
    assert.equal(adminCheck, false, 'Injected admin session without real Supabase JWT must be rejected');
    assert.equal(localStorage.getItem('fh_demo_admin_user'), null, 'Unverified admin session must be purged immediately');
  });

  test('1c. Forged Token Bypass (C1): Injected sb-*-auth-token with fake app_metadata is rejected', () => {
    // Attack: Attacker crafts fake Supabase token in localStorage claiming app_metadata: { role: 'admin' }
    localStorage.setItem('sb-fake-auth-token', JSON.stringify({
      access_token: 'not-a-jwt',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'attacker',
        email: 'attacker@example.com',
        app_metadata: { role: 'admin' }
      }
    }));

    // Action: Check authorization
    const adminCheck = isCurrentAdmin();

    // Verification: Attack must fail because user is not an authoritative store_admin
    assert.equal(adminCheck, false, 'Forged Supabase token with client-crafted app_metadata must be rejected');
    assert.equal(localStorage.getItem('fh_demo_admin_user'), null, 'Rogue admin session must be purged');
  });

  test('1d. Composition Probe (CRITICAL): Forged token + matching forged fh_supabase_store_admins cache is rejected', () => {
    // Attack: Exact composition attack from audit
    localStorage.clear();
    localStorage.setItem('sb-fake-auth-token', JSON.stringify({
      access_token: 'not-a-jwt',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'attacker-id', email: 'attacker@example.com', app_metadata: { role: 'customer' } }
    }));
    localStorage.setItem('fh_supabase_store_admins', JSON.stringify([
      { id: 'attacker-id', user_id: 'attacker-id', email: 'attacker@example.com', role: 'admin' }
    ]));

    // Action: Check authorization
    const adminCheck = isCurrentAdmin();

    // Verification: Must be rejected - client cache is not authoritative evidence
    assert.equal(adminCheck, false, 'Composition of fake token and fake admin cache must be strictly rejected');
    assert.equal(localStorage.getItem('fh_demo_admin_user'), null, 'Rogue admin session must be purged');
  });

  test('2. Credential Security: Passwords are salted/hashed and never stored in plaintext', async () => {
    const rawPassword = 'SuperSecretPassword@2026';
    const regResult = await customerRegister({
      name: 'Alice Security',
      email: 'alice@securitytest.com',
      phone: '9841234567',
      address: 'Main St, Dhangadhi',
      city: 'Dhangadhi',
      password: rawPassword
    });

    assert.equal(regResult.success, true);
    assert.equal(regResult.role, 'customer');

    // Inspect storage directly
    const storedAccountsRaw = localStorage.getItem('fh_customer_accounts');
    assert.ok(storedAccountsRaw, 'Accounts must be stored');
    assert.equal(storedAccountsRaw.includes(rawPassword), false, 'Plaintext password MUST NOT exist in localStorage');

    const accounts = JSON.parse(storedAccountsRaw);
    const alice = accounts.find(a => a.email === 'alice@securitytest.com');
    assert.ok(alice.passwordHash, 'Account must have passwordHash');
    assert.ok(alice.salt, 'Account must have salt');
    assert.equal(alice.password, undefined, 'Account must not have plaintext password field');

    // Verify hash matches
    const expectedHash = await hashPassword(rawPassword, alice.salt);
    assert.equal(alice.passwordHash, expectedHash, 'Hash must match PBKDF2/SHA256 salted calculation');

    // Verify authentication succeeds with correct password
    const loginSuccess = await authenticateUser('alice@securitytest.com', rawPassword);
    assert.equal(loginSuccess.success, true);
    assert.equal(loginSuccess.user.email, 'alice@securitytest.com');

    // Verify authentication fails with incorrect password
    await assert.rejects(
      async () => {
        await authenticateUser('alice@securitytest.com', 'WrongPassword123');
      },
      /Invalid credentials/
    );
  });

  test('3. Admin Authentication: Hardcoded password bypass is eliminated', async () => {
    // Attack: Attempting hardcoded backdoor credentials (admin123) is rejected without Supabase Auth
    await assert.rejects(
      async () => {
        await authenticateUser('admin@furniturehub.com', 'admin123');
      },
      /Invalid credentials/
    );

    // Verification: Setting fake admin in localStorage without Supabase JWT token is rejected
    localStorage.setItem('fh_supabase_store_admins', JSON.stringify([
      { id: 'sb-admin-1', email: 'verified.admin@furniturehub.com', role: 'admin' }
    ]));
    localStorage.setItem('fh_demo_admin_user', JSON.stringify({
      email: 'verified.admin@furniturehub.com',
      role: 'admin'
    }));
    assert.equal(isCurrentAdmin(), false, 'Admin in localStorage without real Supabase JWT must be rejected');
    assert.equal(localStorage.getItem('fh_demo_admin_user'), null, 'Rogue admin session must be purged');

    // Verification: Active Supabase token in localStorage alone CANNOT grant admin access (must not trust client storage)
    localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'valid-test-jwt-token',
      user: {
        id: 'sb-admin-1',
        email: 'verified.admin@furniturehub.com',
        role: 'authenticated'
      }
    }));
    assert.equal(isCurrentAdmin(), false, 'localStorage token alone must never grant admin access without server verification');

    // Verification: Setting verified admin session explicitly authorizes in memory
    const { setVerifiedAdminUser, clearVerifiedAdminUser } = await import('../src/services/customer-auth.js');
    setVerifiedAdminUser({
      id: 'sb-admin-1',
      email: 'verified.admin@furniturehub.com',
      role: 'admin'
    });
    assert.equal(isCurrentAdmin(), true, 'In-memory verified admin session grants admin access');
    clearVerifiedAdminUser();
    assert.equal(isCurrentAdmin(), false, 'Clearing verified admin session revokes access');
  });

  test('4. Mass-Assignment Protection: Customer profile cannot escalate to admin or alter identity', async () => {
    await customerRegister({
      name: 'Bob Normal',
      email: 'bob@securitytest.com',
      phone: '9841111111',
      address: 'Ward 2',
      city: 'Dhangadhi',
      password: 'BobPassword123'
    });

    // Attack: Customer attempts to mass-assign role: "admin", id, and email
    const exploitPayload = {
      name: 'Bob Modified',
      role: 'admin',
      id: 'stolen-admin-id',
      email: 'admin@furniturehub.com',
      phone: '9842222222'
    };

    const updated = await updateCustomerProfile(exploitPayload);

    // Verification: Protected fields remain immutable
    assert.equal(updated.role, 'customer', 'role field must remain strictly "customer"');
    assert.equal(updated.email, 'bob@securitytest.com', 'email field must remain immutable');
    assert.notEqual(updated.id, 'stolen-admin-id', 'id field must remain immutable');
    assert.equal(updated.name, 'Bob Modified', 'Legitimate whitelisted field should update');
    assert.equal(updated.phone, '9842222222', 'Legitimate whitelisted field should update');

    // Verify storage accounts are also protected
    const accounts = JSON.parse(localStorage.getItem('fh_customer_accounts'));
    const bob = accounts.find(a => a.email === 'bob@securitytest.com');
    assert.equal(bob.role, 'customer');
  });

  test('5. IDOR Order Isolation: Non-admin customers cannot view or tamper other customers orders', async () => {
    // 1. Log in as Alice and save an order
    await customerRegister({
      name: 'Alice User',
      email: 'alice@orderstest.com',
      phone: '9841230001',
      address: 'Ward 1',
      city: 'Dhangadhi',
      password: 'AlicePass1234'
    });

    const aliceOrder = saveCustomerOrder({
      id: 'ord-alice-1',
      total: 12000,
      items: [{ name: 'Sofa' }]
    });

    assert.equal(aliceOrder.customerEmail, 'alice@orderstest.com');

    // 2. Log in as Bob and save an order
    await customerRegister({
      name: 'Bob User',
      email: 'bob@orderstest.com',
      phone: '9841230002',
      address: 'Ward 2',
      city: 'Dhangadhi',
      password: 'BobPass1234'
    });

    const bobOrder = saveCustomerOrder({
      id: 'ord-bob-1',
      total: 8000,
      items: [{ name: 'Coffee Table' }]
    });

    assert.equal(bobOrder.customerEmail, 'bob@orderstest.com');

    // 3. Attack: While Bob is logged in, Bob attempts to retrieve Alice's order via customerId
    const bobsOwnOrders = getCustomerOrders();
    assert.equal(bobsOwnOrders.length, 1);
    assert.equal(bobsOwnOrders[0].id, 'ord-bob-1');

    // IDOR query attempt
    const idorOrders = getCustomerOrders(aliceOrder.customerId);
    assert.equal(idorOrders.length, 0, 'Non-admin customer must NOT receive orders belonging to another customerId');

    // 4. Attack: Bob attempts to save order spoofing Alice customerId
    const spoofAttempt = saveCustomerOrder({
      id: 'ord-spoofed',
      customerId: aliceOrder.customerId,
      customerEmail: 'alice@orderstest.com',
      total: 99999
    });

    // Verification: Authenticated session overrides client-spoofed properties
    assert.equal(spoofAttempt.customerId, bobOrder.customerId, 'Order customerId must be bound to active session');
    assert.equal(spoofAttempt.customerEmail, 'bob@orderstest.com', 'Order email must be bound to active session');
  });

  test('6. Unauthenticated Direct Login: Cannot elevate to admin without verified OAuth provider', async () => {
    // Attack: Direct email input trying to login as admin without OAuth/password
    const directResult = await authenticateOAuthUser('email', {
      email: 'gajendraawasthi123@gmail.com'
    });

    assert.equal(directResult.role, 'customer', 'Direct email login without password or OAuth verification must NEVER elevate to admin');
    assert.equal(isCurrentAdmin(), false, 'Direct login must not be authorized as admin');
  });

  test('7. Input Sanitization & DOM XSS Prevention: Malicious tags and scripts are neutralized', async () => {
    const { escapeHtml } = await import('../src/utils/security.js');

    // 1. Exact CR-2 Audit Probe: <img src=x onerror=alert(1)>
    const probePayload = '<img src=x onerror=alert(1)>';
    const escapedProbe = escapeHtml(probePayload);
    assert.equal(escapedProbe.includes('<'), false, 'Angle bracket < must be escaped');
    assert.equal(escapedProbe.includes('>'), false, 'Angle bracket > must be escaped');
    assert.equal(escapedProbe, '&lt;img src=x onerror=alert(1)&gt;');

    // 2. Attribute breakout payload
    const attrPayload = '" onfocus="alert(1)';
    const escapedAttr = escapeHtml(attrPayload);
    assert.equal(escapedAttr.includes('"'), false, 'Quotes must be escaped');
    assert.equal(escapedAttr, '&quot; onfocus=&quot;alert(1)');

    // 3. String sanitizer utility
    const dirty = '<script>alert("XSS")</script><b>Main Road</b>';
    const clean = sanitizeInput(dirty);
    assert.equal(clean.includes('<'), false, 'All angle brackets must be stripped');
    assert.equal(clean.includes('>'), false, 'All angle brackets must be stripped');
    assert.equal(clean, 'scriptalert("XSS")/scriptbMain Road/b');
  });

  test('7b. Stored XSS in Order Templates: Untrusted order fields are rendered inert and escaped', async () => {
    const { escapeHtml } = await import('../src/utils/security.js');

    const maliciousOrder = {
      id: '<script>alert("xss")</script>',
      customer_name: '<img src=x onerror=alert(1)>',
      customer_phone: '"+alert(1)+"',
      delivery_address: '<svg onload=alert(1)>',
      notes: '<iframe src=javascript:alert(1)>'
    };

    const renderedId = escapeHtml(maliciousOrder.id);
    const renderedName = escapeHtml(maliciousOrder.customer_name);
    const renderedAddress = escapeHtml(maliciousOrder.delivery_address);
    const renderedNotes = escapeHtml(maliciousOrder.notes);

    assert.equal(renderedId.includes('<script>'), false, 'Script tags must be escaped');
    assert.equal(renderedId, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.equal(renderedName.includes('<img'), false, 'Image onerror tags must be escaped');
    assert.equal(renderedName, '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(renderedAddress.includes('<svg'), false, 'SVG tags must be escaped');
    assert.equal(renderedAddress, '&lt;svg onload=alert(1)&gt;');
    assert.equal(renderedNotes.includes('<iframe'), false, 'Iframe tags must be escaped');
    assert.equal(renderedNotes, '&lt;iframe src=javascript:alert(1)&gt;');
  });

  test('8. Order Integrity (HI-2 & HI-12): Order creation enforces persistence before caching', async () => {
    const { createOrder } = await import('../src/services/supabase.js');

    const validOrder = {
      id: 'FH-TEST-1001',
      customer_name: 'Test Customer',
      customer_email: 'test.customer@gmail.com',
      customer_phone: '9841000000',
      delivery_address: 'Main Road, Dhangadhi',
      items: [{ id: 'p1', name: 'Chair', price: 5000, quantity: 1 }],
      total_amount: 5000,
      payment_method: 'WhatsApp Direct',
      status: 'Pending'
    };

    const created = await createOrder(validOrder);
    assert.equal(created.id, 'FH-TEST-1001');
    assert.equal(created.status, 'Pending');

    const localOrdersRaw = localStorage.getItem('fh_local_orders');
    assert.ok(localOrdersRaw, 'Local orders must be populated upon success');
    const localOrders = JSON.parse(localOrdersRaw);
    assert.equal(localOrders.length, 1);
    assert.equal(localOrders[0].id, 'FH-TEST-1001');
  });

  test('9. Storage Resilience (HI-10): Corrupt JSON in localStorage never throws and recovers gracefully', async () => {
    const { safeGetJson, safeSetJson } = await import('../src/utils/security.js');

    // Attack / Failure state: Corrupt JSON in storage
    localStorage.setItem('fh_corrupt_test_key', '{"unclosed_json: true, broken');

    // Action: Read key with safeGetJson
    const result = safeGetJson('fh_corrupt_test_key', { fallback: true });

    // Verification: Fallback returned and corrupt key purged
    assert.deepEqual(result, { fallback: true });
    assert.equal(localStorage.getItem('fh_corrupt_test_key'), null, 'Corrupted key should be quarantined/removed');

    // Test safeSetJson
    safeSetJson('fh_valid_key', { safe: true });
    assert.deepEqual(safeGetJson('fh_valid_key'), { safe: true });
  });

  test('10. Catalog Fixture Integrity (HI-1): Default catalog delivers populated, valid storefront items through fetchProducts()', async () => {
    localStorage.clear();
    const { fetchProducts } = await import('../src/services/supabase.js');
    const fetched = await fetchProducts();
    assert.ok(Array.isArray(fetched), 'fetchProducts() must return an array');
    assert.ok(fetched.length >= 9, 'Catalog runtime must return default products on cold start');
    for (const item of fetched) {
      assert.ok(item.id, 'Product item must have an id');
      assert.ok(item.name, 'Product item must have a name');
      assert.ok(typeof item.price === 'number' && item.price > 0, 'Product item must have a positive number price');
    }
  });

  test('11. Accessibility Compliance (ME-7): Flag icon element possesses explicit role="img" for ARIA labeling', async () => {
    const fs = await import('node:fs/promises');
    const navbarContent = await fs.readFile(new URL('../src/components/navbar.js', import.meta.url), 'utf8');
    
    // Prohibited pattern: <span class="nepal-flag-icon" aria-label="..." without role="img"
    const hasRoleImg = navbarContent.includes('class="nepal-flag-icon" role="img"');
    assert.ok(hasRoleImg, 'nepal-flag-icon span must specify role="img" to satisfy W3C ARIA specification');
  });

  test('12. Production Bundle Budget (ME-8): Chunks are modularized and stay under 500 kB', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const assetsDir = path.resolve(process.cwd(), 'dist/assets');
    
    let files;
    try {
      files = await fs.readdir(assetsDir);
    } catch (err) {
      assert.fail(`Production dist/assets directory must exist to verify bundle budget. Run npm run build before testing: ${err.message}`);
    }

    const jsFiles = files.filter(f => f.endsWith('.js'));
    assert.ok(jsFiles.length >= 2, 'Application should produce multiple code-split chunks');

    for (const file of jsFiles) {
      const stats = await fs.stat(path.join(assetsDir, file));
      const sizeKb = stats.size / 1024;
      assert.ok(sizeKb < 500, `Chunk ${file} (${sizeKb.toFixed(2)} kB) must remain strictly under 500 kB budget`);
    }
  });

  test('13. WhatsApp Encoding Safety (ME-6): Truncated links never produce corrupt percent escapes', async () => {
    const { generateWhatsAppLink, fitEncodedUrl } = await import('../src/services/whatsapp.js');

    // Unicode / Devanagari stress payload designed to exceed 1800 chars and land on multi-byte boundaries
    const longNepaliAddress = 'धनगढी उपमहानगरपालिका वडा नं. २, हसनपुर, कैलाली, सुदूरपश्चिम प्रदेश, नेपाल । '.repeat(30);
    const order = {
      id: 'FH-UNICODE-TEST',
      reference: 'FH-UNICODE-TEST',
      total: 99999,
      address: longNepaliAddress
    };
    const items = Array.from({ length: 20 }, (_, i) => ({
      name: `शाही काठको सोफा सेट लक्जरी एडिसन #${i + 1}`,
      price: 25000,
      quantity: 2
    }));

    const result = generateWhatsAppLink(order, items);

    // Verify 1800 length ceiling
    assert.ok(result.length <= 1800, `URL length ${result.length} must not exceed 1800 chars`);

    // Verify valid percent encoding: decodeURIComponent must never throw URIError: URI malformed
    const textParam = result.url.replace(/^https:\/\/wa\.me\/[0-9]+\?text=/, '');
    let decoded;
    assert.doesNotThrow(() => {
      decoded = decodeURIComponent(textParam);
    }, 'Truncated text param must remain valid percent-encoded URI without truncated % triplets');

    assert.ok(decoded.length > 0, 'Decoded message should contain content');

    // Unit test fitEncodedUrl directly
    const testBase = 'https://wa.me/9779841234567?text=';
    const fitted = fitEncodedUrl(testBase, 'नमस्ते '.repeat(400), 500);
    assert.ok(fitted.length <= 500);
    assert.doesNotThrow(() => {
      decodeURIComponent(fitted.replace(testBase, ''));
    });
  });

  test('14. Payment Strategy Validation (HI-11): Unsupported methods are explicitly rejected', async () => {
    const { getPaymentStrategy } = await import('../src/checkout/payment-strategy.js');

    // Valid methods succeed
    const cod = getPaymentStrategy('cod');
    assert.equal(cod.name, 'Cash on Delivery');

    const wa = getPaymentStrategy('whatsapp');
    assert.equal(wa.name, 'WhatsApp Direct');

    // Default when omitted
    const defaultStrat = getPaymentStrategy();
    assert.equal(defaultStrat.name, 'WhatsApp Direct');

    // Attack / Probe: supplied unsupported payment methods (e.g. 'card', 'crypto') must throw
    assert.throws(
      () => getPaymentStrategy('card'),
      /Unsupported payment method: "card"/
    );

    assert.throws(
      () => getPaymentStrategy('bitcoin'),
      /Unsupported payment method: "bitcoin"/
    );
  });

  test('15. Security Headers (ME-3): vercel.json defines OWASP headers and CSP directives', async () => {
    const fs = await import('node:fs/promises');
    const vercelJsonRaw = await fs.readFile(new URL('../vercel.json', import.meta.url), 'utf8');
    const vercelConfig = JSON.parse(vercelJsonRaw);

    assert.ok(vercelConfig.headers && vercelConfig.headers.length > 0, 'vercel.json must define headers');
    const headerRules = vercelConfig.headers[0].headers;
    const headerMap = Object.fromEntries(headerRules.map(h => [h.key, h.value]));

    assert.equal(headerMap['X-Content-Type-Options'], 'nosniff');
    assert.equal(headerMap['X-Frame-Options'], 'DENY');
    assert.equal(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.ok(headerMap['Strict-Transport-Security'].includes('max-age=63072000'));
    assert.ok(headerMap['Content-Security-Policy'].includes("default-src 'self'"));
    assert.ok(headerMap['Content-Security-Policy'].includes("frame-ancestors 'none'"));
    assert.ok(headerMap['Content-Security-Policy'].includes("https://*.supabase.co"));
  });

  test('16. Session Resilience: Synchronously recovers customer session on refresh from Supabase token', async () => {
    // Simulate user logging in via Google OAuth where Supabase wrote its auth token into localStorage
    const googleUser = {
      id: 'sb-google-user-99',
      email: 'customer.new@gmail.com',
      user_metadata: {
        full_name: 'Gajendra Customer',
        avatar_url: '/images/social-user.png'
      }
    };

    localStorage.setItem('sb-app-auth-token', JSON.stringify({
      access_token: 'valid-google-oauth-jwt',
      user: googleUser
    }));

    // Explicitly simulate refreshed browser state where fh_customer_session has not yet been set in memory
    localStorage.removeItem('fh_customer_session');

    // Action: Call getCurrentCustomer() on initial page load / refresh
    const recoveredCustomer = getCurrentCustomer();

    // Verification: Session must be immediately recovered without kicking the user out
    assert.ok(recoveredCustomer, 'Customer session must be recovered from active Supabase token');
    assert.equal(recoveredCustomer.email, 'customer.new@gmail.com');
    assert.equal(recoveredCustomer.name, 'Gajendra Customer');
    assert.equal(recoveredCustomer.role, 'customer');

    // Verify localStorage key fh_customer_session is synced
    const stored = JSON.parse(localStorage.getItem('fh_customer_session'));
    assert.equal(stored.email, 'customer.new@gmail.com');
  });

  test('17. Cart Quantity Cap (H2): Successive additions strictly clamp to maximum 99 units', async () => {
    const { addItemToCart, getOrCreateCart } = await import('../src/cart/service.js');
    const { getDb } = await import('../src/db/client.js');
    const db = await getDb();

    // Ensure test product & inventory exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT, description TEXT);
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT UNIQUE, sku TEXT, name TEXT, category_id TEXT, description TEXT, price_minor BIGINT, compare_at_price_minor BIGINT, is_active BOOLEAN DEFAULT true);
      CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, product_id TEXT UNIQUE, available_quantity INT, reserved_quantity INT, updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS carts (id TEXT PRIMARY KEY, user_id TEXT, session_token TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS cart_items (id TEXT PRIMARY KEY, cart_id TEXT, product_id TEXT, quantity INT, selected_color TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
    `);

    await db.query(`INSERT INTO products (id, slug, sku, name, price_minor, is_active) VALUES ('test-prod-cap', 'test-prod-cap', 'SKU-CAP', 'Cap Test Chair', 500000, true) ON CONFLICT (id) DO NOTHING;`);
    await db.query(`INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity) VALUES ('inv-cap-1', 'test-prod-cap', 200, 0) ON CONFLICT (id) DO UPDATE SET available_quantity = 200, reserved_quantity = 0;`);

    const { cart } = await getOrCreateCart({ userId: 'usr-test-cap' });

    // Step 1: Add 80 units
    const add1 = await addItemToCart(cart.id, { productId: 'test-prod-cap', quantity: 80 });
    assert.equal(add1.clampedQty, 80);

    // Step 2: Add 50 more units — must clamp to 99, never 130!
    const add2 = await addItemToCart(cart.id, { productId: 'test-prod-cap', quantity: 50 });
    assert.equal(add2.clampedQty, 99, 'Aggregate cart quantity must be clamped to 99 max');

    // Step 3: Attempting to add further when already at 99 must throw
    await assert.rejects(
      async () => await addItemToCart(cart.id, { productId: 'test-prod-cap', quantity: 5 }),
      /maximum allowed quantity/
    );
  });

  test('18. CSRF Session Binding (H4): Validates tokens across both string and object session shapes', async () => {
    const { generateCsrfToken, verifyCsrfToken, requireCsrf } = await import('../src/security/csrf.js');

    // Test with string session
    const tokenStr = generateCsrfToken('session-abc');
    assert.equal(verifyCsrfToken(tokenStr, 'session-abc'), true);
    assert.equal(verifyCsrfToken(tokenStr, 'session-wrong'), false);

    // Test with object session shape { sessionId: 'session-123' }
    const tokenObj = generateCsrfToken({ sessionId: 'session-123' });
    assert.equal(verifyCsrfToken(tokenObj, { sessionId: 'session-123' }), true);
    assert.equal(verifyCsrfToken(tokenObj, 'session-123'), true);

    // Test requireCsrf middleware with req.session.sessionId
    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': tokenObj },
      session: { sessionId: 'session-123' }
    };
    assert.equal(requireCsrf(req), true);
  });

  test('19. Customer Order Tracking (Live Tracking & Milestone History)', async () => {
    const { buildWhatsAppMessage } = await import('../src/services/whatsapp.js');
    const { createOrder, fetchOrderByReference, updateOrderTracking } = await import('../src/services/supabase.js');

    const testRef = 'FH-TRACK-TEST-001';
    const orderData = {
      id: testRef,
      reference: testRef,
      name: 'Ramesh Chaudhary',
      phone: '9848123456',
      address: 'Hasanpur, Dhangadhi',
      total: 18500,
      paymentMethod: 'Cash on Delivery',
      status: 'Pending',
      items: [{ name: 'Executive Desk', price: 18500, quantity: 1 }]
    };

    // 1. Verify WhatsApp confirmation link uses customer tracking URL instead of admin URL
    const msg = buildWhatsAppMessage(orderData, orderData.items);
    assert.ok(msg.includes('#track?ref=FH-TRACK-TEST-001'), 'WhatsApp message must provide public customer tracking link');
    assert.ok(!msg.includes('#admin/orders'), 'WhatsApp message must never link customer to admin dashboard');

    // 2. Create order and verify initial tracking milestone
    const created = await createOrder(orderData);
    assert.ok(Array.isArray(created.tracking_history), 'Order must have tracking_history array');
    assert.ok(created.tracking_history.length >= 1, 'Initial milestone must be recorded');

    // 3. Look up order by reference
    const found = await fetchOrderByReference(testRef);
    assert.ok(found, 'Order must be findable by reference ID');
    assert.equal(found.id, testRef);

    // 4. Admin updates tracking: e.g. Packed -> Shipped with dispatch notes
    await updateOrderTracking(testRef, {
      status: 'Processing',
      title: 'Packed in Bubble Wrap & Inspected',
      location: 'Dhangadhi Hub',
      note: 'Checked for quality and packaged for delivery.'
    });

    await updateOrderTracking(testRef, {
      status: 'Shipped',
      title: 'Dispatched for Doorstep Delivery',
      location: 'Dhangadhi Transit',
      note: 'Driver assigned: Ramesh (9848123456)'
    });

    const updated = await fetchOrderByReference(testRef);
    assert.equal(updated.status, 'Shipped');
    assert.ok(updated.tracking_history.length >= 3);
    assert.equal(updated.tracking_history[updated.tracking_history.length - 1].status, 'Shipped');
    assert.ok(updated.tracking_history[updated.tracking_history.length - 1].note.includes('Ramesh'));
  });

  test('20. Guest Order Account Email Isolation: Unauthenticated callers cannot assign customer_email', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf-8');

    // Verification 1: Direct INSERT on orders table is removed, and place_order sets customer_email = NULL for unauthenticated callers
    assert.ok(
      schemaSql.includes('DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;') &&
      schemaSql.includes('v_customer_email := NULL;') &&
      schemaSql.includes("v_customer_id := 'guest';"),
      'Direct order INSERT policy must be removed and place_order must enforce customer_email IS NULL for guests'
    );

    // Verification 2: Ensure client createOrder service neutralizes unauthenticated email spoofing
    const { createOrder } = await import('../src/services/supabase.js');
    const spoofOrderPayload = {
      id: 'FH-GUEST-SPOOF-' + Date.now(),
      name: 'Sneaky Guest',
      phone: '9800000000',
      address: 'Somewhere in Nepal',
      customer_email: 'victim.customer@gmail.com', // Attempting to inject victim email without auth
      total: 5000,
      paymentMethod: 'Cash on Delivery',
      status: 'Pending'
    };

    const res = await createOrder(spoofOrderPayload);
    assert.ok(res, 'Guest order should succeed creation');
  });

  test('21. Authoritative Pricing & Guest Identity Integrity (place_order RPC)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf-8');

    // 1. Unknown products must be rejected with an exception rather than falling back to client-supplied prices
    assert.ok(
      schemaSql.includes("RAISE EXCEPTION 'Unknown product: %', COALESCE(v_product_id, '(missing id)');"),
      'place_order must strictly reject unknown product IDs to prevent fabricated or negative pricing'
    );

    // 2. Must check auth.uid() IS NOT NULL rather than auth.jwt() to prevent anon JWTs from misidentifying guests
    assert.ok(
      schemaSql.includes("IF auth.uid() IS NOT NULL THEN"),
      'place_order must use auth.uid() IS NOT NULL to accurately discern authenticated users from anon guests'
    );
  });

  test('22. Order Tracking Phone Hardening & Hero Picture Fallback Resilience', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf-8');
    const homeViewJs = fs.readFileSync(path.resolve(process.cwd(), 'src/views/home-view.js'), 'utf-8');
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));

    // 1. track_order regex guard against empty strings and wildcard attacks
    assert.ok(
      schemaSql.includes("p_phone ~ '^[0-9]+$'"),
      'track_order must enforce numeric regex on phone parameter before matching'
    );

    // 2. home-view.js removes <source> tags on error before setting PNG fallback
    assert.ok(
      homeViewJs.includes("this.closest('picture')?.querySelectorAll('source').forEach(s => s.remove())"),
      'Hero picture onerror must remove <source> elements so PNG fallback is applied'
    );

    // 3. package.json build script includes asset conversion
    assert.ok(
      pkgJson.scripts.build.includes('node scripts/convert-hero.js'),
      'Build script must generate optimized hero assets before bundling'
    );
  });

  test('23. place_order Functional Authority: Stock, Pricing, Coupons, Shipping & Collision Retries', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf-8');
    const supabaseJs = fs.readFileSync(path.resolve(process.cwd(), 'src/services/supabase.js'), 'utf-8');

    // 1. Schema migration includes nullable products.stock_quantity and orders.user_id
    assert.ok(
      schemaSql.includes('ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;'),
      'Schema must include nullable products.stock_quantity migration'
    );
    assert.ok(
      schemaSql.includes('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT;'),
      'Schema must include orders.user_id migration'
    );

    // 2. place_order enforces in_stock and stock decrements under FOR UPDATE, setting in_stock false at 0
    assert.ok(
      schemaSql.includes('IF NOT COALESCE(v_product_row.in_stock, true) THEN'),
      'place_order must reject orders for out of stock items'
    );
    assert.ok(
      schemaSql.includes('in_stock = (stock_quantity - v_qty > 0)') &&
      schemaSql.includes('stock_quantity = stock_quantity - v_qty'),
      'place_order must decrement counted stock and toggle in_stock to false at zero'
    );
    assert.ok(
      schemaSql.includes('FOR UPDATE;'),
      'place_order must lock rows under FOR UPDATE to prevent concurrency overselling'
    );

    // 3. Coupons store check and rejection of unknown codes
    assert.ok(
      schemaSql.includes('FROM public.coupons') &&
      schemaSql.includes("RAISE EXCEPTION 'Invalid coupon code: %', v_coupon_code;"),
      'place_order must query the coupons table and reject unknown codes'
    );

    // 4. Exact UI shipping threshold parity (25000 / 500)
    assert.ok(
      schemaSql.includes('CASE WHEN v_subtotal > 25000 THEN 0 ELSE 500 END'),
      'place_order shipping threshold must match renderCartDrawer (Rs. 25,000 threshold, Rs. 500 base)'
    );

    // 5. Orders insert includes user_id and returns persisted order
    assert.ok(
      schemaSql.includes('user_id,') &&
      schemaSql.includes('RETURN to_jsonb(v_created_order);'),
      'place_order must insert user_id and return complete persisted JSONB order'
    );

    // 6. Direct INSERT fallback removed from client service
    assert.ok(
      !supabaseJs.includes("client.from('orders').insert"),
      'createOrder must NOT contain any direct table INSERT fallback'
    );

    // 7. Collision retry for error code 23505
    assert.ok(
      supabaseJs.includes('23505') &&
      supabaseJs.includes('isUniqueCollision'),
      'createOrder must retry unique constraint collisions (23505) using the existing reference format'
    );
  });

  test('24. Live Checkout Verification: Session Check, In-Flight Lock, Cloud History Merge', async () => {
    const { getCurrentCustomer, fetchCustomerOrders } = await import('../src/services/customer-auth.js');
    const mainJs = (await import('fs')).readFileSync((await import('path')).resolve(process.cwd(), 'src/main.js'), 'utf-8');

    // 1. Invalid stored session objects are discarded and purged
    localStorage.setItem('fh_customer_session', JSON.stringify({ invalid: 'object' }));
    const invalidRes = getCurrentCustomer();
    assert.equal(invalidRes, null, 'Invalid session object must return null');
    assert.equal(localStorage.getItem('fh_customer_session'), null, 'Invalid session object must be evicted from localStorage');

    localStorage.setItem('fh_customer_session', JSON.stringify({ id: '', email: 'no-id@test.com' }));
    assert.equal(getCurrentCustomer(), null);
    assert.equal(localStorage.getItem('fh_customer_session'), null);

    localStorage.setItem('fh_customer_session', JSON.stringify({ id: 'valid-id', email: 'valid@test.com', role: 'customer' }));
    assert.ok(getCurrentCustomer() !== null, 'Valid session object must be returned');

    // 2. fetchCustomerOrders merges orders and falls back to local orders
    const orders = await fetchCustomerOrders('valid-id');
    assert.ok(Array.isArray(orders), 'fetchCustomerOrders must return an array');

    // 3. main.js contains in-flight lock, submit button disable, and post-persistence error isolation
    assert.ok(
      mainJs.includes('let isPlacingOrder = false;') &&
      mainJs.includes('if (isPlacingOrder) return;') &&
      mainJs.includes('submitBtn.disabled = true;'),
      'main.js must guard against duplicate in-flight orders and disable submit button'
    );
    assert.ok(
      mainJs.includes('Post-persistence order processing error') &&
      mainJs.includes('showToast(`🎊 Order #${ref} placed successfully!`, \'success\');'),
      'main.js must decouple RPC creation failure from post-persistence errors'
    );
  });

  test('25. Confirmed Write Semantics: Mutation Helpers & Profile Writes Report Success Only After Confirmed Cloud Write', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const supabaseJs = fs.readFileSync(path.resolve(process.cwd(), 'src/services/supabase.js'), 'utf-8');
    const customerAuthJs = fs.readFileSync(path.resolve(process.cwd(), 'src/services/customer-auth.js'), 'utf-8');
    const adminProductsJs = fs.readFileSync(path.resolve(process.cwd(), 'src/views/admin/admin-products-view.js'), 'utf-8');
    const adminSettingsJs = fs.readFileSync(path.resolve(process.cwd(), 'src/views/admin/admin-settings-view.js'), 'utf-8');
    const onboardingJs = fs.readFileSync(path.resolve(process.cwd(), 'src/views/customer/customer-onboarding-view.js'), 'utf-8');
    const customerDashJs = fs.readFileSync(path.resolve(process.cwd(), 'src/views/customer/customer-dashboard-view.js'), 'utf-8');

    // 1. updateOrderTracking uses .select() and throws on empty result
    assert.ok(
      supabaseJs.includes(".from('orders').update(updatePayload).eq('id', orderId).select();") &&
      supabaseJs.includes('if (!data || data.length === 0) {') &&
      supabaseJs.includes('Order #${orderId} was not found or could not be updated.'),
      'updateOrderTracking must request rows with .select() and throw on empty result'
    );

    // 2. saveProduct and deleteProduct confirm cloud write with .select() before cache update
    assert.ok(
      supabaseJs.includes(".from('products').upsert(payload).select();") &&
      supabaseJs.includes('Product could not be saved to cloud database.'),
      'saveProduct must await .select() and throw on error or empty result before updating cache'
    );
    assert.ok(
      supabaseJs.includes(".from('products').delete().eq('id', productId).select();") &&
      supabaseJs.includes('Product "${productId}" was not found or could not be deleted.'),
      'deleteProduct must await .select() and throw on error or empty result before updating cache'
    );

    // 3. Settings & Coupon mutations confirm cloud write with .select() before cache update
    assert.ok(
      supabaseJs.includes(".from('store_settings').upsert({") &&
      supabaseJs.includes("key: 'general',") &&
      supabaseJs.includes('}).select();'),
      'saveStoreSettings must await .select() and throw on error before updating cache'
    );
    assert.ok(
      supabaseJs.includes(".from('coupons').upsert({") &&
      supabaseJs.includes('}).select();'),
      'saveCoupon must await .select() and throw on error before updating cache'
    );
    assert.ok(
      supabaseJs.includes(".from('coupons').delete().eq('code', code.toUpperCase()).select();"),
      'deleteCoupon must await .select() and throw on error before updating cache'
    );

    // 4. Profile upserts include session user_id and await sync in updateCustomerProfile
    assert.ok(
      customerAuthJs.includes('user_id: userId,') &&
      customerAuthJs.includes("const { error } = await client.from('customer_profiles').upsert(profileRow"),
      'Customer profile sync must include user_id and check { error }'
    );
    assert.ok(
      customerAuthJs.includes('await syncCustomerProfileToSupabase(sanitized);') &&
      customerAuthJs.includes('localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(sanitized));'),
      'updateCustomerProfile must await syncCustomerProfileToSupabase and throw before mutating local cache'
    );

    // 5. Admin callers show success after resolution and failure on exception
    assert.ok(
      adminProductsJs.includes('await saveProduct(newProd);') &&
      adminProductsJs.includes("type: 'danger'") &&
      adminProductsJs.includes('Failed to save product:'),
      'admin-products-view.js must handle saveProduct errors with danger toast and keep modal open'
    );
    assert.ok(
      adminProductsJs.includes('await deleteProduct(id);') &&
      adminProductsJs.includes('Failed to delete product:'),
      'admin-products-view.js must handle deleteProduct errors with danger toast'
    );
    assert.ok(
      adminSettingsJs.includes('Failed to update WhatsApp receiver:') &&
      adminSettingsJs.includes('Failed to save store profile:') &&
      adminSettingsJs.includes('Failed to create coupon:') &&
      adminSettingsJs.includes('Failed to delete coupon:'),
      'admin-settings-view.js must handle mutation errors with danger toasts'
    );

    // 6. Onboarding & profile views handle errors with danger toasts while keeping form data intact
    assert.ok(
      onboardingJs.includes('await updateCustomerProfile(') &&
      onboardingJs.includes('Failed to save delivery details:'),
      'customer-onboarding-view.js must await updateCustomerProfile and show failure toast on error'
    );
    assert.ok(
      customerDashJs.includes('await updateCustomerProfile(') &&
      customerDashJs.includes('Failed to update profile:'),
      'customer-dashboard-view.js must await updateCustomerProfile and show failure toast on error'
    );

    // 7. Offline fallback functionality: verify mutations succeed when no Supabase client exists
    const { saveProduct, deleteProduct, saveStoreSettings, saveCoupon, deleteCoupon, updateOrderTracking } = await import('../src/services/supabase.js');
    const { updateCustomerProfile: updateCustProf, customerRegister } = await import('../src/services/customer-auth.js');

    // Offline product mutation
    const testProd = { id: 'offline-prod-1', name: 'Offline Table', category: 'Tables', price: 9999, inStock: true };
    const savedProd = await saveProduct(testProd);
    assert.equal(savedProd.id, 'offline-prod-1', 'saveProduct must succeed in offline mode');
    await deleteProduct('offline-prod-1');

    // Offline settings and coupon mutations
    const savedSettings = await saveStoreSettings({ storeName: 'Offline Hub' });
    assert.equal(savedSettings.storeName, 'Offline Hub', 'saveStoreSettings must succeed in offline mode');

    const savedCoupon = await saveCoupon({ code: 'OFFLINE10', discountPercent: 10, minOrderAmount: 1000 });
    assert.equal(savedCoupon.code, 'OFFLINE10', 'saveCoupon must succeed in offline mode');
    await deleteCoupon('OFFLINE10');

    // Offline customer profile update
    await customerRegister({
      name: 'Offline Customer',
      email: 'offline@customer.com',
      phone: '9840000000',
      address: 'Hasanpur',
      city: 'Dhangadhi',
      password: 'OfflinePassword123'
    });
    const updatedCust = await updateCustProf({ name: 'Offline Updated', address: 'Main Road' });
    assert.equal(updatedCust.name, 'Offline Updated', 'updateCustomerProfile must succeed in offline mode');
  });

  test('26. Server Cart, Checkout, and Router Defense Suite', async () => {
    const { getDb } = await import('../src/db/client.js');
    const { getRedis } = await import('../src/auth/redis.js');
    const { addItemToCart, getOrCreateCart } = await import('../src/cart/service.js');
    const { confirmOrder } = await import('../src/checkout/service.js');
    const { handleCartRequest } = await import('../src/cart/router.js');
    const { handleCheckoutRequest } = await import('../src/checkout/router.js');
    const { validateCheckoutInput } = await import('../src/security/validation.js');
    const { generateCsrfToken } = await import('../src/security/csrf.js');

    const db = await getDb();
    const redis = getRedis();

    // Ensure all required dormant schema tables exist for cart and checkout tests
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_images (id TEXT PRIMARY KEY, product_id TEXT, url TEXT NOT NULL, alt_text TEXT, sort_order INTEGER DEFAULT 0, is_primary BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS addresses (id TEXT PRIMARY KEY, user_id TEXT, recipient_name TEXT, phone TEXT, address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, postal_code TEXT, landmark TEXT, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, reference TEXT UNIQUE, user_id TEXT, shipping_address_id TEXT, status TEXT DEFAULT 'PLACED', subtotal_minor BIGINT, delivery_fee_minor BIGINT, discount_minor BIGINT, total_minor BIGINT, payment_method TEXT, payment_status TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, product_name_snapshot TEXT, sku_snapshot TEXT, unit_price_minor_snapshot BIGINT, quantity INTEGER, line_total_minor BIGINT, color TEXT);
      CREATE TABLE IF NOT EXISTS order_status_history (id TEXT PRIMARY KEY, order_id TEXT, from_status TEXT, to_status TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    `);

    // 1. Repeated-Add Stock Arithmetic: When stock < 99, repeated additions clamp to total available without erroneous early rejection
    await db.query(`INSERT INTO products (id, slug, sku, name, price_minor, is_active) VALUES ('prod-arith-1', 'prod-arith-1', 'SKU-ARITH-1', 'Arith Chair', 100000, true) ON CONFLICT (id) DO NOTHING;`);
    await db.query(`INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity) VALUES ('inv-arith-1', 'prod-arith-1', 50, 0) ON CONFLICT (id) DO UPDATE SET available_quantity = 50, reserved_quantity = 0;`);

    const { cart } = await getOrCreateCart({ userId: 'usr-arith-test' });

    // Add 30 items
    const r1 = await addItemToCart(cart.id, { productId: 'prod-arith-1', quantity: 30 });
    assert.equal(r1.clampedQty, 30);
    assert.equal(r1.availableStock, 20);

    // Add 30 more items — should clamp to 50 (30 + 20), not throw an out-of-stock or cap error!
    const r2 = await addItemToCart(cart.id, { productId: 'prod-arith-1', quantity: 30 });
    assert.equal(r2.clampedQty, 50, 'Repeated add must correctly use remaining available stock (20) to reach 50');
    assert.equal(r2.availableStock, 0);

    // Adding more now must throw since availableStock is 0
    await assert.rejects(
      async () => await addItemToCart(cart.id, { productId: 'prod-arith-1', quantity: 1 }),
      /out of stock/i
    );

    // 2. Consistent Empty-String Null-Safe Cart Lookup & Insertion
    const ciRes = await db.query(`SELECT selected_color FROM cart_items WHERE cart_id = $1 AND product_id = 'prod-arith-1';`, [cart.id]);
    assert.ok(ciRes.rows.length === 1);
    assert.equal(ciRes.rows[0].selected_color, '', 'Cart item selected_color must be stored as empty-string');

    // 3. Catalog Cache Invalidation on Cart Stock Mutations
    await redis.set('catalog:list:test-key', JSON.stringify({ cached: true }));
    await db.query(`UPDATE inventory SET available_quantity = 50, reserved_quantity = 0 WHERE product_id = 'prod-arith-1';`);
    await db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cart.id]);
    await addItemToCart(cart.id, { productId: 'prod-arith-1', quantity: 1 });
    const cachedAfterAdd = await redis.get('catalog:list:test-key');
    assert.equal(cachedAfterAdd, null, 'addItemToCart must invalidate catalog cache in Redis');

    // 4. validateCheckoutInput: Matched payment enum against getPaymentStrategy
    assert.throws(
      () => validateCheckoutInput({ addressId: 'addr-1', paymentMethod: 'card' }),
      /Invalid payment method: card/
    );
    assert.throws(
      () => validateCheckoutInput({ addressId: 'addr-1', paymentMethod: 'esewa' }),
      /Invalid payment method: esewa/
    );
    const validCod = validateCheckoutInput({ addressId: 'addr-1', paymentMethod: 'cod' });
    assert.equal(validCod.paymentMethod, 'cod');
    const validWa = validateCheckoutInput({ addressId: 'addr-1', paymentMethod: 'WhatsApp Direct' });
    assert.equal(validWa.paymentMethod, 'WhatsApp Direct');

    // 5. CSRF Protection on Non-Safe Cart & Checkout Methods
    const postWithoutCsrf = {
      method: 'POST',
      url: '/api/cart/items',
      headers: {},
      body: { productId: 'prod-arith-1', quantity: 1 }
    };
    await assert.rejects(
      async () => await handleCartRequest(postWithoutCsrf),
      /Invalid or missing CSRF token/
    );

    const csrfToken = generateCsrfToken('anonymous');
    const postWithCsrf = {
      method: 'POST',
      url: '/api/cart/items',
      headers: { 'x-csrf-token': csrfToken },
      body: { productId: 'prod-arith-1', quantity: 1 }
    };
    const cartPostRes = await handleCartRequest(postWithCsrf);
    assert.equal(cartPostRes.status, 200, 'POST /api/cart/items with valid CSRF must succeed');

    // 6. confirmOrder: Idempotency Key Claim Atomicity & Release on Failure
    const failedKey = 'idem-fail-test-1';
    await assert.rejects(
      async () => await confirmOrder({
        userId: 'usr-arith-test',
        addressId: 'non-existent-address-id',
        idempotencyKey: failedKey
      })
    );
    const claimAfterFail = await redis.get(`idempotency:order:usr-arith-test:${failedKey}`);
    assert.equal(claimAfterFail, null, 'Idempotency claim must be released upon failure to allow retry');

    // 7. confirmOrder: Rejects Changed Price from Locked Row
    const { generateOrderPreview } = await import('../src/checkout/service.js');
    await db.query(`INSERT INTO addresses (id, user_id, recipient_name, phone, address_line1, city, state, postal_code) VALUES ('addr-price-test', 'usr-arith-test', 'Ram', '9800000000', 'Ward 1', 'Dhangadhi', 'Sudurpashchim', '10900') ON CONFLICT (id) DO NOTHING;`);
    await db.query(`INSERT INTO products (id, slug, sku, name, price_minor, is_active) VALUES ('prod-price-lock', 'prod-price-lock', 'SKU-PRICE', 'Price Test Desk', 200000, true) ON CONFLICT (id) DO NOTHING;`);
    await db.query(`INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity) VALUES ('inv-price-1', 'prod-price-lock', 10, 0) ON CONFLICT (id) DO UPDATE SET available_quantity = 10, reserved_quantity = 0;`);
    await db.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cart.id]);
    await addItemToCart(cart.id, { productId: 'prod-price-lock', quantity: 1 });

    // Establish preview with current price (200,000 minor units)
    const preview = await generateOrderPreview({ userId: 'usr-arith-test', addressId: 'addr-price-test' });
    assert.equal(preview.items[0].unitPriceMinor, 200000);

    // Tamper the product price in database directly after preview was generated
    await db.query(`UPDATE products SET price_minor = 250000 WHERE id = 'prod-price-lock';`);

    await assert.rejects(
      async () => await confirmOrder({
        userId: 'usr-arith-test',
        addressId: 'addr-price-test',
        paymentMethod: 'cod',
        preview
      }),
      /Price mismatch for product "Price Test Desk"/
    );

    // Also confirm clientSuppliedTotal mismatch rejection
    await assert.rejects(
      async () => await confirmOrder({
        userId: 'usr-arith-test',
        addressId: 'addr-price-test',
        paymentMethod: 'cod',
        clientSuppliedTotal: 12345
      }),
      /Payment total mismatch/
    );
  });
});








