/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
        panel: "0 10px 30px -10px rgb(15 23 42 / 0.1)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        bukti: {
          primary: "#2563eb",
          "primary-content": "#ffffff",
          secondary: "#64748b",
          "secondary-content": "#ffffff",
          accent: "#38bdf8",
          "accent-content": "#ffffff",
          neutral: "#0f172a",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          info: "#3b82f6",
          "info-content": "#ffffff",
          success: "#10b981",
          "success-content": "#ffffff",
          warning: "#f59e0b",
          "warning-content": "#ffffff",
          error: "#ef4444",
          "error-content": "#ffffff",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "9999px",
          "--animation-btn": "0.15s",
          "--animation-input": "0.15s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
        },
      },
      "dark",
    ],
  },
};
