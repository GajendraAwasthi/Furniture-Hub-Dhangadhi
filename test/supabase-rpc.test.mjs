import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('order and tracking RPCs enforce identity, phone proof, and stock', async () => {
  const db = new PGlite();
  await db.waitReady;
  try {
    // Supply only the Supabase auth/storage interfaces used by the schema.
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('app.jwt', true), '')::jsonb $$;
      CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
      CREATE TABLE storage.objects (id text PRIMARY KEY, bucket_id text);
    `);
    const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
    await db.exec(schema);
    await db.exec(schema);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.coupons')).rows[0].count, 0);
    await db.query(`INSERT INTO public.coupons (code, discount_percent, is_active)
      VALUES ('SAVE10', 10, false)`);
    await db.exec(schema);
    assert.equal((await db.query(`SELECT is_active FROM public.coupons WHERE code = 'SAVE10'`)).rows[0].is_active, false);
    await db.query(`UPDATE public.coupons SET is_active = true WHERE code = 'SAVE10'`);
    await db.query(`INSERT INTO public.products (id, name, category, price, image, stock_quantity)
      VALUES ('chair', 'Test Chair', 'Seatings', 1000, '/chair.png', 2)`);

    async function asUser(id = '', email = '') {
      await db.query(`SELECT set_config('app.user_id', $1, false)`, [id]);
      await db.query(`SELECT set_config('app.jwt', $1, false)`, [email ? JSON.stringify({ email }) : '']);
    }

    const customerId = '11111111-1111-4111-8111-111111111111';
    const otherId = '22222222-2222-4222-8222-222222222222';
    const order = {
      id: 'FH-TEST-1', customer_name: 'Test Customer', customer_phone: '9800000000',
      delivery_address: 'Ward 1, Dhangadhi', items: [{ id: 'chair', quantity: 1 }],
      coupon_code: 'SAVE10'
    };
    const place = payload => db.query('SELECT public.place_order($1::jsonb) AS order_data', [JSON.stringify(payload)]);
    const track = (phone = null) => db.query('SELECT * FROM public.track_order($1, $2)', [order.id, phone]);
    const stock = async () => Number((await db.query(`SELECT stock_quantity FROM public.products WHERE id = 'chair'`)).rows[0].stock_quantity);

    await asUser(customerId, 'customer@example.test');
    await assert.rejects(place({ ...order, customer_phone: 'abcdefghij' }), /phone/i);
    await assert.rejects(place({ ...order, items: {} }), /1 to 50 items/);
    await assert.rejects(place({ ...order, items: Array(51).fill({ id: 'chair', quantity: 1 }) }), /1 to 50 items/);
    await assert.rejects(place({ ...order, items: [{ id: 'chair', quantity: 1001 }] }), /quantity/i);
    await assert.rejects(place({ ...order, notes: 'x'.repeat(65537) }), /payload exceeds allowed limits/);
    assert.equal(await stock(), 2);

    const placed = (await place(order)).rows[0].order_data;
    assert.equal(Number(placed.total_amount), 1400);
    assert.equal(placed.customer_email, 'customer@example.test');
    assert.equal(await stock(), 1);
    assert.equal((await track()).rows.length, 1);

    await asUser(otherId, 'other@example.test');
    assert.equal((await track()).rows.length, 0);
    await assert.rejects(place({ ...order, id: 'FH-TEST-2', items: [{ id: 'chair', quantity: 2 }] }), /Insufficient stock/);
    assert.equal(await stock(), 1);

    // Exercise the direct table policy as a non-owner, not only RPC checks.
    await db.exec(`CREATE ROLE authenticated;
      GRANT USAGE ON SCHEMA public, auth TO authenticated;
      GRANT SELECT, INSERT ON public.orders TO authenticated;
      SET ROLE authenticated;`);
    try {
      assert.equal((await db.query('SELECT id FROM public.orders')).rows.length, 0);
      await assert.rejects(db.query(`INSERT INTO public.orders
        (id, customer_name, customer_phone, delivery_address, total_amount)
        VALUES ('FH-DIRECT', 'Other', '9800000001', 'Ward 2', 1)`), /row-level security/i);
    } finally {
      await db.exec('RESET ROLE');
    }
    await db.exec('GRANT SELECT, INSERT, UPDATE ON public.customer_profiles TO authenticated');
    await asUser(customerId, 'customer@example.test');
    await db.exec('SET ROLE authenticated');
    try {
      assert.equal((await db.query('SELECT id FROM public.orders')).rows.length, 1);
      await assert.rejects(db.query(`INSERT INTO public.customer_profiles
        (id, user_id, email, name) VALUES ('spoof', $1, 'victim@example.test', 'Other')`, [customerId]), /row-level security/i);
      await db.query(`INSERT INTO public.customer_profiles
        (id, user_id, email, name) VALUES ('mine', $1, 'customer@example.test', 'Customer')`, [customerId]);
      await assert.rejects(db.query(`UPDATE public.customer_profiles SET email = 'victim@example.test' WHERE id = 'mine'`), /row-level security/i);
    } finally {
      await db.exec('RESET ROLE');
    }

    await asUser();
    assert.equal((await track('1')).rows.length, 0);
    assert.equal((await track('9800000001')).rows.length, 0);
    assert.equal((await track('9800000000')).rows.length, 1);
    await assert.rejects(place({ ...order, id: 'FH-TEST-3' }), /Sign in/);
    assert.equal(await stock(), 1);
  } finally {
    await db.close();
  }
});
