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
  logoutUser
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
    // Attack: Try logging into admin@furniturehub.com with random incorrect password
    await assert.rejects(
      async () => {
        await authenticateUser('admin@furniturehub.com', 'RandomAttackerPassword');
      },
      /Invalid email or password/
    );

    // Verify correct password succeeds
    const adminLogin = await authenticateUser('admin@furniturehub.com', 'admin123');
    assert.equal(adminLogin.success, true);
    assert.equal(adminLogin.role, 'admin');
    assert.equal(isCurrentAdmin(), true, 'Legitimate admin credentials must pass verification');
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

  test('7. Input Sanitization: Malicious tags and scripts are safely neutralized', () => {
    const dirty = '<script>alert("XSS")</script><b>Main Road</b>';
    const clean = sanitizeInput(dirty);
    assert.equal(clean.includes('<'), false, 'All angle brackets must be stripped');
    assert.equal(clean.includes('>'), false, 'All angle brackets must be stripped');
    assert.equal(clean, 'scriptalert("XSS")/scriptbMain Road/b');
  });
});
