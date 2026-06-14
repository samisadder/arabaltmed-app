import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ALLOWED_KEYS = [
  'CYBERSOURCE_MERCHANT_ID',
  'CYBERSOURCE_API_KEY_ID',
  'CYBERSOURCE_SECRET_KEY',
  'CYBERSOURCE_RUN_ENVIRONMENT',
  'CYBERSOURCE_DEFAULT_COUNTRY',
];

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT key, value FROM settings WHERE key = ANY($1)',
      [ALLOWED_KEYS]
    );
    const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const merged = {};
    for (const key of ALLOWED_KEYS) {
      merged[key] = db[key] ?? process.env[key] ?? '';
    }

    res.json({ settings: merged });
  } catch (err) {
    console.error('GET /api/settings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const key of ALLOWED_KEYS) {
        if (key in updates) {
          const value = String(updates[key] ?? '').trim();
          if (value === '') {
            await client.query('DELETE FROM settings WHERE key = $1', [key]);
          } else {
            await client.query(
              `INSERT INTO settings (key, value, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
              [key, value]
            );
          }
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/settings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
