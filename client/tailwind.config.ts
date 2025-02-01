import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Mona Sans", "system-ui", "sans-serif"],
        sans: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
