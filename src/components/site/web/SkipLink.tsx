// First tab stop on every page: jumps past the nav to <main id="main">. Hidden until focused.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-background focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
