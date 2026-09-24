// Shared by the compass's server page and client component. Lives outside the
// "use client" module: a constant imported from a client module into a server
// component arrives as a client reference, not a number.
export const MIN_ANSWERS = 5;
export const MIN_COVERAGE = 0.6; // below this share of the answered statements a list is shown dimmed
