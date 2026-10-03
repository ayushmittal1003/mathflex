// The official SDK ships without types; this covers the parts MathFlex uses.
declare module "@cashfreepayments/cashfree-js" {
  export type CheckoutResult = { error?: { message: string; code?: string }; redirect?: boolean; paymentDetails?: { paymentMessage: string } };
  export type Cashfree = {
    checkout(options: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement }): Promise<CheckoutResult>;
  };
  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree | null>;
}
