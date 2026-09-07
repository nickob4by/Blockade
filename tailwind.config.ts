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
          DEFAULT: "#2563eb", // Royal Sapphire Blue
          light: "#3b82f6",
          dark: "#1d4ed8",
        },
        player2: {
          DEFAULT: "#e11d48", // Coral Crimson
          light: "#f43f5e",
          dark: "#be123c",
        },
        wall: {
          DEFAULT: "#475569",
          hover: "#64748b",
          active: "#334155",
          invalid: "rgba(239, 68, 68, 0.7)",
        }
      },
      boxShadow: {
        'tactile-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'tactile-md': '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.35)',
        'tactile-p1': '0 4px 10px -2px rgba(37, 99, 235, 0.35)',
        'tactile-p2': '0 4px 10px -2px rgba(225, 29, 72, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config;
