import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
    extend: {
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        heading: ["Mona Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        '2xl': "calc(var(--radius) + 8px)",
        'card': '12px',
      },
      spacing: {
        'xs': '0.25rem',    // 4px
        'sm': '0.5rem',     // 8px
        'md': '1rem',       // 16px
        'lg': '1.5rem',     // 24px
        'xl': '2rem',       // 32px
        '2xl': '3rem',      // 48px
        '3xl': '4rem',      // 64px
        '4xl': '6rem',      // 96px
        '5xl': '8rem',      // 128px
      },
      margin: {
        'section': '5rem',
        'component': '2.5rem',
        'element': '1.5rem',
      },
      padding: {
        'section-xs': '2rem',
        'section-sm': '3rem',
        'section-md': '4rem',
        'section-lg': '5rem',
        'section-xl': '6rem',
        'component-xs': '0.5rem',
        'component-sm': '1rem',
        'component-md': '1.5rem',
        'component-lg': '2rem',
        'component-xl': '2.5rem',
      },
      boxShadow: {
        'card': '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
        'tooltip': '0 5px 15px rgba(0, 0, 0, 0.5)',
        'button': '0 5px 15px rgba(215, 255, 0, 0.15)',
        'button-hover': '0 10px 25px rgba(215, 255, 0, 0.25)',
        'neon': '0 0 20px rgba(215, 255, 0, 0.5), 0 0 40px rgba(215, 255, 0, 0.3)',
        'mvp-card': '0 8px 20px -5px rgba(0, 0, 0, 0.3)',
        'mvp-card-hover': '0 12px 30px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--hover-border-color)',
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Custom brand colors
        brand: {
          dark: "#14151A",
          darker: "#0F1014",
          light: "#2A2B31",
          lighter: "#35363D",
          yellow: "#D7FF00",
          "yellow-dim": "rgba(215, 255, 0, 0.7)",
        },
        // MVP card theme colors
        mvp: {
          base: "#1A1B21",
          border: "#2A2B31",
          text: {
            DEFAULT: "#F5F5F5",
            muted: "#8A8B91",
          },
          daily: {
            primary: "#8B5CF6",
            accent: "#7C3AED",
            shine: "#A78BFA"
          },
          weekly: {
            primary: "#10B981",
            accent: "#059669",
            shine: "#34D399"
          },
          monthly: {
            primary: "#F59E0B",
            accent: "#D97706",
            shine: "#FBBF24"
          },
          alltime: {
            primary: "#EC4899",
            accent: "#DB2777",
            shine: "#F472B6"
          }
        }
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "1",
            boxShadow: "0 0 10px rgba(215, 255, 0, 0.8), 0 0 20px rgba(215, 255, 0, 0.5)"
          },
          "50%": { 
            opacity: "0.7",
            boxShadow: "0 0 15px rgba(215, 255, 0, 0.9), 0 0 30px rgba(215, 255, 0, 0.7)"
          },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(-100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.9)", opacity: "0" },
        },
        "rotate-logo": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-10deg)" },
          "75%": { transform: "rotate(10deg)" },
        },
        "bounce-light": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-in",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-in",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-in",
        "scale-in": "scale-in 0.3s ease-out",
        "scale-out": "scale-out 0.3s ease-in",
        "rotate-logo": "rotate-logo 20s linear infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "bounce-light": "bounce-light 2s ease-in-out infinite",
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      gridTemplateColumns: {
        'auto-fill-xs': 'repeat(auto-fill, minmax(160px, 1fr))',
        'auto-fill-sm': 'repeat(auto-fill, minmax(240px, 1fr))',
        'auto-fill-md': 'repeat(auto-fill, minmax(320px, 1fr))',
        'auto-fill-lg': 'repeat(auto-fill, minmax(384px, 1fr))',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
