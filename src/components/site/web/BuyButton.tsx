"use client";
import { useRouter } from "next/navigation";
import { cart, type CartItem } from "../cart-store";

// Adds an item to the existing guest cart (ids only; prices are recomputed on the server)
// and opens the cart. Sign-in happens at payment, as before.
export function BuyButton({ item, className, children }: { item: CartItem; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        cart.add(item);
        router.push("/cart");
      }}
    >
      {children}
    </button>
  );
}
