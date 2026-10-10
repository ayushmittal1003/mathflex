/* eslint-disable @next/next/no-img-element -- small static brand PNG; next/image adds nothing here */

// Full Mathflex logo for the public website. The -520 PNGs are 520px-wide copies of the
// originals (3511px, ~60 KB); the logo is never shown wider than ~130px, so these are ~4x. Logo.tsx (shared with admin) stays untouched.
export function SiteLogo({ variant = "black", className = "h-[27px]" }: { variant?: "black" | "white"; className?: string }) {
  return (
    <img
      src={variant === "black" ? "/brand/mathflex-logo-black-520.png" : "/brand/mathflex-logo-white-520.png"}
      alt="Mathflex"
      width={520}
      height={116}
      className={`block w-auto ${className}`}
    />
  );
}
