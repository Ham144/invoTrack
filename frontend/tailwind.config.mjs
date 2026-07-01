/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        panel: "0 4px 24px -4px rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        bukti: {
          primary: "#4f46e5",
          "primary-content": "#ffffff",
          secondary: "#64748b",
          "secondary-content": "#ffffff",
          accent: "#0891b2",
          "accent-content": "#ffffff",
          neutral: "#1e293b",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          info: "#0ea5e9",
          "info-content": "#ffffff",
          success: "#059669",
          "success-content": "#ffffff",
          warning: "#d97706",
          "warning-content": "#ffffff",
          error: "#dc2626",
          "error-content": "#ffffff",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "0.375rem",
          "--animation-btn": "0.2s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
        },
      },
      "dark",
    ],
  },
};
