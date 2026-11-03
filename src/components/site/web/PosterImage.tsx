import Image from "next/image";
import { cx } from "./ui";

// The thumbnail uploaded for a chapter or part, filling its poster. The poster must be positioned.
export function PosterImage({ src, sizes, className }: { src: string; sizes: string; className?: string }) {
  return <Image src={src} alt="" fill sizes={sizes} className={cx("object-cover", className)} />;
}
