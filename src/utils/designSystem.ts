/**
 * Tokens from DESIGN.md — "The Precision Naturalist" (charcoal + emerald).
 * Use for auth/profile screens and dark surfaces; global `theme.ts` stays for legacy light usage.
 */
export const Design = {
  surface: "#131313",
  primary: "#6EE591",
  primaryContainer: "#50C878",
  secondary: "#C8C6C5",
  onSurfaceVariant: "#BDCABC",
  display: "#E5E2E1",
  surfaceContainerLow: "#1A1A1A",
  surfaceContainer: "#1E1E1E",
  surfaceContainerHigh: "#2A2A2A",
  surfaceContainerHighest: "#353534",
  /** Ghost border when needed for a11y (~15% white) */
  outlineVariant: "rgba(255,255,255,0.12)",
  onPrimary: "#0A0A0A",
  errorSoft: "rgba(255,149,135,0.95)",
} as const;
