import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#84cc16",
          dark: "#4d7c0f",
        },
        garden: {
          950: "#0b1710",
          900: "#102318",
          800: "#193522",
          300: "#bef264",
        },
      },
    },
  },
  plugins: [],
};

export default config;
