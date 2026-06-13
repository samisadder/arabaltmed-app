import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

const s = {
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '28px 32px', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 18px', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' },
  row: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, padding: '8px 10px', borderBottom: '1.5px solid #e2e8f0' },
  td: { padding: '8px 6px', verticalAlign: 'middle' },
  lineInput: { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  addRowBtn: { background: 'none', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '9px 16px', fontSize: 13, color: '#64748b', cursor: 'pointer', marginTop: 10 },
  removeBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: '0 6px', lineHeight: 1 },
  totalRow: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 },
  totalBox: { textAlign: 'right' },
  totalLine: { display: 'flex', justifyContent: 'space-between', gap: 40, fontSize: 13, color: '#64748b', marginBottom: 6 },
  totalAmount: { display: 'flex', justifyContent: 'space-between', gap: 40, fontSize: 17, fontWeight: 700, color: '#0f172a', marginTop: 8, paddingTop: 8, borderTop: '1.5px solid #e2e8f0' },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  btnCancel: { padding: '10px 22px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' },
  btnDraft: { padding: '10px 22px', background: '#fff', border: '1.5px solid #2563eb', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#2563eb' },
  btnSend: { padding: '10px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

const emptyItem = () => ({ description: '', quantity: '1', unitPrice: '' });

export default function NewInvoice() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [taxRate, setTaxRate] = useState('0');
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState('');

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce((s, it) => {
    return s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0);
  }, 0);
  const taxAmount = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + taxAmount;

  function buildPayload() {
    const validItems = items.filter(it => it.description.trim() && it.unitPrice);
    if (!validItems.length) return null;
    return {
      clientName, clientEmail,
      items: validItems.map(it => ({
        description: it.description,
        quantity: parseFloat(it.quantity) || 1,
        unitPrice: parseFloat(it.unitPrice),
      })),
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      taxRate: parseFloat(taxRate) || 0,
    };
  }

  async function handleDraft() {
    setError('');
    const payload = buildPayload();
    if (!payload) { setError('Add at least one line item with a description and price.'); return; }
    setLoading(true);
    try {
      const data = await api.invoices.create(payload);
      navigate(`/admin/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    setError('');
    const payload = buildPayload();
    if (!payload) { setError('Add at least one line item with a description and price.'); return; }
    setSendingEmail(true);
    let invoiceId;
    try {
      const created = await api.invoices.create(payload);
      invoiceId = created.invoice.id;
      await api.invoices.send(invoiceId);
      navigate(`/admin/invoices/${invoiceId}`, { state: { toast: `Invoice sent to ${clientEmail}` } });
    } catch (err) {
      if (invoiceId) {
        navigate(`/admin/invoices/${invoiceId}`, { state: { sendError: err.message } });
      } else {
        setError(err.message);
      }
    } finally {
      setSendingEmail(false);
    }
  }

  const busy = loading || sendingEmail;

  return (
    <Layout title="New Invoice">
      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        <p style={s.sectionTitle}>Client Information</p>
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>Client Name *</label>
            <input style={s.input} value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="John Smith" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Client Email *</label>
            <input style={s.input} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} required placeholder="client@example.com" />
          </div>
        </div>
        <div style={s.row}>
          <div style={{ ...s.field, maxWidth: 220 }}>
            <label style={s.label}>Due Date</label>
            <input style={s.input} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Line Items</p>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: '45%' }}>Description</th>
              <th style={{ ...s.th, width: '12%' }}>Qty</th>
              <th style={{ ...s.th, width: '18%' }}>Unit Price</th>
              <th style={{ ...s.th, width: '18%' }}>Amount</th>
              <th style={{ ...s.th, width: '7%' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const amt = (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0);
              return (
                <tr key={idx}>
                  <td style={s.td}><input style={s.lineInput} value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Service or product description" /></td>
                  <td style={s.td}><input style={s.lineInput} type="number" min="0.01" step="0.01" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></td>
                  <td style={s.td}><input style={s.lineInput} type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} placeholder="0.00" /></td>
                  <td style={{ ...s.td, fontSize: 13, color: '#374151', fontWeight: 500 }}>${amt.toFixed(2)}</td>
                  <td style={s.td}>
                    {items.length > 1 && <button type="button" style={s.removeBtn} onClick={() => removeItem(idx)}>×</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button type="button" style={s.addRowBtn} onClick={addItem}>+ Add line item</button>

        <div style={s.totalRow}>
          <div style={s.totalBox}>
            <div style={s.totalLine}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div style={{ ...s.totalLine, alignItems: 'center' }}>
              <span>Tax (%)</span>
              <input style={{ ...s.lineInput, width: 80, textAlign: 'right' }} type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            {parseFloat(taxRate) > 0 && (
              <div style={s.totalLine}><span>Tax Amount</span><span>${taxAmount.toFixed(2)}</span></div>
            )}
            <div style={s.totalAmount}><span>Total (USD)</span><span>${total.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionTitle}>Additional Notes</p>
        <textarea style={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment instructions, terms, or other notes for the client…" />
      </div>

      <div style={s.actions}>
        <button type="button" style={s.btnCancel} onClick={() => navigate('/admin/dashboard')} disabled={busy}>
          Cancel
        </button>
        <button type="button" style={s.btnDraft} onClick={handleDraft} disabled={busy}>
          {loading ? 'Saving…' : 'Save as Draft'}
        </button>
        <button type="button" style={s.btnSend} onClick={handleSend} disabled={busy}>
          {sendingEmail ? 'Sending…' : 'Send Invoice'}
        </button>
      </div>
    </Layout>
  );
}
