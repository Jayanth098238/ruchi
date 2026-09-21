module.exports = {
  darkMode: 'class', // Enable dark mode via class
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist specific classes to ensure they are present in static exports
  safelist: [
    // Gray colors we're using
    'bg-gray-50', 'bg-gray-100', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900',
    'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800',
    'border-gray-100', 'border-gray-200', 'border-gray-500', 'border-gray-600', 'border-gray-700', 'border-gray-800',
    'hover:bg-gray-600', 'hover:bg-gray-700', 'hover:bg-gray-800',
    'hover:text-gray-300', 'hover:text-gray-500', 'hover:text-gray-800',
    'focus:ring-gray-500', 'focus:border-gray-500',
    // Dark mode gray variants
    'dark:bg-gray-500', 'dark:bg-gray-600', 'dark:bg-gray-700', 'dark:bg-gray-800', 'dark:bg-gray-900',
    'dark:text-gray-100', 'dark:text-gray-200', 'dark:text-gray-300', 'dark:text-gray-400', 'dark:text-gray-500',
    'dark:border-gray-600', 'dark:border-gray-700', 'dark:border-gray-800',
    'dark:hover:bg-gray-600', 'dark:hover:bg-gray-700', 'dark:hover:text-gray-300',
    // Other dark mode classes we use
    'dark:bg-black', 'dark:bg-gray-800', 'dark:bg-gray-900',
    'dark:text-white', 'dark:text-gray-100', 'dark:text-gray-200', 'dark:text-gray-300', 'dark:text-gray-400',
    'dark:border-gray-600', 'dark:border-gray-700', 'dark:border-gray-800',
  ],

  theme: {
    extend: {
      colors: {
        gray: {
          50:  'rgb(245, 246, 248)',
          100: 'rgb(236, 237, 239)',
          200: 'rgb(220, 222, 225)',
          300: 'rgb(200, 203, 207)',
          400: 'rgb(122, 126, 132)',
          500: 'rgb(30, 31, 33)',
          600: 'rgb(30, 31, 33)',
          700: 'rgb(26, 27, 29)',
          800: 'rgb(22, 23, 25)',
          900: 'rgb(18, 19, 20)',
          950: 'rgb(12, 13, 14)'
        }
      }
    }
  },
  plugins: [],
}