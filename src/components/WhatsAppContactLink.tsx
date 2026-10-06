'use client'

import Link from 'next/link'
import { whatsappLink } from '@/lib/business-config'

/**
 * WhatsApp click-to-chat link with a message prefilled. Falls back to the
 * contact page when no shop WhatsApp number is configured.
 */
export default function WhatsAppContactLink({
  message,
  className,
  children,
}: {
  message?: string
  className?: string
  children: React.ReactNode
}) {
  const href = whatsappLink(message ?? 'Asalaam-o-Alaikum, I have a question about my order.')

  if (!href) {
    return (
      <Link href="/shop/contact" className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}