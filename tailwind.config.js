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
      'darkaccent': '#3488ac',
      'lightaccent': '#3488ac',
    },
    extend: {},
  },
  plugins: [],
}

