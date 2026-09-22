/**
 * Shared handle to the hover-label element. The DOM node is rendered by
 * React in the overlay (so it can be styled and read by a11y tools), but
 * its transform is written imperatively from inside useFrame — no React
 * state changes at 60fps.
 */
export const labelHost: { el: HTMLDivElement | null } = { el: null };
