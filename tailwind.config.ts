import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        background: "var(--color-bg)",
        "bg-secondary": "var(--color-bg-secondary)",
        "bg-hover": "var(--color-bg-hover)",
        "bg-input": "var(--color-bg-input)",
        foreground: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        "border-hover": "var(--color-border-hover)",
        "border-focus": "var(--color-border-focus)",
        muted: "var(--color-bg-secondary)",
        "muted-foreground": "var(--color-text-secondary)",
      },
      boxShadow: {
        sm: "0 2px 8px var(--color-shadow)",
        DEFAULT: "0 2px 8px var(--color-shadow)",
        lg: "0 4px 12px var(--color-shadow-lg)",
      },
      fontFamily: {
        inter: ["var(--font-inter)"],
        reenie: ["var(--font-reenie)"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
