/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0b0f14",
          900: "#0f151c",
          800: "#161d27",
          700: "#212b38",
          600: "#2c3947",
        },
        accent: {
          500: "#22c55e",
          400: "#4ade80",
          600: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};
