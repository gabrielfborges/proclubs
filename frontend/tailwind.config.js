/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          950: "#08090b",
          900: "#111214",
          800: "#1b1d21",
          700: "#2a2d33",
          600: "#3a3e46",
        },
        accent: {
          500: "#fdd501",
          400: "#ffe66d",
          600: "#d6b500",
        },
      },
    },
  },
  plugins: [],
};
