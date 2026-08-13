/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Obsidian dark theme inspired palette
        bg: {
          DEFAULT: "#1e1e1e",
          soft: "#252525",
          softer: "#2a2a2a",
        },
        ink: {
          DEFAULT: "#dcddde",
          muted: "#a3a3a3",
          faint: "#6e6e6e",
        },
        accent: {
          DEFAULT: "#7f6df2",
          soft: "#a897ff",
        },
        border: {
          DEFAULT: "#3a3a3a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
