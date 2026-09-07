import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        board: {
          dark: "#1e293b",
          light: "#334155",
          accent: "#0f172a",
          border: "#475569",
        },
        player1: {
          DEFAULT: "#38bdf8", // Sky blue
          glow: "rgba(56, 189, 248, 0.4)",
          dark: "#0284c7",
        },
        player2: {
          DEFAULT: "#f43f5e", // Rose red
          glow: "rgba(244, 63, 94, 0.4)",
          dark: "#e11d48",
        },
        wall: {
          DEFAULT: "#eab308", // Amber / wood
          hover: "rgba(234, 179, 8, 0.6)",
          active: "#ca8a04",
          invalid: "rgba(239, 68, 68, 0.7)",
        }
      },
      boxShadow: {
        'neon-p1': '0 0 15px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(56, 189, 248, 0.4)',
        'neon-p2': '0 0 15px rgba(244, 63, 94, 0.6), inset 0 0 10px rgba(244, 63, 94, 0.4)',
        'neon-wall': '0 0 12px rgba(234, 179, 8, 0.7)',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config;
