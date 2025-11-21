/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "sz-bg": "#010412",        // deep dark background
        "sz-surface": "#010412",   // for cards / panels
        "sz-border": "#1e293b",
        "sz-accent": "#22c55e",    // light green primary
        "sz-accent-soft": "#16a34a",
      },
      boxShadow: {
        "sz-soft": "0 18px 45px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
