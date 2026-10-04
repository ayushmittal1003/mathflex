import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cashfree Payment Gateway (web checkout), per https://www.cashfree.com/docs/
// 1. server: create a Cashfree order with our order number, get a payment_session_id
// 2. browser: the official JS SDK opens checkout with that session id
// 3. Cashfree redirects back and calls our webhook; both paths re-fetch the order
//    from Cashfree's API before anything is unlocked. Nothing trusts the browser.
// CASHFREE_APP_ID / CASHFREE_SECRET_KEY are only ever read here, on the server.

const API_VERSION = "2026-01-01";

// Cashfree's dashboard calls these "Client ID" / "Client Secret"; accept those names too.
const clientId = () => (process.env.CASHFREE_APP_ID ?? process.env.CASHFREE_CLIENT_ID)?.trim();
const clientSecret = () => (process.env.CASHFREE_SECRET_KEY ?? process.env.CASHFREE_CLIENT_SECRET)?.trim();

export type CashfreeMode = "sandbox" | "production";
export const cashfreeMode = (): CashfreeMode => (process.env.CASHFREE_ENV?.trim().toLowerCase() === "production" ? "production" : "sandbox");
const baseUrl = () => (cashfreeMode() === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");

export function cashfreeConfigured() {
  return !!(clientId() && clientSecret());
}

export class CashfreeError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST", path: string, ref: string, body?: unknown): Promise<T> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        "x-api-version": API_VERSION,
        "x-client-id": clientId()!,
        "x-client-secret": clientSecret()!,
        "x-request-id": ref,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (e) {
    console.error(`[cashfree] ${method} ${path} network error (${ref}):`, (e as Error).message);
    throw new CashfreeError("Couldn't reach Cashfree", 0);
  }
  const json = (await res.json().catch(() => ({}))) as { message?: string; code?: string; type?: string };
  if (!res.ok) {
    // Cashfree error bodies carry message/code/type only, never credentials.
    console.error(`[cashfree] ${method} ${path} → ${res.status} (${ref}) ${json.type ?? ""} ${json.code ?? ""}: ${json.message ?? "no message"}`);
    throw new CashfreeError(json.message ?? `Cashfree error ${res.status}`, res.status, json.code);
  }
  console.info(`[cashfree] ${method} ${path} → ${res.status} (${ref}) in ${Date.now() - started}ms`);
  return json as T;
}

export type CashfreeOrder = {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
  payment_session_id: string;
};

export async function createCashfreeOrder(input: {
  orderNo: string;
  amount: number; // rupees, already computed server-side from the database
  customer: { id: string; phone: string; email: string; name: string };
  returnUrl: string;
  notifyUrl: string | null;
}) {
  const order = await call<CashfreeOrder>("POST", "/orders", input.orderNo, {
    order_id: input.orderNo,
    order_amount: input.amount,
    order_currency: "INR",
    customer_details: {
      customer_id: input.customer.id,
      customer_phone: input.customer.phone,
      customer_email: input.customer.email,
      ...(input.customer.name.length >= 3 ? { customer_name: input.customer.name.slice(0, 100) } : {}),
    },
    order_meta: { return_url: input.returnUrl, ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}) },
    order_note: "MathFlex purchase",
  });
  return { paymentSessionId: order.payment_session_id, cfOrderId: order.cf_order_id };
}

export function getCashfreeOrder(orderNo: string) {
  return call<CashfreeOrder>("GET", `/orders/${encodeURIComponent(orderNo)}`, orderNo);
}

export type CashfreePayment = { cf_payment_id: string | number; payment_status: string; payment_amount: number; payment_group?: string; payment_time?: string };

export function getCashfreePayments(orderNo: string) {
  return call<CashfreePayment[]>("GET", `/orders/${encodeURIComponent(orderNo)}/payments`, orderNo);
}

// Webhook signature: base64(HMAC-SHA256(timestamp + rawBody, secret key)).
export function verifyCashfreeWebhook(rawBody: string, timestamp: string | null, signature: string | null) {
  if (!timestamp || !signature || !clientSecret()) return false;
  const expected = createHmac("sha256", clientSecret()).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
