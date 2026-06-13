import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  statsRow: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  statCard: { background: '#fff', borderRadius: 10, padding: '18px 22px', flex: '1 1 180px', border: '1px solid #e2e8f0' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' },
  statValue: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  tableCard: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
  tableTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 },
  newBtn: { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, padding: '10px 16px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' },
  td: { padding: '13px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f8fafc' },
  badge: (status) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
    ...STATUS_COLORS[status] || STATUS_COLORS.draft,
  }),
  actionBtn: { padding: '5px 12px', background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', marginRight: 6 },
  emptyState: { textAlign: 'center', padding: '60px 40px', color: '#94a3b8' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#64748b', margin: '0 0 6px' },
  emptyText: { fontSize: 13, margin: 0 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

function fmt(n) { return `$${parseFloat(n).toFixed(2)}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—'; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copying, setCopying] = useState(null);

  const publicDomain = import.meta.env.VITE_PUBLIC_DOMAIN || 'https://payments.arabaltmed.com';

  useEffect(() => {
    api.invoices.list()
      .then(d => setInvoices(d.invoices))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function copyUrl(inv) {
    const url = `${publicDomain}/invoice/${inv.public_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopying(inv.id);
      setTimeout(() => setCopying(null), 2000);
    });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await api.invoices.delete(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const total = invoices.reduce((s, i) => s + parseFloat(i.total), 0);
  const pending = invoices.filter(i => ['draft','sent'].includes(i.status)).reduce((s, i) => s + parseFloat(i.total), 0);
  const paidAmt = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <Layout title="Invoices">
      {error && <div style={s.error}>{error}</div>}

      <div style={s.statsRow}>
        {[
          { label: 'Total Invoices', value: invoices.length },
          { label: 'Pending Payment', value: `$${pending.toFixed(2)}` },
          { label: 'Collected', value: `$${paidAmt.toFixed(2)}` },
          { label: 'Overdue', value: overdueCount },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <p style={s.statLabel}>{stat.label}</p>
            <p style={s.statValue}>{loading ? '…' : stat.value}</p>
          </div>
        ))}
      </div>

      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <h2 style={s.tableTitle}>All Invoices</h2>
          <button style={s.newBtn} onClick={() => navigate('/admin/invoices/new')}>+ New Invoice</button>
        </div>

        {loading ? (
          <div style={s.emptyState}><p style={s.emptyTitle}>Loading…</p></div>
        ) : invoices.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyTitle}>No invoices yet</p>
            <p style={s.emptyText}>Create your first invoice to get started.</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Invoice #</th>
                <th style={s.th}>Client</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Due Date</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ cursor: 'pointer' }}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#0f172a' }}
                      onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                    {inv.invoice_number}
                  </td>
                  <td style={s.td} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                    <div style={{ fontWeight: 500 }}>{inv.client_name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{inv.client_email}</div>
                  </td>
                  <td style={{ ...s.td, fontWeight: 600 }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                    {fmt(inv.total)}
                  </td>
                  <td style={s.td} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                    <span style={s.badge(inv.status)}>{inv.status}</span>
                  </td>
                  <td style={s.td} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                    {fmtDate(inv.due_date)}
                  </td>
                  <td style={s.td}>
                    <button style={s.actionBtn} onClick={() => copyUrl(inv)}>
                      {copying === inv.id ? '✓ Copied' : '🔗 Copy URL'}
                    </button>
                    {['draft','sent'].includes(inv.status) && (
                      <button style={{ ...s.actionBtn, color: '#ef4444', borderColor: '#fecaca' }}
                              onClick={() => handleDelete(inv.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
