/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark': '#0f0f0f',
        'darker': '#0a0a0a',
        'light': '#f8f8f8',
        'accent': '#d4af37', // muted gold
        'accent-alt': '#00bcd4', // soft cyan
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Lato', 'sans-serif'],
      },
      animation: {
        'grain': 'grain 8s steps(10) infinite',
      },
      keyframes: {
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-10%, 5%)' },
          '30%': { transform: 'translate(5%, -5%)' },
          '40%': { transform: 'translate(-5%, 10%)' },
          '50%': { transform: 'translate(-10%, 0)' },
          '60%': { transform: 'translate(5%, 0)' },
          '70%': { transform: 'translate(-5%, 5%)' },
          '80%': { transform: 'translate(-10%, -10%)' },
          '90%': { transform: 'translate(5%, 5%)' },
        }
      }
    },
  },
  plugins: [],
}