import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

const s = {
  section: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '24px 28px',
    marginBottom: 20,
    maxWidth: 680,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '0 0 20px',
  },
  divider: { borderBottom: '1px solid #f1f5f9', marginBottom: 20, paddingBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
  inputFocus: { borderColor: '#2563eb' },
  envRow: { display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e2e8f0' },
  envBtn: (active) => ({
    flex: 1,
    padding: '9px 0',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? '#2563eb' : '#f8fafc',
    color: active ? '#fff' : '#64748b',
  }),
  saveBtn: {
    padding: '10px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  success: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    maxWidth: 680,
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    maxWidth: 680,
  },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  showHide: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  showBtn: {
    position: 'absolute',
    right: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#64748b',
    padding: '2px 4px',
  },
};

const SANDBOX = 'apitest.cybersource.com';
const LIVE = 'api.cybersource.com';

export default function Settings() {
  const [form, setForm] = useState({
    CYBERSOURCE_MERCHANT_ID: '',
    CYBERSOURCE_API_KEY_ID: '',
    CYBERSOURCE_SECRET_KEY: '',
    CYBERSOURCE_RUN_ENVIRONMENT: SANDBOX,
    CYBERSOURCE_DEFAULT_COUNTRY: 'US',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [focusField, setFocusField] = useState(null);

  useEffect(() => {
    api.settings.get()
      .then((d) => setForm((prev) => ({ ...prev, ...d.settings })))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess('');
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await api.settings.update(form);
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isLive = form.CYBERSOURCE_RUN_ENVIRONMENT === LIVE;

  return (
    <Layout title="Settings">
      {success && <div style={s.success}>{success}</div>}
      {error && <div style={s.error}>{error}</div>}

      <form onSubmit={handleSave}>
        <div style={s.section}>
          <p style={s.sectionTitle}>Payment Gateway</p>
          <p style={s.sectionSub}>CyberSource credentials for processing invoice payments</p>

          <div style={{ ...s.field, ...s.divider }}>
            <label style={s.label}>Environment</label>
            <div style={s.envRow}>
              <button
                type="button"
                style={s.envBtn(!isLive)}
                onClick={() => set('CYBERSOURCE_RUN_ENVIRONMENT', SANDBOX)}
              >
                Sandbox (testing)
              </button>
              <button
                type="button"
                style={s.envBtn(isLive)}
                onClick={() => set('CYBERSOURCE_RUN_ENVIRONMENT', LIVE)}
              >
                Live (production)
              </button>
            </div>
            {isLive && (
              <p style={{ ...s.hint, color: '#d97706' }}>
                ⚠️ Live mode — real payments will be processed.
              </p>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Merchant ID</label>
            <input
              style={{ ...s.input, ...(focusField === 'mid' ? s.inputFocus : {}) }}
              value={form.CYBERSOURCE_MERCHANT_ID}
              onChange={(e) => set('CYBERSOURCE_MERCHANT_ID', e.target.value)}
              onFocus={() => setFocusField('mid')}
              onBlur={() => setFocusField(null)}
              placeholder={loading ? 'Loading…' : 'e.g. arabaltmed_test'}
              disabled={loading}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>API Key ID</label>
            <input
              style={{ ...s.input, ...(focusField === 'kid' ? s.inputFocus : {}) }}
              value={form.CYBERSOURCE_API_KEY_ID}
              onChange={(e) => set('CYBERSOURCE_API_KEY_ID', e.target.value)}
              onFocus={() => setFocusField('kid')}
              onBlur={() => setFocusField(null)}
              placeholder={loading ? 'Loading…' : 'API Key ID from Business Center'}
              disabled={loading}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Secret Key</label>
            <div style={s.showHide}>
              <input
                style={{ ...s.input, paddingRight: 60, ...(focusField === 'sk' ? s.inputFocus : {}) }}
                type={showSecret ? 'text' : 'password'}
                value={form.CYBERSOURCE_SECRET_KEY}
                onChange={(e) => set('CYBERSOURCE_SECRET_KEY', e.target.value)}
                onFocus={() => setFocusField('sk')}
                onBlur={() => setFocusField(null)}
                placeholder={loading ? 'Loading…' : 'Secret key from Business Center'}
                disabled={loading}
              />
              <button
                type="button"
                style={s.showBtn}
                onClick={() => setShowSecret((v) => !v)}
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Default Billing Country</label>
            <input
              style={{ ...s.input, maxWidth: 120, ...(focusField === 'country' ? s.inputFocus : {}) }}
              value={form.CYBERSOURCE_DEFAULT_COUNTRY}
              onChange={(e) => set('CYBERSOURCE_DEFAULT_COUNTRY', e.target.value.toUpperCase().slice(0, 2))}
              onFocus={() => setFocusField('country')}
              onBlur={() => setFocusField(null)}
              placeholder="US"
              maxLength={2}
              disabled={loading}
            />
            <p style={s.hint}>ISO 3166-1 alpha-2 country code (e.g. US, SA, AE)</p>
          </div>
        </div>

        <button
          type="submit"
          style={{ ...s.saveBtn, ...(saving || loading ? s.saveBtnDisabled : {}) }}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </Layout>
  );
}
