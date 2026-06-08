import type { Config } from "tailwindcss";

/**
 * Jellyboxd design system — purple, minimal, light/dark via CSS variables.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        purple: {
          50: "#faf7fd",
          100: "#f3ecfb",
          200: "#e7d9f7",
          300: "#d4b8ef",
          400: "#b794e4",
          500: "#9b6fd6",
          600: "#7c4fbf",
          700: "#653fa0",
          800: "#4f327d",
          900: "#3a255c",
          950: "#1f1433",
        },
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        "display-lg": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        display: ["clamp(2rem, 4vw, 3.25rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(140% 120% at 50% -10%, rgb(var(--accent) / 0.08) 0%, transparent 45%), radial-gradient(120% 100% at 100% 0%, rgb(var(--foreground) / 0.03) 0%, transparent 40%)",
        "fade-bottom":
          "linear-gradient(180deg, rgb(var(--background) / 0) 0%, rgb(var(--background) / 0.65) 60%, rgb(var(--background) / 0.98) 100%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease both",
        "rise-in": "rise-in 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
