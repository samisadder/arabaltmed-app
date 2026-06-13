import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const CybSdk = require(path.resolve(__dirname, '../../src/index.js'));

function getMerchantConfig() {
  return {
    authenticationType: 'http_signature',
    runEnvironment:
      process.env.CYBERSOURCE_RUN_ENVIRONMENT || 'apitest.cybersource.com',
    merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
    merchantKeyId: process.env.CYBERSOURCE_API_KEY_ID,
    merchantsecretKey: process.env.CYBERSOURCE_SECRET_KEY,
    logConfiguration: {
      enableLog: false,
    },
  };
}

export function isCyberSourceConfigured() {
  return !!(
    process.env.CYBERSOURCE_MERCHANT_ID &&
    process.env.CYBERSOURCE_API_KEY_ID &&
    process.env.CYBERSOURCE_SECRET_KEY
  );
}

function callAsync(fn) {
  return new Promise((resolve, reject) => {
    try {
      fn((error, data, response) => {
        if (error) reject(error);
        else resolve({ data, response });
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateCaptureContext(targetOrigin) {
  const config = getMerchantConfig();
  const api = new CybSdk.MicroformIntegrationApi(config);

  const request = {
    clientVersion: 'v2',
    targetOrigins: [targetOrigin],
    allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
  };

  const { data } = await callAsync((cb) =>
    api.generateCaptureContext(request, cb)
  );
  return data;
}

export async function processPayment({
  invoice,
  transientToken,
  cardholderName,
  expMonth,
  expYear,
}) {
  const config = getMerchantConfig();
  const api = new CybSdk.PaymentsApi(config);

  const nameParts = (cardholderName || 'Card Holder').trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Customer';

  const request = {
    clientReferenceInformation: {
      code: invoice.invoice_number,
    },
    processingInformation: {
      capture: true,
    },
    orderInformation: {
      amountDetails: {
        totalAmount: String(Number(invoice.total_amount).toFixed(2)),
        currency: 'USD',
      },
      billTo: {
        firstName,
        lastName,
        email: invoice.client_email,
        address1: '.',
        locality: '.',
        administrativeArea: 'NA',
        postalCode: '00000',
        country: process.env.CYBERSOURCE_DEFAULT_COUNTRY || 'US',
      },
    },
    tokenInformation: {
      transientTokenJwt: transientToken,
    },
  };

  const { data, response } = await callAsync((cb) =>
    api.createPayment(request, cb)
  );
  return { data, response };
}
