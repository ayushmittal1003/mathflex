// MathFlex mark: an "M" drawn as a rising graph that ends in an arrow, on a solid red tile
// (the same artwork as public/brand/mathflex-mark.svg). Used in the admin panel; the public
// site uses SiteLogo's PNG.
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * (783 / 806)} viewBox="0 0 806 783" className={className} aria-hidden>
      <rect width="806" height="783" rx="170" fill="#BF070C" />
      <g fill="none" stroke="#fff" strokeWidth="64.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M150 605.999V227.784L383.595 469.841L612.591 218.316" />
        <path d="M500.064 167H663.58V325.85" />
      </g>
    </svg>
  );
}

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Mathflex">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.62 }}>Mathflex</span>
    </span>
  );
}
