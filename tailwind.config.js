/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update this to match your folder structure
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // Scans everything in your 'app' folder
    "./components/**/*.{js,jsx,ts,tsx}", // Scans your 'components' folder
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
