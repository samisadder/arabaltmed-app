import React from 'react';
import Layout from '../components/Layout.jsx';

const s = {
  emptyCard: {
    background: '#fff',
    border: '1.5px dashed #e2e8f0',
    borderRadius: 12,
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: 480,
    margin: '60px auto',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px',
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  btn: {
    display: 'inline-block',
    padding: '11px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    background: '#fff',
    borderRadius: 10,
    padding: '18px 22px',
    flex: '1 1 180px',
    border: '1px solid #e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    margin: '0 0 6px',
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
};

export default function Dashboard() {
  return (
    <Layout title="Invoices">
      <div style={s.statsRow}>
        {[
          { label: 'Total Invoices', value: '0' },
          { label: 'Pending Payment', value: '$0.00' },
          { label: 'Paid This Month', value: '$0.00' },
          { label: 'Overdue', value: '0' },
        ].map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <p style={s.statLabel}>{stat.label}</p>
            <p style={s.statValue}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={s.emptyCard}>
        <div style={s.icon}>📋</div>
        <h2 style={s.title}>No invoices yet</h2>
        <p style={s.sub}>
          Create your first invoice to get started. It will be sent to your
          client by email and they can pay online via a secure link.
        </p>
        <button style={s.btn} disabled title="Coming in next update">
          + New Invoice
        </button>
      </div>
    </Layout>
  );
}
