import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["GeistMono-Regular", "monospace"],
        sans: ["system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#D7FF00",
          hover: "#C6ED00",
          active: "#B8DC00",
          focus: "#D7FF00",
          muted: "rgba(215, 255, 0, 0.1)",
        },
        background: {
          DEFAULT: "#14151A",
          alt: "#1A1B21",
          card: "#1E1F25",
          overlay: "rgba(20, 21, 26, 0.8)",
        },
        html: {
          DEFAULT: "#14151A",
        },
        border: {
          DEFAULT: "#2A2B31",
          light: "rgba(42, 43, 49, 0.5)",
          hover: "#3A3B41",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#8A8B91",
          muted: "#5A5B61",
          accent: "#D7FF00",
        },
      },
      boxShadow: {
        card: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
        neon: "0 0 10px rgba(215, 255, 0, 0.3), 0 0 20px rgba(215, 255, 0, 0.1)",
        "neon-strong":
          "0 0 15px rgba(215, 255, 0, 0.5), 0 0 30px rgba(215, 255, 0, 0.3)",
        glass:
          "0 4px 20px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 5s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        wiggle: "wiggle 2s ease-in-out infinite",
        "spin-slow": "spin 6s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": {
            boxShadow:
              "0 0 5px rgba(215, 255, 0, 0.3), 0 0 10px rgba(215, 255, 0, 0.1)",
          },
          "100%": {
            boxShadow:
              "0 0 10px rgba(215, 255, 0, 0.5), 0 0 20px rgba(215, 255, 0, 0.3)",
          },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-neon":
          "linear-gradient(to bottom right, rgba(215, 255, 0, 0.3), rgba(215, 255, 0, 0))",
        "diagonal-lines":
          "repeating-linear-gradient(45deg, var(--tw-gradient-from) 0, var(--tw-gradient-from) 1px, transparent 0, transparent 50%)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      transitionDuration: {
        "2000": "2000ms",
        "3000": "3000ms",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderWidth: {
        "3": "3px",
      },
      zIndex: {
        "60": "60",
        "70": "70",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        ".fill-animation": {
          position: "relative",
          color: "#14151A",
          backgroundColor: "#D7FF00",
          overflow: "hidden",
          zIndex: "1",
          transition:
            "color 0.3s ease-in-out, background-color 0.3s ease-in-out",
        },
        ".fill-animation::before": {
          content: '""',
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "#14151A",
          transform: "scaleX(0)",
          transformOrigin: "right",
          transition: "transform 0.45s ease-in-out",
          zIndex: "-1",
        },
        ".fill-animation:hover": {
          color: "#D7FF00",
        },
        ".fill-animation:hover::before": {
          transform: "scaleX(1)",
          transformOrigin: "left",
        },
        ".group-hover-item:hover .group-item": {
          opacity: "0.7",
          transition: "opacity 0.3s ease",
        },
        ".group-hover-item .group-item:hover": {
          opacity: "1",
        },
        ".clip-text": {
          backgroundClip: "text",
          "-webkit-background-clip": "text",
          color: "transparent",
        },
        ".glassmorphism": {
          backgroundColor: "rgba(26, 27, 33, 0.7)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(42, 43, 49, 0.5)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;
