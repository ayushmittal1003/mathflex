// Server Components render once per request, so reading the clock there is safe.
// Keeping it behind a helper makes that intent explicit (and satisfies react-hooks/purity).
export const requestNow = () => Date.now();
