/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Wajib ditambahkan agar toggle berfungsi
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/react-tailwindcss-datepicker/dist/index.esm.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'], // Gunakan font yang clean
      }
    },
  },
  plugins: [],

}
