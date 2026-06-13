import 'dotenv/config';
import pool from './db.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        public_token VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        status VARCHAR(20) DEFAULT 'draft',
        due_date DATE,
        notes TEXT,
        subtotal DECIMAL(12,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        sent_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price DECIMAL(12,2) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        transaction_id VARCHAR(255),
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(64),
        processor_response JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Tables created.');

    await client.query(`
      ALTER TABLE payments ALTER COLUMN status TYPE VARCHAR(64);
    `);

    const existing = await client.query(
      'SELECT id FROM admins WHERE email = $1',
      ['admin@arabaltmed.com']
    );

    if (existing.rows.length === 0) {
      const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD
        || randomBytes(12).toString('base64url');

      const hash = await bcrypt.hash(bootstrapPassword, 12);
      await client.query(
        'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)',
        ['admin@arabaltmed.com', hash, 'Administrator']
      );
      console.log('='.repeat(60));
      console.log('Admin account created:');
      console.log('  Email:    admin@arabaltmed.com');
      console.log(`  Password: ${bootstrapPassword}`);
      console.log('Save this password — it will not be shown again.');
      console.log('='.repeat(60));
    } else {
      console.log('Admin already exists, skipping seed.');
    }

    console.log('Migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
