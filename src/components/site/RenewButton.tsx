"use client";
import { useRouter } from "next/navigation";
import { cart } from "./cart-store";

export function RenewButton({ type, id }: { type: "CHAPTER" | "COURSE"; id: string }) {
  const router = useRouter();
  return (
    <button onClick={() => { cart.add({ type, id }); router.push("/cart"); }} className="btn btn-ghost !px-3 !py-1.5 text-sm">
      Renew
    </button>
  );
}
