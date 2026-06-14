/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#f4480a",
          dark: "#d93d08",
          light: "#fef0eb"
        },
        accent: {
          DEFAULT: "#e8176a",
          light: "#fde8f2"
        },
        ink: "#1a0805",
        muted: "#7a5a52",
        line: "#f0e4df",
        surface: "#fdf8f4"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};