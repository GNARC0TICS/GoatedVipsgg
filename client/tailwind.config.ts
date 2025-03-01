import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
        sans: ["system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#D7FF00",
          hover: "#C2E600",
          focus: "#B2D600",
        },
        background: {
          DEFAULT: "#14151A",
          card: "#1A1B21",
          hover: "#22232B",
        },
        border: {
          DEFAULT: "#2A2B31",
          hover: "#3A3B41",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#8A8B91",
        },
      },
      animation: {
        shine: "shine 2s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        shine: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "0 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
