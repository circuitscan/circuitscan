const colors = require('tailwindcss/colors');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      ...colors,
      'darkbg': '#080717',
      'lightbg': '#f9f6ea',
      'darkaccent': '#fc5ce9',
      'lightaccent': '#06a01c',
    },
    extend: {},
  },
  plugins: [],
}

