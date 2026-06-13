import { Router } from 'express';
import pool from '../db.js';
import {
  isCyberSourceConfigured,
  generateCaptureContext,
  processPayment,
} from '../services/cybersource.js';

const router = Router();

async function getInvoiceByToken(token) {
  const { rows } = await pool.query(
    `SELECT i.*, c.name AS client_name, c.email AS client_email
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     WHERE i.public_token = $1`,
    [token]
  );
  return rows[0] || null;
}

async function getInvoiceItems(invoiceId) {
  const { rows } = await pool.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id',
    [invoiceId]
  );
  return rows;
}

router.get('/invoice/:token', async (req, res) => {
  try {
    const invoice = await getInvoiceByToken(req.params.token);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const items = await getInvoiceItems(invoice.id);

    res.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        issuedDate: invoice.created_at,
        dueDate: invoice.due_date,
        notes: invoice.notes,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        total: invoice.total,
        currency: invoice.currency || 'USD',
        clientName: invoice.client_name,
        clientEmail: invoice.client_email,
        paidAt: invoice.paid_at,
      },
      items: items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        amount: it.amount,
      })),
    });
  } catch (err) {
    console.error('GET /public/invoice/:token', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoice/:token/capture-context', async (req, res) => {
  try {
    if (!isCyberSourceConfigured()) {
      return res
        .status(502)
        .json({ error: 'Payment gateway is not configured' });
    }

    const invoice = await getInvoiceByToken(req.params.token);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (!['sent', 'overdue'].includes(invoice.status)) {
      return res
        .status(400)
        .json({ error: 'Invoice is not in a payable state' });
    }

    const origin =
      req.headers.origin ||
      process.env.PUBLIC_DOMAIN ||
      process.env.PUBLIC_INVOICE_DOMAIN ||
      'https://payments.arabaltmed.com';

    const captureContext = await generateCaptureContext(origin);
    res.json({ captureContext });
  } catch (err) {
    console.error('GET /public/invoice/:token/capture-context', err);
    let message = 'Failed to initialise payment form';
    try {
      const parsed = JSON.parse(err?.response?.text || '{}');
      if (parsed.message) message = parsed.message;
    } catch {}
    res.status(502).json({ error: message });
  }
});

router.post('/invoice/:token/pay', async (req, res) => {
  try {
    if (!isCyberSourceConfigured()) {
      return res
        .status(502)
        .json({ error: 'Payment gateway is not configured' });
    }

    const invoice = await getInvoiceByToken(req.params.token);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (!['sent', 'overdue'].includes(invoice.status)) {
      return res
        .status(400)
        .json({ error: 'Invoice is not in a payable state' });
    }

    const { transientToken, cardholderName, expMonth, expYear } = req.body;

    if (!transientToken) {
      return res.status(400).json({ error: 'Payment token is required' });
    }
    if (!expMonth || !expYear) {
      return res
        .status(400)
        .json({ error: 'Card expiry month and year are required' });
    }

    const { data: paymentData } = await processPayment({
      invoice,
      transientToken,
      cardholderName: cardholderName || invoice.client_name,
      expMonth: String(expMonth).padStart(2, '0'),
      expYear: String(expYear),
    });

    const cyberStatus = paymentData?.status || '';
    const accepted = [
      'AUTHORIZED',
      'AUTHORIZED_PENDING_REVIEW',
      'PARTIAL_AUTHORIZED',
      'PENDING',
    ].includes(cyberStatus);

    if (!accepted) {
      const reason =
        paymentData?.errorInformation?.reason ||
        paymentData?.processorInformation?.responseCode ||
        cyberStatus ||
        'Payment declined';
      return res.status(402).json({ error: `Payment declined: ${reason}` });
    }

    const db = await pool.connect();
    let dbCommitted = false;
    try {
      await db.query('BEGIN');

      await db.query(
        `UPDATE invoices
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [invoice.id]
      );

      await db.query(
        `INSERT INTO payments
           (invoice_id, amount, currency, transaction_id, status, processor_response)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          invoice.id,
          invoice.total,
          invoice.currency || 'USD',
          paymentData.id || null,
          cyberStatus,
          JSON.stringify(paymentData),
        ]
      );

      await db.query('COMMIT');
      dbCommitted = true;
    } catch (dbErr) {
      await db.query('ROLLBACK').catch(() => {});
      console.error('DB error after successful CyberSource payment — transaction ID:', paymentData.id, dbErr);
      return res.status(500).json({
        error:
          'Payment was authorised by the payment gateway but could not be recorded. ' +
          'Please contact support with transaction ID: ' + (paymentData.id || 'unknown'),
      });
    } finally {
      db.release();
    }

    res.json({
      success: true,
      transactionId: paymentData.id,
      status: cyberStatus,
    });
  } catch (err) {
    console.error('POST /public/invoice/:token/pay', err);
    let message = 'Payment processing failed';
    try {
      const parsed = JSON.parse(err?.response?.text || '{}');
      if (parsed.message) message = parsed.message;
      else if (parsed.errorInformation?.message)
        message = parsed.errorInformation.message;
    } catch {}
    res.status(502).json({ error: message });
  }
});

export default router;
