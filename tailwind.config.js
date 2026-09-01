/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          // navy profundo — fundo do dark mode e superfícies
          950: '#0b1220',
          900: '#0f1729',
          800: '#182338',
          700: '#233149',
        },
        brand: {
          50: '#eaf1ff',
          100: '#d5e3ff',
          200: '#adc7ff',
          300: '#7ea3ff',
          400: '#4f7dff',
          500: '#2d6bff', // azul-tinta — acento da marca
          600: '#1f52e0',
          700: '#1a41b8',
          800: '#183a94',
          900: '#173573',
        },
        money: '#0fa968',   // entradas
        coral: '#f26b5e',   // saídas
        amber: '#e8a33d',   // pendências
        canvas: '#f7f8fb',  // fundo claro
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,23,41,0.04), 0 8px 24px -12px rgba(16,23,41,0.12)',
      },
    },
  },
  plugins: [],
}
