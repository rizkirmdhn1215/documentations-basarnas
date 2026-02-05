/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf4e9",
        ink: "#10232b",
        tide: "#147a89",
        amber: "#d9992f"
      }
    }
  },
  plugins: []
};
