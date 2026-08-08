import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Quét cả thư mục gốc và thư mục src (tránh bỏ sót nếu file nằm ngoài src)
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: colors.slate,
        gray: colors.gray,
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /border-(slate|gray)-200/,
    },
  ],
};