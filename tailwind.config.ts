import type { Config } from 'tailwindcss'
import rtl from 'tailwindcss-rtl'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#ec4899',
      },
    },
  },
  plugins: [rtl],
}
export default config
