// Class recipes for the redesigned website (dipankar-design/design.md §4 "Buttons").
// Plain Tailwind on tokens so they never collide with the shared btn/btn-* utilities that
// admin uses.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition duration-200 ease-mf " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const button = {
  lg: `${base} px-6 py-3.5 text-base`,
  md: `${base} px-4.5 py-3 text-[15px]`,
  sm: `${base} px-4 py-2.5 text-sm`,
};

export const tone = {
  primary: "bg-primary text-primary-foreground shadow-cta hover:brightness-108",
  primaryFlat: "bg-primary text-primary-foreground hover:brightness-108",
  dark: "bg-foreground text-card hover:brightness-130",
  secondary: "border border-border bg-secondary text-secondary-foreground hover:brightness-97",
  white: "bg-card text-foreground hover:brightness-97",
  // Secondary button sitting on the hero wash.
  glass: "border border-white/95 bg-white/70 text-foreground hover:bg-card",
};

// Page widths (design.md §3.7).
export const container = {
  listing: "mx-auto w-[min(1240px,calc(100%-48px))]",
  detail: "mx-auto w-[min(1120px,calc(100%-48px))]",
  text: "mx-auto w-[min(1000px,calc(100%-48px))]",
};
