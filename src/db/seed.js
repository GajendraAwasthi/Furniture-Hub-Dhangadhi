import { getDb } from './client.js';

export async function seedDatabase(db, options = {}) {
  const targetDb = db || (await getDb());
  const productCount = options.productCount || 5000;
  const userCount = options.userCount || 100000;

  console.log(`[Seed] Beginning database seed: ${productCount} products, ${userCount} users...`);
  const startTime = Date.now();

  // 1. Seed Categories
  const categories = [
    { id: 'cat-seatings', slug: 'seatings', name: 'Seatings', description: 'Ergonomic chairs, loungers & armchairs' },
    { id: 'cat-surfaces', slug: 'surfaces', name: 'Surfaces', description: 'Coffee tables, dining & desks' },
    { id: 'cat-decorations', slug: 'decorations', name: 'Decorations', description: 'Artisanal ceramics & accents' },
    { id: 'cat-greens', slug: 'greens', name: 'Greens', description: 'Indoor botanical planters' },
    { id: 'cat-long-sofa', slug: 'long-sofa', name: 'Long Sofa', description: 'Modular sectionals & plush sofas' },
    { id: 'cat-combos', slug: 'combos', name: 'Combos', description: 'Curated room packages' },
    { id: 'cat-lighting', slug: 'lighting', name: 'Lighting', description: 'Pendant lamps & ambient fixtures' },
    { id: 'cat-storage', slug: 'storage', name: 'Storage', description: 'Cabinets, credenzas & shelving' }
  ];

  await targetDb.exec('BEGIN;');

  // Insert categories
  for (const c of categories) {
    await targetDb.query(
      `INSERT INTO categories (id, slug, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING;`,
      [c.id, c.slug, c.name, c.description]
    );
  }

  // 2. Seed 5,000 Products + Inventory + Images in Batches
  console.log(`[Seed] Inserting ${productCount} products...`);
  const productBatchSize = 1000;
  const adjectives = ['Nordic', 'Minimalist', 'Artisan', 'Velvet', 'Teak', 'Ergonomic', 'Boucle', 'Zen', 'Modernist', 'Heritage'];
  const nouns = ['Chair', 'Lounge', 'Sofa', 'Side Table', 'Credenza', 'Planter', 'Sectional', 'Bench', 'Stool', 'Desk'];

  for (let b = 0; b < productCount; b += productBatchSize) {
    const pValues = [];
    const pParams = [];
    const invValues = [];
    const invParams = [];
    const imgValues = [];
    const imgParams = [];

    const currentBatch = Math.min(productBatchSize, productCount - b);

    for (let i = 0; i < currentBatch; i++) {
      const idx = b + i + 1;
      const cat = categories[idx % categories.length];
      const adj = adjectives[idx % adjectives.length];
      const noun = nouns[idx % nouns.length];
      const pid = `prod-${idx}`;
      const slug = `fh-${adj.toLowerCase()}-${noun.toLowerCase().replace(' ', '-')}-${idx}`;
      const sku = `SKU-FH-${String(idx).padStart(6, '0')}`;
      const name = `${adj} ${noun} Edition ${idx}`;
      const priceMinor = 500000 + ((idx * 179) % 4500000); // 5,000 to 50,000 in minor units (paisa)
      const comparePrice = idx % 3 === 0 ? priceMinor + 1000000 : null;

      const pOffset = i * 8;
      pValues.push(`($${pOffset + 1}, $${pOffset + 2}, $${pOffset + 3}, $${pOffset + 4}, $${pOffset + 5}, $${pOffset + 6}, $${pOffset + 7}, $${pOffset + 8})`);
      pParams.push(pid, slug, sku, name, cat.id, 'Crafted with sustainably sourced timber and ergonomic contours.', priceMinor, comparePrice);

      const invOffset = i * 4;
      const availableQty = 10 + (idx % 90);
      invValues.push(`($${invOffset + 1}, $${invOffset + 2}, $${invOffset + 3}, $${invOffset + 4})`);
      invParams.push(`inv-${idx}`, pid, availableQty, 0);

      const imgOffset = i * 4;
      imgValues.push(`($${imgOffset + 1}, $${imgOffset + 2}, $${imgOffset + 3}, $${imgOffset + 4})`);
      imgParams.push(`img-${idx}`, pid, `/images/product-${(idx % 14) + 1}.png`, true);
    }

    // Batch insert products
    await targetDb.query(
      `INSERT INTO products (id, slug, sku, name, category_id, description, price_minor, compare_at_price_minor) VALUES ${pValues.join(',')};`,
      pParams
    );

    // Batch insert inventory
    await targetDb.query(
      `INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity) VALUES ${invValues.join(',')};`,
      invParams
    );

    // Batch insert primary image
    await targetDb.query(
      `INSERT INTO product_images (id, product_id, url, is_primary) VALUES ${imgValues.join(',')};`,
      imgParams
    );
  }

  // 3. Seed 100,000 Users in High-Throughput Batches
  console.log(`[Seed] Inserting ${userCount} users...`);
  const userBatchSize = 5000;
  const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$placeholderhashvalueforbenchmarking12345';

  for (let b = 0; b < userCount; b += userBatchSize) {
    const uValues = [];
    const uParams = [];
    const currentBatch = Math.min(userBatchSize, userCount - b);

    for (let i = 0; i < currentBatch; i++) {
      const idx = b + i + 1;
      const uid = `usr-${idx}`;
      const email = `customer_${idx}@furniturehub.example.com`;
      const name = `Customer ${idx}`;
      const phone = `+97798${String(idx).padStart(8, '0').slice(-8)}`;

      const uOffset = i * 5;
      uValues.push(`($${uOffset + 1}, $${uOffset + 2}, $${uOffset + 3}, $${uOffset + 4}, $${uOffset + 5})`);
      uParams.push(uid, email, dummyHash, name, phone);
    }

    await targetDb.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone) VALUES ${uValues.join(',')};`,
      uParams
    );

    if ((b + currentBatch) % 25000 === 0 || b + currentBatch === userCount) {
      console.log(`[Seed] ...${b + currentBatch} / ${userCount} users loaded`);
    }
  }

  // 4. Seed Default Admin User
  await targetDb.query(
    `INSERT INTO admin_users (id, email, password_hash, name, role) 
     VALUES ('adm-1', 'admin@furniturehub.com', $1, 'Principal Administrator', 'SUPERADMIN')
     ON CONFLICT (email) DO NOTHING;`,
    [dummyHash]
  );

  // 5. Seed Sample Customer Data: Address, Cart, Order, and Order Items
  const sampleUserId = 'usr-1';
  const sampleAddressId = 'addr-1';
  await targetDb.query(
    `INSERT INTO addresses (id, user_id, recipient_name, phone, address_line1, city, state, postal_code, is_default)
     VALUES ($1, $2, 'Ram Bahadur Thapa', '+977 9848123456', 'Main Road, Ward 1', 'Dhangadhi', 'Sudurpashchim', '10900', true);`,
    [sampleAddressId, sampleUserId]
  );

  const sampleCartId = 'cart-1';
  await targetDb.query(
    `INSERT INTO carts (id, user_id) VALUES ($1, $2);`,
    [sampleCartId, sampleUserId]
  );

  await targetDb.query(
    `INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color)
     VALUES ('ci-1', $1, 'prod-1', 2, 'Forest Green'), ('ci-2', $1, 'prod-2', 1, 'Sand Cream');`,
    [sampleCartId]
  );

  // 5. Seed 2,000 Carts and 5,000 Cart Items
  console.log('[Seed] Inserting carts and cart items...');
  const cartBatchSize = 1000;
  for (let b = 0; b < 2000; b += cartBatchSize) {
    const cValues = [];
    const cParams = [];
    for (let i = 0; i < cartBatchSize; i++) {
      const cid = `cart-${b + i + 1}`;
      const uid = `usr-${(b + i) % userCount + 1}`;
      cValues.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
      cParams.push(cid, uid);
    }
    await targetDb.query(`INSERT INTO carts (id, user_id) VALUES ${cValues.join(',')} ON CONFLICT (id) DO NOTHING;`, cParams);
  }

  // Insert 5,000 Cart Items
  for (let b = 0; b < 5000; b += cartBatchSize) {
    const ciValues = [];
    const ciParams = [];
    for (let i = 0; i < cartBatchSize; i++) {
      const ciId = `ci-${b + i + 1}`;
      const cid = `cart-${(b + i) % 2000 + 1}`;
      const pid = `prod-${(b + i) % productCount + 1}`;
      const color = (b + i) % 2 === 0 ? 'Forest Green' : 'Snow White';
      ciValues.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
      ciParams.push(ciId, cid, pid, (i % 3) + 1, color);
    }
    await targetDb.query(
      `INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color) VALUES ${ciValues.join(',')} ON CONFLICT DO NOTHING;`,
      ciParams
    );
  }

  // 6. Seed 5,000 Orders with Frozen Snapshots & User-Owned Addresses
  console.log('[Seed] Inserting 5,000 orders and order items...');
  const orderBatchSize = 1000;
  for (let b = 0; b < 5000; b += orderBatchSize) {
    const oValues = [];
    const oParams = [];
    const oiValues = [];
    const oiParams = [];
    const addrValues = [];
    const addrParams = [];

    for (let i = 0; i < orderBatchSize; i++) {
      const idx = b + i + 1;
      const orderId = `ord-${idx}`;
      const orderRef = `FH-${String(idx + 10000)}`;
      const uid = `usr-${(idx % userCount) + 1}`;
      const userAddrId = `addr-${uid}`;
      const subtotal = 1500000 + ((idx * 311) % 5000000);
      const delivery = subtotal > 2500000 ? 0 : 50000;
      const total = subtotal + delivery;

      // Ensure address strictly belongs to this user
      const aOffset = i * 9;
      addrValues.push(`($${aOffset + 1}, $${aOffset + 2}, $${aOffset + 3}, $${aOffset + 4}, $${aOffset + 5}, $${aOffset + 6}, $${aOffset + 7}, $${aOffset + 8}, $${aOffset + 9})`);
      addrParams.push(userAddrId, uid, `Customer ${uid}`, '+977 9848123456', `Main Road, Ward ${(idx % 19) + 1}`, 'Dhangadhi', 'Sudurpashchim', '10900', true);

      const oOffset = i * 8;
      oValues.push(`($${oOffset + 1}, $${oOffset + 2}, $${oOffset + 3}, $${oOffset + 4}, $${oOffset + 5}, $${oOffset + 6}, $${oOffset + 7}, $${oOffset + 8})`);
      oParams.push(orderId, orderRef, uid, userAddrId, 'PLACED', subtotal, delivery, total);

      const oiOffset = i * 8;
      oiValues.push(`($${oiOffset + 1}, $${oiOffset + 2}, $${oiOffset + 3}, $${oiOffset + 4}, $${oiOffset + 5}, $${oiOffset + 6}, $${oiOffset + 7}, $${oiOffset + 8})`);
      oiParams.push(
        `oi-${idx}`,
        orderId,
        `prod-${(idx % productCount) + 1}`,
        `Nordic Chair Edition ${(idx % 10) + 1}`,
        `SKU-FH-${String((idx % productCount) + 1).padStart(6, '0')}`,
        subtotal,
        1,
        subtotal
      );
    }

    // Insert user-owned addresses first
    await targetDb.query(
      `INSERT INTO addresses (id, user_id, recipient_name, phone, address_line1, city, state, postal_code, is_default)
       VALUES ${addrValues.join(',')}
       ON CONFLICT (id) DO NOTHING;`,
      addrParams
    );

    await targetDb.query(
      `INSERT INTO orders (id, reference, user_id, shipping_address_id, status, subtotal_minor, delivery_fee_minor, total_minor) VALUES ${oValues.join(',')};`,
      oParams
    );

    await targetDb.query(
      `INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, sku_snapshot, unit_price_minor_snapshot, quantity, line_total_minor) VALUES ${oiValues.join(',')};`,
      oiParams
    );
  }

  await targetDb.exec('COMMIT;');

  // Run ANALYZE to update query planner statistics
  await targetDb.exec('ANALYZE;');

  const durationMs = Date.now() - startTime;
  console.log(`[Seed] Successfully seeded database in ${(durationMs / 1000).toFixed(2)}s.`);

  return {
    success: true,
    productCount,
    userCount,
    durationMs
  };
}

// CLI invocation support
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    const db = await getDb();
    await seedDatabase(db);
    process.exit(0);
  })().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
