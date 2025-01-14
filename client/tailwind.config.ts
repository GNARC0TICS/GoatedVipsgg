
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Mona Sans", "system-ui", "sans-serif"],
        body: ["Geist Mono", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
