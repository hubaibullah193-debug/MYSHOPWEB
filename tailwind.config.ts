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
        primary: '#0A3D2F',
        secondary: '#D16B46',
        neutral: '#F7F0E7',
        support: '#6B8A6B',
        text: '#212121',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['60px', { lineHeight: '1.1' }],
        h2: ['48px', { lineHeight: '1.15' }],
        h3: ['36px', { lineHeight: '1.2' }],
        body: ['16px', { lineHeight: '1.7' }],
        small: ['14px', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [rtl],
}
export default config
