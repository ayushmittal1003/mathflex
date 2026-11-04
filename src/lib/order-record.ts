// What an order's stored Cashfree response tells us, for the admin record and its export.
export function orderPayment(order: { total: number; subtotal: number; discount: number; gatewayRaw: unknown }) {
  const raw = (order.gatewayRaw ?? null) as { cf_order_id?: string; order?: { cf_order_id?: string } | null; payment?: { payment_group?: string; bank_reference?: string } | null } | null;
  const group = raw?.payment?.payment_group;
  return {
    tax: Math.max(0, order.total - (order.subtotal - order.discount)),
    method: group ? group.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\bUpi\b/, "UPI") : null,
    cfOrderId: raw?.order?.cf_order_id ?? raw?.cf_order_id ?? null,
    bankReference: raw?.payment?.bank_reference ?? null,
  };
}
