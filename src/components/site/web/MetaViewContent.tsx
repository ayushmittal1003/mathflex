"use client";
import { useEffect } from "react";
import { metaTrack } from "@/lib/meta-pixel";

// Tells Meta a chapter or course page was viewed (used for retargeting and ad optimisation).
export function MetaViewContent({ id, name, value, kind }: { id: string; name: string; value: number; kind: "chapter" | "course" }) {
  useEffect(() => {
    // Wait a tick so the page change's PageView goes first.
    const t = setTimeout(() => metaTrack("ViewContent", { content_ids: [id], content_name: name, content_type: "product", content_category: kind, value, currency: "INR" }), 300);
    return () => clearTimeout(t);
  }, [id, name, value, kind]);
  return null;
}
