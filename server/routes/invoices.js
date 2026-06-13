import { Router } from 'express';
import { nanoid } from 'nanoid';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function markOverdue(client) {
  await client.query(`
    UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('draft','sent')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
  `);
}

async function upsertClient(client, name, email) {
  const existing = await client.query(
    'SELECT id FROM clients WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  if (existing.rows.length > 0) {
    await client.query(
      'UPDATE clients SET name = $1, updated_at = NOW() WHERE email = $2',
      [name, email.toLowerCase().trim()]
    );
    return existing.rows[0].id;
  }
  const res = await client.query(
    'INSERT INTO clients (name, email) VALUES ($1, $2) RETURNING id',
    [name, email.toLowerCase().trim()]
  );
  return res.rows[0].id;
}

async function nextInvoiceNumber(client) {
  const year = new Date().getFullYear();
  const res = await client.query(
    `SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`,
    [`INV-${year}-%`]
  );
  const seq = String(Number(res.rows[0].count) + 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
}

router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await markOverdue(client);
    const result = await client.query(`
      SELECT i.id, i.invoice_number, i.public_token, i.status,
             i.due_date, i.subtotal, i.total, i.currency,
             i.sent_at, i.paid_at, i.created_at, i.updated_at,
             c.name AS client_name, c.email AS client_email
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      ORDER BY i.created_at DESC
    `);
    res.json({ invoices: result.rows });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await markOverdue(client);
    const inv = await client.query(`
      SELECT i.*, c.name AS client_name, c.email AS client_email,
             c.phone AS client_phone, c.company AS client_company
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.id = $1
    `, [req.params.id]);

    if (!inv.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

    const items = await client.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );

    res.json({ invoice: inv.rows[0], items: items.rows });
  } finally {
    client.release();
  }
});

router.post('/', async (req, res) => {
  const { clientName, clientEmail, items = [], dueDate, notes, taxRate = 0 } = req.body;

  if (!clientName || !clientEmail) {
    return res.status(400).json({ error: 'Client name and email are required' });
  }
  if (!items.length) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const clientId = await upsertClient(dbClient, clientName, clientEmail);
    const invoiceNumber = await nextInvoiceNumber(dbClient);
    const publicToken = nanoid(16);

    const subtotal = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
    const taxAmount = Math.round(subtotal * (Number(taxRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const invRes = await dbClient.query(`
      INSERT INTO invoices (invoice_number, public_token, client_id, status, due_date, notes,
                            subtotal, tax_rate, tax_amount, total, currency)
      VALUES ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9,'USD')
      RETURNING *
    `, [invoiceNumber, publicToken, clientId,
        dueDate || null, notes || null,
        subtotal, taxRate, taxAmount, total]);

    const invoice = invRes.rows[0];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const amount = Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100;
      await dbClient.query(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [invoice.id, it.description, it.quantity, it.unitPrice, amount, i]);
    }

    await dbClient.query('COMMIT');
    res.status(201).json({ invoice: { ...invoice, client_name: clientName, client_email: clientEmail } });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    dbClient.release();
  }
});

router.patch('/:id', async (req, res) => {
  const { status, notes, dueDate } = req.body;
  const dbClient = await pool.connect();
  try {
    const inv = await dbClient.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!inv.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

    const current = inv.rows[0];
    const newStatus = status || current.status;
    const newNotes = notes !== undefined ? notes : current.notes;
    const newDueDate = dueDate !== undefined ? dueDate : current.due_date;

    const result = await dbClient.query(`
      UPDATE invoices SET status=$1, notes=$2, due_date=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *
    `, [newStatus, newNotes, newDueDate, req.params.id]);

    res.json({ invoice: result.rows[0] });
  } finally {
    dbClient.release();
  }
});

router.delete('/:id', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    const inv = await dbClient.query('SELECT status FROM invoices WHERE id = $1', [req.params.id]);
    if (!inv.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

    await dbClient.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } finally {
    dbClient.release();
  }
});

export default router;
