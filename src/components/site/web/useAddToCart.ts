"use client";
import { cart, useCart, type CartItem } from "../cart-store";
import { useToast } from "./Toast";

// Add/remove on the existing guest cart (ids only; prices are recomputed on the server)
// with the design's "Added X to cart · View cart" toast.
export function useAddToCart() {
  const items = useCart();
  const toast = useToast();
  const has = (id: string) => items.some((i) => i.id === id);
  const add = (item: CartItem, title: string) => {
    cart.add(item);
    const n = has(item.id) ? items.length : items.length + 1;
    toast(`Added ${title} to cart`, { label: `View cart · ${n}`, href: "/checkout" });
  };
  const toggle = (item: CartItem, title: string) => {
    if (has(item.id)) {
      cart.remove(item.id);
      toast(`Removed ${title} from cart`);
    } else add(item, title);
  };
  return { has, add, toggle, count: items.length };
}
