/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bgp: "#09090b",
        bgs: "#141416",
        bgt: "#1f1f22",
        bgo: "#f4f4f5",
        accent: "#FF0000",
        accenth: "#CC0000",
        accentl: "#FF5252",
        txts: "#a1a1aa",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
