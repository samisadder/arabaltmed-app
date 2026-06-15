import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const FLEX_JS_URL = 'https://flex.cybersource.com/microform/bundle/v2/flex-microform.min.js';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const styles = {
    draft:   { background: '#f3f4f6', color: '#374151' },
    sent:    { background: '#dbeafe', color: '#1d4ed8' },
    overdue: { background: '#fee2e2', color: '#dc2626' },
    paid:    { background: '#dcfce7', color: '#16a34a' },
    void:    { background: '#f3f4f6', color: '#6b7280' },
  };
  const s = styles[status] || styles.draft;
  return (
    <span style={{
      ...s,
      padding: '3px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}

export default function InvoicePay() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [notFound, setNotFound] = useState(false);

  const [payReady, setPayReady] = useState(false);
  const [flexError, setFlexError] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);

  const [cardholderName, setCardholderName] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [success, setSuccess] = useState(null);

  const microformRef = useRef(null);
  const flexScriptLoaded = useRef(false);

  useEffect(() => {
    fetch(`/api/public/invoice/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) { setNotFound(true); return; }
        setInvoice(data.invoice);
        setItems(data.items);
        setCardholderName(data.invoice.clientName || '');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!invoice) return;
    if (!['sent', 'overdue'].includes(invoice.status)) return;

    fetch(`/api/public/invoice/${token}/capture-context`, {
        headers: { 'X-Page-Origin': window.location.origin },
      })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setFlexError(data.error);
          return;
        }
        if (data.sandbox) setIsSandbox(true);
        loadFlexMicroform(data.captureContext);
      })
      .catch(() => setFlexError('Could not load payment form. Please refresh the page.'));
  }, [invoice]);

  function loadFlexMicroform(captureContext) {
    if (flexScriptLoaded.current) {
      initMicroform(captureContext);
      return;
    }

    const script = document.createElement('script');
    script.src = FLEX_JS_URL;
    script.async = true;
    script.onload = () => {
      flexScriptLoaded.current = true;
      initMicroform(captureContext);
    };
    script.onerror = () => setFlexError('Could not load payment SDK. Please check your connection.');
    document.head.appendChild(script);
  }

  function initMicroform(captureContext) {
    try {
      const flex = new window.Flex(captureContext);
      const microform = flex.microform('card', { styles: microformStyles });
      microformRef.current = microform;

      const numberField = microform.createField('number', { placeholder: 'Card number' });
      const cvvField = microform.createField('securityCode', { placeholder: 'CVV' });

      numberField.load('#flex-number');
      cvvField.load('#flex-cvv');

      numberField.on('change', (d) => {
        if (d.valid === false) setFieldErrors((p) => ({ ...p, number: 'Invalid card number' }));
        else setFieldErrors((p) => { const n = { ...p }; delete n.number; return n; });
      });
      cvvField.on('change', (d) => {
        if (d.valid === false) setFieldErrors((p) => ({ ...p, cvv: 'Invalid security code' }));
        else setFieldErrors((p) => { const n = { ...p }; delete n.cvv; return n; });
      });

      setPayReady(true);
    } catch (err) {
      console.error('Flex init error:', err);
      setFlexError('Could not initialise payment form. Please refresh.');
    }
  }

  function handlePay(e) {
    e.preventDefault();
    if (!microformRef.current) return;

    const errs = {};
    if (!cardholderName.trim()) errs.cardholderName = 'Cardholder name is required';
    if (!expMonth) errs.expMonth = 'Required';
    if (!expYear) errs.expYear = 'Required';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setFieldErrors({});
    setPaying(true);
    setPayError('');

    const options = {
      expirationMonth: String(expMonth).padStart(2, '0'),
      expirationYear: String(expYear),
    };

    microformRef.current.createToken(options, (err, transientToken) => {
      if (err) {
        setPaying(false);
        const msg = err.details?.map((d) => d.message).join(', ') || err.message || 'Card tokenisation failed';
        setPayError(msg);
        return;
      }

      fetch(`/api/public/invoice/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transientToken,
          cardholderName: cardholderName.trim(),
          expMonth: options.expirationMonth,
          expYear: options.expirationYear,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            const detail = data.reason ? ` [${data.reason}]` : '';
            throw new Error(data.error + detail);
          }
          setSuccess(data);
          setInvoice((prev) => ({ ...prev, status: 'paid', paidAt: new Date().toISOString() }));
        })
        .catch((fetchErr) => setPayError(fetchErr.message))
        .finally(() => setPaying(false));
    });
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <Header />
          <h2 style={{ color: '#111827', marginBottom: 8 }}>Invoice not found</h2>
          <p style={{ color: '#6b7280' }}>
            This invoice link is invalid or has expired. Please contact ArabAltMed for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <Header />
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: 8, fontSize: 22 }}>Payment successful</h2>
            <p style={{ color: '#374151', marginBottom: 4 }}>
              Thank you, {invoice.clientName}. Your payment of{' '}
              <strong>${fmt(invoice.total)}</strong> has been received.
            </p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              Invoice {invoice.invoiceNumber} · Transaction ID: {success.transactionId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const payable = ['sent', 'overdue'].includes(invoice.status);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Header />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>
              Invoice {invoice.invoiceNumber}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              To: {invoice.clientName} &lt;{invoice.clientEmail}&gt;
            </p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          {invoice.issuedDate && (
            <div>
              <div style={labelStyle}>Issued</div>
              <div style={valueStyle}>{new Date(invoice.issuedDate).toLocaleDateString()}</div>
            </div>
          )}
          {invoice.dueDate && (
            <div>
              <div style={labelStyle}>Due</div>
              <div style={{ ...valueStyle, color: invoice.status === 'overdue' ? '#dc2626' : undefined }}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </div>
            </div>
          )}
          {invoice.paidAt && (
            <div>
              <div style={labelStyle}>Paid on</div>
              <div style={{ ...valueStyle, color: '#16a34a' }}>{new Date(invoice.paidAt).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 70 }}>Qty</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 110 }}>Unit Price</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={tdStyle}>{it.description}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(it.quantity)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>${fmt(it.unitPrice)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>${fmt(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginLeft: 'auto', width: 260, marginBottom: 28 }}>
          <div style={totRowStyle}>
            <span>Subtotal</span><span>${fmt(invoice.subtotal)}</span>
          </div>
          {Number(invoice.taxRate) > 0 && (
            <div style={totRowStyle}>
              <span>Tax ({Number(invoice.taxRate)}%)</span>
              <span>${fmt(invoice.taxAmount)}</span>
            </div>
          )}
          <div style={{ ...totRowStyle, fontWeight: 700, fontSize: 16, borderTop: '2px solid #e5e7eb', paddingTop: 8 }}>
            <span>Total (USD)</span><span>${fmt(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', marginBottom: 28, fontSize: 13, color: '#374151' }}>
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        {invoice.status === 'paid' && (
          <div style={{ background: '#dcfce7', borderRadius: 10, padding: '16px 20px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
            ✓ This invoice has been paid
          </div>
        )}

        {invoice.status === 'void' && (
          <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '16px 20px', textAlign: 'center', color: '#6b7280' }}>
            This invoice has been voided
          </div>
        )}

        {invoice.status === 'draft' && (
          <div style={{ background: '#fef3c7', borderRadius: 10, padding: '16px 20px', textAlign: 'center', color: '#92400e' }}>
            This invoice has not been sent yet and cannot be paid online
          </div>
        )}

        {payable && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 28 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17, color: '#111827' }}>
              Pay ${fmt(invoice.total)} USD
            </h3>

            {flexError && (
              <div style={errorBannerStyle}>{flexError}</div>
            )}

            {isSandbox && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                <strong>Sandbox mode</strong> — use a CyberSource test card (any future expiry):
                <table style={{ marginTop: 6, borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {[
                      ['Visa', '4111 1111 1111 1111', 'any'],
                      ['Visa', '4622 9431 2701 3705', '838'],
                      ['Visa', '4622 9431 2701 3721', '258'],
                      ['Mastercard', '5555 5555 5555 4444', 'any'],
                      ['Mastercard', '2222 4200 0000 1113', 'any'],
                      ['Amex', '3782 8224 6310 005', 'any'],
                      ['Discover', '6011 1111 1111 1117', 'any'],
                    ].map(([brand, num, cvv]) => (
                      <tr key={num}>
                        <td style={{ paddingRight: 8, color: '#78350f', width: 90 }}>{brand}</td>
                        <td style={{ fontFamily: 'monospace', paddingRight: 8 }}>{num}</td>
                        <td style={{ color: '#78350f' }}>CVV: {cvv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!flexError && (
              <form onSubmit={handlePay} noValidate>
                <div style={fieldGroupStyle}>
                  <label style={labelFormStyle}>Cardholder Name</label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Name on card"
                    style={{ ...inputStyle, borderColor: fieldErrors.cardholderName ? '#dc2626' : '#d1d5db' }}
                  />
                  {fieldErrors.cardholderName && <span style={fieldErrStyle}>{fieldErrors.cardholderName}</span>}
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelFormStyle}>Card Number</label>
                  <div
                    id="flex-number"
                    style={{
                      ...hostedFieldStyle,
                      borderColor: fieldErrors.number ? '#dc2626' : '#d1d5db',
                      opacity: payReady ? 1 : 0.5,
                    }}
                  />
                  {!payReady && !flexError && (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading secure card field…</span>
                  )}
                  {fieldErrors.number && <span style={fieldErrStyle}>{fieldErrors.number}</span>}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ ...fieldGroupStyle, flex: 1 }}>
                    <label style={labelFormStyle}>Expiry Month</label>
                    <select
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      style={{ ...inputStyle, borderColor: fieldErrors.expMonth ? '#dc2626' : '#d1d5db' }}
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = String(i + 1).padStart(2, '0');
                        return <option key={m} value={m}>{m}</option>;
                      })}
                    </select>
                    {fieldErrors.expMonth && <span style={fieldErrStyle}>{fieldErrors.expMonth}</span>}
                  </div>

                  <div style={{ ...fieldGroupStyle, flex: 1 }}>
                    <label style={labelFormStyle}>Expiry Year</label>
                    <select
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      style={{ ...inputStyle, borderColor: fieldErrors.expYear ? '#dc2626' : '#d1d5db' }}
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const y = new Date().getFullYear() + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                    {fieldErrors.expYear && <span style={fieldErrStyle}>{fieldErrors.expYear}</span>}
                  </div>

                  <div style={{ ...fieldGroupStyle, flex: 1 }}>
                    <label style={labelFormStyle}>Security Code</label>
                    <div
                      id="flex-cvv"
                      style={{
                        ...hostedFieldStyle,
                        borderColor: fieldErrors.cvv ? '#dc2626' : '#d1d5db',
                        opacity: payReady ? 1 : 0.5,
                      }}
                    />
                    {fieldErrors.cvv && <span style={fieldErrStyle}>{fieldErrors.cvv}</span>}
                  </div>
                </div>

                {payError && (
                  <div style={{ ...errorBannerStyle, marginTop: 8 }}>{payError}</div>
                )}

                <button
                  type="submit"
                  disabled={paying || !payReady}
                  style={{
                    marginTop: 20,
                    width: '100%',
                    padding: '13px 0',
                    background: paying || !payReady ? '#9ca3af' : '#1d4ed8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: paying || !payReady ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {paying ? 'Processing…' : `Pay $${fmt(invoice.total)} USD`}
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
                  Secured by CyberSource · Your card details are never sent to our servers
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8', letterSpacing: '-0.5px' }}>
        ArabAltMed
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
        payment.arabaltmed.com
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #eff6ff 0%, #f9fafb 100%)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 16px 60px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  padding: 36,
  width: '100%',
  maxWidth: 660,
};

const labelStyle = { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 };
const valueStyle = { fontSize: 14, color: '#111827', fontWeight: 500 };

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '10px 10px',
  fontSize: 14,
  color: '#374151',
  verticalAlign: 'top',
};

const totRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '5px 0',
  fontSize: 14,
  color: '#374151',
};

const fieldGroupStyle = { marginBottom: 16 };

const labelFormStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 5,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

const hostedFieldStyle = {
  height: 40,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  padding: '0 12px',
  background: '#fff',
  transition: 'border-color 0.15s',
};

const fieldErrStyle = { fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' };

const errorBannerStyle = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#dc2626',
  fontSize: 13,
};

const microformStyles = {
  input: {
    color: '#111827',
  },
  '::placeholder': { color: '#9ca3af' },
};
