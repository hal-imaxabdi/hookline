/**
 * Hookline Design Tokens
 *
 * Color palette derived from the Hookline design mockups.
 * Dark theme with purple/blue accents. Glassmorphism surfaces.
 * Professional SOC analyst aesthetic — no neon hacker styles.
 */

export const colors = {
  // ── Background Layers ────────────────────────────────────────────────
  bg: {
    base: "#0D0E14",        // Deepest background
    surface: "#13141C",     // Cards, panels
    elevated: "#1A1B26",    // Floating elements, hover states
    glass: "rgba(255,255,255,0.04)", // Glassmorphism fill
    glassBorder: "rgba(255,255,255,0.08)", // Glassmorphism border
  },

  // ── Brand ────────────────────────────────────────────────────────────
  brand: {
    purple: "#7C5CFC",      // Primary accent (logo, active tabs)
    purpleLight: "#9B7FF8", // Hover states
    blue: "#4B8BF5",        // Secondary accent
    blueLight: "#6FA3F7",   // Hover
  },

  // ── Risk Colors ──────────────────────────────────────────────────────
  risk: {
    high: "#E85454",        // High risk red
    highBg: "rgba(232,84,84,0.12)",
    highBorder: "rgba(232,84,84,0.25)",
    medium: "#E8A54A",      // Suspicious orange/amber
    mediumBg: "rgba(232,165,74,0.12)",
    mediumBorder: "rgba(232,165,74,0.25)",
    low: "#4CAF82",         // Safe green
    lowBg: "rgba(76,175,130,0.12)",
    lowBorder: "rgba(76,175,130,0.25)",
  },

  // ── Status ───────────────────────────────────────────────────────────
  status: {
    failed: "#E85454",
    missing: "#E8A54A",
    pass: "#4CAF82",
    unknown: "#6B7280",
  },

  // ── Text ─────────────────────────────────────────────────────────────
  text: {
    primary: "#F0F1F5",     // Main content
    secondary: "#9CA3AF",   // Labels, metadata
    muted: "#6B7280",       // Placeholders, disabled
    inverse: "#0D0E14",     // Text on colored backgrounds
  },

  // ── Border ───────────────────────────────────────────────────────────
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.16)",
  },
} as const;

export const typography = {
  fontFamily: {
    // Inter for UI text — clean, professional, readable at small sizes
    ui: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // JetBrains Mono for domains, hashes, technical values
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },

  size: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "22px",
    "3xl": "28px",
  },

  weight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
} as const;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

// ── Risk Level Display Config ─────────────────────────────────────────────

export const riskConfig = {
  high_risk: {
    label: "HIGH RISK",
    sublabel: "Likely phishing attempt",
    color: colors.risk.high,
    bg: colors.risk.highBg,
    border: colors.risk.highBorder,
    iconColor: colors.risk.high,
  },
  suspicious: {
    label: "SUSPICIOUS",
    sublabel: "Multiple risk indicators",
    color: colors.risk.medium,
    bg: colors.risk.mediumBg,
    border: colors.risk.mediumBorder,
    iconColor: colors.risk.medium,
  },
  safe: {
    label: "SAFE",
    sublabel: "No significant threats detected",
    color: colors.risk.low,
    bg: colors.risk.lowBg,
    border: colors.risk.lowBorder,
    iconColor: colors.risk.low,
  },
  pending: {
    label: "ANALYZING",
    sublabel: "Processing...",
    color: colors.brand.blue,
    bg: "rgba(75,139,245,0.10)",
    border: "rgba(75,139,245,0.20)",
    iconColor: colors.brand.blue,
  },
  unknown: {
    label: "UNKNOWN",
    sublabel: "Could not analyze",
    color: colors.text.muted,
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.20)",
    iconColor: colors.text.muted,
  },
} as const;
