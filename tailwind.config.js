/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Wajib ditambahkan agar toggle berfungsi
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'], // Gunakan font yang clean
      }
    },
  },
  plugins: [],

}
