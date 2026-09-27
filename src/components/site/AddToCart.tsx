"use client";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { cart, useCart } from "./cart-store";

export function AddToCart({
  item,
  variant = "icon",
  className = "",
}: {
  item: { type: "CHAPTER" | "COURSE"; id: string };
  variant?: "icon" | "button" | "buy";
  className?: string;
}) {
  const inCart = useCart().some((i) => i.id === item.id);
  const router = useRouter();

  if (variant === "buy") {
    return (
      <button
        className={`btn btn-primary ${className}`}
        onClick={() => {
          cart.add(item);
          router.push("/cart");
        }}
      >
        <ShoppingBag className="size-5" /> Buy now
      </button>
    );
  }
  if (variant === "button") {
    return (
      <button className={`btn btn-ghost ${className}`} onClick={() => (inCart ? cart.remove(item.id) : cart.add(item))}>
        {inCart ? <Check className="size-5 text-ok" /> : <Plus className="size-5" />}
        {inCart ? "In cart" : "Add to cart"}
      </button>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (inCart) cart.remove(item.id);
        else cart.add(item);
      }}
      aria-label={inCart ? "Remove from cart" : "Add to cart"}
      className={`grid size-9 place-items-center rounded-full border-2 transition ${
        inCart ? "border-ok bg-ok text-white" : "border-white/60 bg-black/30 text-white hover:border-white"
      } ${className}`}
    >
      {inCart ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
    </button>
  );
}
