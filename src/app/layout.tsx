import type { Metadata } from 'next'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'

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
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
