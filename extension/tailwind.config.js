/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        // ── Hookline Brand ─────────────────────────────────────────────
        brand: {
          purple: "#7C5CFC",
          "purple-light": "#9B7FF8",
          blue: "#4B8BF5",
          "blue-light": "#6FA3F7",
        },
        // ── Backgrounds ───────────────────────────────────────────────
        bg: {
          base: "#0D0E14",
          surface: "#13141C",
          elevated: "#1A1B26",
        },
        // ── Risk ──────────────────────────────────────────────────────
        risk: {
          high: "#E85454",
          medium: "#E8A54A",
          low: "#4CAF82",
        },
        // ── Text ──────────────────────────────────────────────────────
        content: {
          primary: "#F0F1F5",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        ui: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
        sm: "12px",
        base: "13px",
        md: "14px",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
