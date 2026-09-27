import "server-only";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PaytmChecksum = require("paytmchecksum") as {
  generateSignature(params: string | object, key: string): Promise<string>;
  verifySignature(params: string | object, key: string, checksum: string): boolean;
};

// Paytm "JS Checkout" flow:
// 1. server: initiateTransaction -> txnToken
// 2. browser: CheckoutJS opens the Paytm sheet with that token
// 3. Paytm POSTs the result to our callback; we verify the checksum AND
//    re-confirm with the Order Status API before granting access.

// Paytm has been moving gateway domains; PAYTM_HOST lets you follow their dashboard
// without a code change.
const host = () =>
  process.env.PAYTM_HOST ||
  (process.env.PAYTM_ENV === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in");

export function paytmConfigured() {
  return !!(process.env.PAYTM_MID && process.env.PAYTM_MERCHANT_KEY);
}

export function paytmScriptUrl() {
  return `${host()}/merchantpgpui/checkoutjs/merchants/${process.env.PAYTM_MID}.js`;
}

export async function initiateTransaction(p: { orderNo: string; amount: number; userId: string; callbackUrl: string }) {
  const mid = process.env.PAYTM_MID!;
  const body = {
    requestType: "Payment",
    mid,
    websiteName: process.env.PAYTM_WEBSITE || "WEBSTAGING",
    orderId: p.orderNo,
    callbackUrl: p.callbackUrl,
    txnAmount: { value: p.amount.toFixed(2), currency: "INR" },
    userInfo: { custId: p.userId },
  };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), process.env.PAYTM_MERCHANT_KEY!);
  const res = await fetch(`${host()}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${p.orderNo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, head: { signature } }),
  });
  const json = await res.json();
  if (json?.body?.resultInfo?.resultStatus !== "S") {
    throw new Error(json?.body?.resultInfo?.resultMsg || "Paytm initiate failed");
  }
  return { txnToken: json.body.txnToken as string, mid };
}

export function verifyCallback(fields: Record<string, string>) {
  const { CHECKSUMHASH, ...rest } = fields;
  if (!CHECKSUMHASH) return false;
  return PaytmChecksum.verifySignature(rest, process.env.PAYTM_MERCHANT_KEY!, CHECKSUMHASH);
}

// Source of truth for whether money actually moved.
export async function fetchOrderStatus(orderNo: string) {
  const body = { mid: process.env.PAYTM_MID!, orderId: orderNo };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), process.env.PAYTM_MERCHANT_KEY!);
  const res = await fetch(`${host()}/v3/order/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, head: { signature } }),
  });
  const json = await res.json();
  const b = json?.body ?? {};
  return {
    status: b.resultInfo?.resultStatus as "TXN_SUCCESS" | "TXN_FAILURE" | "PENDING" | undefined,
    amount: Number(b.txnAmount ?? 0),
    txnId: b.txnId as string | undefined,
    raw: json,
  };
}
