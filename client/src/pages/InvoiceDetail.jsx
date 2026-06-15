import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Toast from '../components/Toast.jsx';
import { api } from '../lib/api.js';

const STATUS_COLORS = {
  draft:   { bg: '#f1f5f9', color: '#475569' },
  sent:    { bg: '#eff6ff', color: '#2563eb' },
  paid:    { bg: '#f0fdf4', color: '#16a34a' },
  overdue: { bg: '#fef2f2', color: '#dc2626' },
  void:    { bg: '#f9fafb', color: '#9ca3af' },
};

const s = {
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headLeft: { display: 'flex', flexDirection: 'column', gap: 6 },
  invoiceNum: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 },
  badge: (status) => ({
    display: 'inline-block', padding: '3px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
    ...STATUS_COLORS[status] || STATUS_COLORS.draft,
  }),
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: (variant = 'secondary') => ({
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    ...(variant === 'primary'   ? { background: '#2563eb', color: '#fff', border: 'none' }
      : variant === 'danger'    ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
      : variant === 'warn'      ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }
      :                            { background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0' }),
  }),
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 18 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  fieldValue: { fontSize: 14, color: '#111827', fontWeight: 500 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 14px', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, padding: '8px 10px', borderBottom: '1.5px solid #e2e8f0' },
  td: { padding: '10px 10px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f8fafc' },
  totalBlock: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 },
  totalInner: { minWidth: 280 },
  tline: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 6 },
  tlineTotal: { display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#0f172a', borderTop: '1.5px solid #e2e8f0', paddingTop: 8, marginTop: 6 },
  urlBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' },
  urlText: { flex: 1, fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' },
  copyBtn: { flexShrink: 0, padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  notesText: { fontSize: 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  historyRow: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#64748b', marginBottom: 8 },
  historyDot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }),
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  loading: { textAlign: 'center', padding: 60, color: '#64748b' },
};

function Field({ label, value }) {
  return (
    <div>
      <p style={s.fieldLabel}>{label}</p>
      <p style={{ ...s.fieldValue, margin: 0 }}>{value || '—'}</p>
    </div>
  );
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const publicDomain = import.meta.env.VITE_PUBLIC_DOMAIN || 'https://payment.arabaltmed.com';

  useEffect(() => {
    api.invoices.get(id)
      .then(d => { setInvoice(d.invoice); setItems(d.items); setPayments(d.payments || []); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (location.state?.toast) {
      setToast({ message: location.state.toast, variant: 'success' });
      window.history.replaceState({}, '');
    }
    if (location.state?.sendError) {
      setError(`Email failed: ${location.state.sendError} — Invoice saved as draft.`);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  async function handleSend() {
    setActionLoading(true);
    setError('');
    try {
      const data = await api.invoices.send(id);
      setInvoice(prev => ({ ...prev, ...data.invoice }));
      setToast({ message: `Invoice sent to ${invoice.client_email}`, variant: 'success' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this draft invoice? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.invoices.delete(id);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
      setActionLoading(false);
    }
  }

  async function handleResend() {
    if (!window.confirm(`Resend invoice email to ${invoice.client_email}?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await api.invoices.resend(id);
      setToast({ message: `Invoice resent to ${invoice.client_email}`, variant: 'success' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleVoid() {
    if (!window.confirm('Void this invoice? It will be cancelled and cannot be undone.')) return;
    setActionLoading(true);
    try {
      const data = await api.invoices.update(id, { status: 'void' });
      setInvoice(prev => ({ ...prev, ...data.invoice }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function copyUrl() {
    const url = `${publicDomain}/invoice/${invoice.public_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <Layout title="Invoice"><p style={s.loading}>Loading…</p></Layout>;
  if (error && !invoice) return <Layout title="Error"><div style={s.error}>{error}</div></Layout>;

  const publicUrl = `${publicDomain}/invoice/${invoice.public_token}`;
  const isDraft = invoice.status === 'draft';
  const canSend = ['draft', 'sent', 'overdue'].includes(invoice.status);
  const isSent = invoice.status === 'sent' || invoice.status === 'overdue';
  const isVoidable = ['draft', 'sent', 'overdue'].includes(invoice.status);
  const isPaid = invoice.status === 'paid';

  const statusHistory = [
    { label: 'Created', date: invoice.created_at, color: '#94a3b8' },
    invoice.sent_at && { label: 'Sent to client', date: invoice.sent_at, color: '#2563eb' },
    invoice.paid_at && { label: 'Payment received', date: invoice.paid_at, color: '#16a34a' },
    invoice.status === 'void' && { label: 'Voided', date: invoice.updated_at, color: '#9ca3af' },
    invoice.status === 'overdue' && { label: 'Marked overdue', date: invoice.updated_at, color: '#dc2626' },
  ].filter(Boolean);

  return (
    <Layout title={invoice.invoice_number}>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
      {error && <div style={s.error}>{error}</div>}

      <div style={s.topRow}>
        <div style={s.headLeft}>
          <h2 style={s.invoiceNum}>{invoice.invoice_number}</h2>
          <span style={s.badge(invoice.status)}>{invoice.status}</span>
        </div>
        <div style={s.actions}>
          <button style={s.btn()} onClick={() => navigate('/admin/dashboard')}>← Back</button>
          {invoice.status !== 'void' && (
            <button style={s.btn()} onClick={() => window.open(`/invoice/${invoice.public_token}`, '_blank')}>
              👁 Preview
            </button>
          )}
          {canSend && (
            <button style={s.btn('primary')} onClick={handleSend} disabled={actionLoading}>
              {actionLoading ? 'Sending…' : isSent ? '↺ Resend Invoice' : '✉ Send Invoice'}
            </button>
          )}
          {isPaid && (
            <button style={s.btn()} onClick={handleResend} disabled={actionLoading}>
              {actionLoading ? 'Sending…' : '↺ Resend Email'}
            </button>
          )}
          {isVoidable && (
            <button style={s.btn('warn')} onClick={handleVoid} disabled={actionLoading}>
              Void Invoice
            </button>
          )}
          {isDraft && (
            <button style={s.btn('danger')} onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting…' : 'Delete Draft'}
            </button>
          )}
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Invoice Details</p>
        <div style={s.grid2}>
          <Field label="Client Name" value={invoice.client_name} />
          <Field label="Client Email" value={invoice.client_email} />
          <Field label="Due Date" value={fmtDate(invoice.due_date)} />
          <Field label="Currency" value={invoice.currency} />
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Line Items</p>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Description</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Qty</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Unit Price</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={s.td}>{it.description}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{parseFloat(it.quantity)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(it.unit_price).toFixed(2)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(it.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={s.totalBlock}>
          <div style={s.totalInner}>
            <div style={s.tline}><span>Subtotal</span><span>${parseFloat(invoice.subtotal).toFixed(2)}</span></div>
            {parseFloat(invoice.tax_rate) > 0 && (
              <div style={s.tline}><span>Tax ({invoice.tax_rate}%)</span><span>${parseFloat(invoice.tax_amount).toFixed(2)}</span></div>
            )}
            <div style={s.tlineTotal}><span>Total (USD)</span><span>${parseFloat(invoice.total).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Status History</p>
        {statusHistory.map((ev, i) => (
          <div key={i} style={s.historyRow}>
            <div style={s.historyDot(ev.color)} />
            <span style={{ fontWeight: 500, color: '#374151' }}>{ev.label}</span>
            <span style={{ color: '#94a3b8', marginLeft: 'auto', fontSize: 12 }}>
              {new Date(ev.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {payments.length > 0 && (
        <div style={s.card}>
          <p style={s.sectionTitle}>Payment History</p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Transaction ID</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(pmt => (
                <tr key={pmt.id}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                    {pmt.transaction_id || '—'}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>
                    ${parseFloat(pmt.amount).toFixed(2)} {pmt.currency}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                    {new Date(pmt.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invoice.status !== 'void' && (
        <div style={s.card}>
          <p style={s.sectionTitle}>Public Payment URL</p>
          <div style={s.urlBox}>
            <span style={s.urlText}>{publicUrl}</span>
            <button style={s.copyBtn} onClick={copyUrl}>{copied ? '✓ Copied' : 'Copy URL'}</button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            Share this link with your client. They can view the invoice and pay online.
          </p>
        </div>
      )}

      {invoice.notes && (
        <div style={s.card}>
          <p style={s.sectionTitle}>Notes</p>
          <p style={{ ...s.notesText, margin: 0 }}>{invoice.notes}</p>
        </div>
      )}
    </Layout>
  );
}
