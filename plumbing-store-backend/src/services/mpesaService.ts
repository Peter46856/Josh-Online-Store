const BASE_URL = 'https://sandbox.safaricom.co.ke';

// Daraja expects timestamps in Kenya local time (UTC+3), not UTC
function getTimestamp(): string {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // shift to UTC+3
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error('Failed to authenticate with M-Pesa');
  }

  const data = await res.json();
  return data.access_token;
}

interface StkPushParams {
  phone: string;       // format: 2547XXXXXXXX
  amount: number;
  accountReference: string; // shown on the customer's phone, max 12 chars
  transactionDesc: string;
}

export async function initiateStkPush(params: StkPushParams) {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const password = Buffer.from(
    `${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(params.amount),
      PartyA: params.phone,
      PartyB: shortcode,
      PhoneNumber: params.phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.errorCode) {
    throw new Error(data.errorMessage || 'Failed to initiate M-Pesa payment');
  }

  return data; // contains CheckoutRequestID, MerchantRequestID
}

export async function queryStkStatus(checkoutRequestId: string) {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const password = Buffer.from(
    `${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  return res.json(); // contains ResultCode, ResultDesc
}