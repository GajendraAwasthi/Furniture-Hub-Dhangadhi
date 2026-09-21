import { getDb } from './client.js';

export async function explainHottestQueries(db) {
  const targetDb = db || (await getDb());

  const queries = [
    {
      name: 'Query 1: Catalog Keyset Browse by Category + Active Status',
      description: 'Customer browses a category page with keyset pagination',
      sql: `EXPLAIN (FORMAT TEXT)
            SELECT p.id, p.slug, p.name, p.price_minor, p.compare_at_price_minor 
            FROM products p 
            WHERE p.category_id = $1 AND p.is_active = true 
            ORDER BY p.id ASC 
            LIMIT 20;`,
      params: ['cat-seatings'],
      expectedIndex: 'idx_products_category_active_id'
    },
    {
      name: 'Query 2: Product Detail Page Lookup by Unique Slug',
      description: 'Customer views a single product page with real-time inventory',
      sql: `EXPLAIN (FORMAT TEXT)
            SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.compare_at_price_minor, i.available_quantity 
            FROM products p 
            JOIN inventory i ON p.id = i.product_id 
            WHERE p.slug = $1 AND p.is_active = true;`,
      params: ['fh-nordic-chair-1'],
      expectedIndex: 'idx_products_slug'
    },
    {
      name: 'Query 3: Active Cart & Items Lookup by Cart ID',
      description: 'Cart drawer and checkout rendering all items with live prices',
      sql: `EXPLAIN (FORMAT TEXT)
            SELECT ci.id, ci.product_id, ci.quantity, ci.selected_color, p.name, p.price_minor 
            FROM cart_items ci 
            JOIN products p ON ci.product_id = p.id 
            WHERE ci.cart_id = $1;`,
      params: ['cart-1'],
      expectedIndex: 'idx_cart_items_cart_id'
    },
    {
      name: 'Query 4: Order Lookup by Unique Reference',
      description: 'Customer confirmation page and admin order detail lookup',
      sql: `EXPLAIN (FORMAT TEXT)
            SELECT o.id, o.reference, o.status, o.total_minor, o.subtotal_minor, o.delivery_fee_minor, o.created_at 
            FROM orders o 
            WHERE o.reference = $1;`,
      params: ['FH-10001'],
      expectedIndex: 'idx_orders_reference'
    },
    {
      name: 'Query 5: Customer Order History by User ID + Created At',
      description: 'Customer account dashboard listing past orders sorted newest-first',
      sql: `EXPLAIN (FORMAT TEXT)
            SELECT o.id, o.reference, o.status, o.total_minor, o.created_at 
            FROM orders o 
            WHERE o.user_id = $1 
            ORDER BY o.created_at DESC 
            LIMIT 10;`,
      params: ['usr-1'],
      expectedIndex: 'idx_orders_user_created'
    }
  ];

  // Force planner to use index paths so index-coverage is strictly tested
  await targetDb.exec('SET enable_seqscan = off;');

  const results = [];

  for (const q of queries) {
    const res = await targetDb.query(q.sql, q.params);
    const planLines = res.rows.map(r => r['QUERY PLAN'] || Object.values(r)[0]);
    const planText = planLines.join('\n');

    // Verify index coverage: Plan should use Index Scan, Index Only Scan, or Bitmap Index Scan
    const isIndexCovered = planText.includes('Index Scan') || planText.includes('Index Only Scan') || planText.includes('Bitmap Index Scan');
    const mentionsExpectedIndex = planText.includes(q.expectedIndex);

    results.push({
      name: q.name,
      description: q.description,
      sql: q.sql.replace('EXPLAIN (FORMAT TEXT)\n', '').trim(),
      params: q.params,
      plan: planText,
      isIndexCovered,
      mentionsExpectedIndex,
      expectedIndex: q.expectedIndex
    });
  }

  return results;
}

// CLI invocation support
if (process.argv[1] && process.argv[1].endsWith('explain_queries.js')) {
  (async () => {
    const db = await getDb();
    const results = await explainHottestQueries(db);
    for (const r of results) {
      console.log('================================================================');
      console.log(r.name);
      console.log('Query:', r.sql);
      console.log('Index Expected:', r.expectedIndex);
      console.log('Index Covered:', r.isIndexCovered ? 'YES' : 'NO');
      console.log('Query Plan:');
      console.log(r.plan);
    }
  })().catch(err => {
    console.error('EXPLAIN failed:', err);
    process.exit(1);
  });
}
