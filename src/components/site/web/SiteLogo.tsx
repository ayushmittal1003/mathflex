/* eslint-disable @next/next/no-img-element -- small static brand PNG; next/image adds nothing here */

// Full Mathflex logo for the public website. Logo.tsx (shared with admin) stays untouched.
export function SiteLogo({ variant = "black", className = "h-[27px]" }: { variant?: "black" | "white"; className?: string }) {
  return (
    <img
      src={variant === "black" ? "/brand/mathflex-logo-black.png" : "/brand/mathflex-logo-white.png"}
      alt="Mathflex"
      width={3511}
      height={783}
      className={`block w-auto ${className}`}
    />
  );
}
