'use client'

import { useEffect, useState } from 'react'
import i18n from '@/i18n.config'
import { I18nextProvider } from 'react-i18next'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!i18n.isInitialized) {
      i18n.init()
    }
    setReady(true)
  }, [])

  if (!ready) return children

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
