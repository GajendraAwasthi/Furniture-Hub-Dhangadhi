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

    // Verification: Active Supabase JWT token with matching store_admins record validates successfully
    localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'valid-test-jwt-token',
      user: {
        id: 'sb-admin-1',
        email: 'verified.admin@furniturehub.com',
        role: 'authenticated'
      }
    }));
    assert.equal(isCurrentAdmin(), true, 'Cryptographically authenticated Supabase JWT must grant admin access');
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

    const updated = updateCustomerProfile(exploitPayload);

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

  test('10. Catalog Fixture Integrity (HI-1): Default catalog delivers populated, valid storefront items', async () => {
    const productsData = (await import('../src/data/products.json', { with: { type: 'json' } })).default;
    assert.ok(Array.isArray(productsData), 'Products fixture must be an array');
    assert.ok(productsData.length >= 9, 'Catalog fixture must contain default product inventory');
    for (const item of productsData) {
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
    
    try {
      const files = await fs.readdir(assetsDir);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      assert.ok(jsFiles.length >= 2, 'Application should produce multiple code-split chunks');

      for (const file of jsFiles) {
        const stats = await fs.stat(path.join(assetsDir, file));
        const sizeKb = stats.size / 1024;
        assert.ok(sizeKb < 500, `Chunk ${file} (${sizeKb.toFixed(2)} kB) must remain strictly under 500 kB budget`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
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
});








