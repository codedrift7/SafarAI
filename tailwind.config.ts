import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "karakoram-ink": "#12232B",
        "attabad-turquoise": "#1C8299",
        "truck-art-marigold": "#F2A93B",
        "rickshaw-magenta": "#D6336C",
        meadow: "#3E7C58",
        "sandstone-mist": "#F1ECDF",
        "alert-red": "#C0392B",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "route-card": "0 18px 38px rgba(18, 35, 43, 0.12)",
      },
      keyframes: {
        "draw-line": { "0%": { strokeDashoffset: "1000" }, "100%": { strokeDashoffset: "0" } },
        "rise-in": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "draw-line": "draw-line 1.4s ease-out forwards",
        "rise-in": "rise-in .45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
