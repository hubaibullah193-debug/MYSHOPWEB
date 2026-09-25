'use client'

import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ur', label: 'اردو' },
  ]

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => {
            i18n.changeLanguage(lang.code)
            document.documentElement.lang = lang.code
            document.documentElement.dir = lang.code === 'ur' ? 'rtl' : 'ltr'
          }}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            i18n.language === lang.code
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
