import nodemailer from 'nodemailer';

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export function isSMTPConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }
  const from = process.env.SMTP_FROM || `"ArabAltMed Billing" <${process.env.SMTP_USER}>`;
  const info = await transport.sendMail({ from, to, subject, html });
  return info;
}

export function buildInvoiceEmail({ invoice, items, publicUrl }) {
  const dueDateStr = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : 'No due date';

  const itemRows = items.map(it => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#374151;">${it.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#374151;text-align:right;">${parseFloat(it.quantity)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#374151;text-align:right;">$${parseFloat(it.unit_price).toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#374151;text-align:right;font-weight:600;">$${parseFloat(it.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const taxRow = parseFloat(invoice.tax_rate) > 0 ? `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">Tax (${invoice.tax_rate}%)</td>
      <td style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">$${parseFloat(invoice.tax_amount).toFixed(2)}</td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#f1f5f9;">ArabAltMed</p>
              <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Invoice Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px;">

              <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0f172a;">
                Invoice ${invoice.invoice_number}
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">
                Due: <strong style="color:#0f172a;">${dueDateStr}</strong>
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Hi <strong>${invoice.client_name}</strong>,<br>
                Please find your invoice below. You can view and pay it securely online.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#2563eb;border-radius:8px;">
                    <a href="${publicUrl}" target="_blank"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      View &amp; Pay Invoice →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:0;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1.5px solid #e2e8f0;">Description</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1.5px solid #e2e8f0;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1.5px solid #e2e8f0;">Price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1.5px solid #e2e8f0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                  <tr>
                    <td colspan="3" style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">Subtotal</td>
                    <td style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">$${parseFloat(invoice.subtotal).toFixed(2)}</td>
                  </tr>
                  ${taxRow}
                  <tr style="background:#f8fafc;">
                    <td colspan="3" style="padding:12px;text-align:right;font-size:16px;font-weight:700;color:#0f172a;border-top:1.5px solid #e2e8f0;">Total Due (USD)</td>
                    <td style="padding:12px;text-align:right;font-size:16px;font-weight:700;color:#0f172a;border-top:1.5px solid #e2e8f0;">$${parseFloat(invoice.total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              ${invoice.notes ? `
              <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;">Notes</p>
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${invoice.notes.replace(/\n/g, '<br>')}</p>
              </div>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                This invoice was sent by ArabAltMed. If you have questions, reply to this email.
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#cbd5e1;">
                <a href="${publicUrl}" style="color:#2563eb;text-decoration:none;">
                  ${publicUrl}
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
