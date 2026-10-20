import { ogCard, OG_SIZE } from "@/lib/seo/og";

export const alt = "MathFlex – JEE maths video courses, chapter by chapter";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ heading: "JEE Maths, chapter by chapter", sub: "Video lessons, practice and notes. Buy only what you need.", from: "#ef4444", to: "#f97316" });
}
