/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Add full slate and gray palettes for utilities like border-slate-200 and border-gray-200
        slate: colors.slate,
        gray: colors.gray,
      },
      borderColor: theme => ({
        ...theme('colors'),
      }),
    },
  },
  plugins: [],
  corePlugins: {
    // Ensure border color utilities are generated for custom colors like slate-200
    borderColor: true,
  },
  safelist: [
    {
      pattern: /border-(slate|gray)-200/,
    },
  ],
};
