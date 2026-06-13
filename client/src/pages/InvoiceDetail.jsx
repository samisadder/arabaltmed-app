import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
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
  actions: { display: 'flex', gap: 10 },
  btn: (variant = 'secondary') => ({
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    ...(variant === 'primary' ? { background: '#2563eb', color: '#fff' }
      : variant === 'danger'  ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
      :                          { background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0' }),
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
  emptyNote: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
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

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const publicDomain = import.meta.env.VITE_PUBLIC_DOMAIN || 'https://payments.arabaltmed.com';

  useEffect(() => {
    api.invoices.get(id)
      .then(d => { setInvoice(d.invoice); setItems(d.items); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.invoices.delete(id);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
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
  const canDelete = ['draft', 'sent'].includes(invoice.status);

  return (
    <Layout title={invoice.invoice_number}>
      {error && <div style={s.error}>{error}</div>}

      <div style={s.topRow}>
        <div style={s.headLeft}>
          <h2 style={s.invoiceNum}>{invoice.invoice_number}</h2>
          <span style={s.badge(invoice.status)}>{invoice.status}</span>
        </div>
        <div style={s.actions}>
          <button style={s.btn()} onClick={() => navigate('/admin/dashboard')}>← Back</button>
          {canDelete && (
            <button style={s.btn('danger')} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Invoice Details</p>
        <div style={s.grid2}>
          <Field label="Client Name" value={invoice.client_name} />
          <Field label="Client Email" value={invoice.client_email} />
          <Field label="Due Date" value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' }) : null} />
          <Field label="Created" value={new Date(invoice.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })} />
          {invoice.sent_at && <Field label="Sent" value={new Date(invoice.sent_at).toLocaleDateString()} />}
          {invoice.paid_at && <Field label="Paid" value={new Date(invoice.paid_at).toLocaleDateString()} />}
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
        <p style={s.sectionTitle}>Public Payment URL</p>
        <div style={s.urlBox}>
          <span style={s.urlText}>{publicUrl}</span>
          <button style={s.copyBtn} onClick={copyUrl}>{copied ? '✓ Copied' : 'Copy URL'}</button>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Share this link with your client. They can view the invoice and pay online.
        </p>
      </div>

      {invoice.notes && (
        <div style={s.card}>
          <p style={s.sectionTitle}>Notes</p>
          <p style={s.notesText}>{invoice.notes}</p>
        </div>
      )}
    </Layout>
  );
}
