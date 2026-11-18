/**
 * Tailwind supplies the base reset (preflight) for the side panel.
 * Colours, type and spacing live as CSS variables in src/sidebar/sidebar.css,
 * shared with the web demo, so no theme is defined here.
 * @type {import("tailwindcss").Config}
 */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./public/**/*.html"],
  theme: { extend: {} },
  plugins: [],
};
