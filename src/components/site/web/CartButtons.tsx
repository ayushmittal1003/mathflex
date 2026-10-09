"use client";
import { useRouter } from "next/navigation";
import { cart, type CartItem } from "../cart-store";
import { useAddToCart } from "./useAddToCart";
import { button, cx, tone } from "./ui";

// "Buy now" adds to the existing cart and opens checkout; "Add to cart" toggles with a toast.
export function BuyNow({ item, className, size = "lg" }: { item: CartItem; className?: string; size?: keyof typeof button }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => { cart.add(item); router.push("/checkout"); }} className={cx(button[size], tone.primary, className)}>
      Buy now
    </button>
  );
}

export function AddToCartButton({ item, title, className, size = "lg" }: { item: CartItem; title: string; className?: string; size?: keyof typeof button }) {
  const { has, toggle } = useAddToCart();
  const inCart = has(item.id);
  return (
    <button
      type="button"
      onClick={() => toggle(item, title)}
      aria-pressed={inCart}
      className={cx(button[size], inCart ? "border border-ok/40 bg-ok/12 text-[oklch(0.5_0.16_149)]" : "border border-border bg-card text-foreground hover:brightness-97", className)}
    >
      {inCart ? "✓ In cart" : "Add to cart"}
    </button>
  );
}
