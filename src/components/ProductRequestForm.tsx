'use client'

import { useState } from 'react'
import { submitProductRequest } from '@/lib/product-requests'

export default function ProductRequestForm({ productName }: { productName: string }) {
  const [customerName, setCustomerName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await submitProductRequest({
        customer_name: customerName,
        whatsapp,
        product_name: productName,
        quantity,
        message,
      })
      setSubmitted(result.id)
      setCustomerName('')
      setWhatsapp('')
      setQuantity(1)
      setMessage('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Request this product</h3>
      <p className="text-sm text-gray-600 mb-4">
        This product is currently out of stock. Tell us how many you need and we&apos;ll contact you
        on WhatsApp as soon as it&apos;s available.
      </p>

      {submitted && (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <p className="text-sm font-medium text-green-800">
            Request received — we&apos;ll WhatsApp you as soon as {productName} is back.
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="request-name" className="block text-sm font-medium text-gray-900 mb-1">
            Your name
          </label>
          <input
            id="request-name"
            type="text"
            required
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="request-whatsapp" className="block text-sm font-medium text-gray-900 mb-1">
            WhatsApp number
          </label>
          <input
            id="request-whatsapp"
            type="tel"
            required
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="03XX XXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="request-quantity" className="block text-sm font-medium text-gray-900 mb-1">
            Desired quantity
          </label>
          <input
            id="request-quantity"
            type="number"
            min="1"
            max="100"
            required
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(100, parseInt(event.target.value) || 1)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="request-message" className="block text-sm font-medium text-gray-900 mb-1">
            Optional message
          </label>
          <textarea
            id="request-message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Anything specific? (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-primary hover:bg-indigo-700 rounded-lg text-white font-semibold disabled:opacity-50 transition"
        >
          {submitting ? 'Submitting...' : 'Request Product'}
        </button>
      </form>
    </div>
  )
}