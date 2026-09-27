import { useId } from "react";

// MathFlex mark: an "M" drawn as a rising graph that ends in an arrow —
// maths + growth, in a play-button tile.
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF2E63" />
          <stop offset="1" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 47V22l15 16 18-20" />
        <path d="M37.5 18H48v10.5" />
      </g>
    </svg>
  );
}

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="MathFlex">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.62 }}>
        math<span className="text-gradient">flex</span>
      </span>
    </span>
  );
}
