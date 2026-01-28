/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // For Next.js App Router (app directory)
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    
    // For src directory (if you have one)
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    
    // Include any other directories
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb))',
        foreground: 'rgb(var(--foreground-rgb))',
      },
    },
  },
  plugins: [],
}