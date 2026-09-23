import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hubaib One Stop Shop',
  description: 'Your one-stop shop for everything',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
