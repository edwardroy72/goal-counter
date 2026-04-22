/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update this to match your folder structure
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // Scans everything in your 'app' folder
    "./components/**/*.{js,jsx,ts,tsx}", // Scans your 'components' folder
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        app: {
          dark: {
            base: "#101012",
            surface: "#1d1d20",
          },
        },
      },
      borderRadius: {
        "history-entry": "0.8rem",
        surface: "1.5rem",
      },
    },
  },
  plugins: [],
};
