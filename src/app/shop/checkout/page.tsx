'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/hooks/useAuth'
import { getAuthToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/validation'
import WhatsAppContactLink from '@/components/WhatsAppContactLink'

interface DeliveryZoneOption {
  id: string
  name: string
  fee: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    full_name: '',
    address: '',
    paymentMethod: 'cod' as 'cod' | 'jazz_cash' | 'easypaisa',
    deliveryMethod: 'courier' as 'courier' | 'self',
    transactionId: '',
  })
  const [zones, setZones] = useState<DeliveryZoneOption[]>([])
  const [zonesError, setZonesError] = useState<string | null>(null)
  const [zoneId, setZoneId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const idempotencyKey = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/delivery-zones')
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return
        setZones(Array.isArray(payload?.zones) ? payload.zones : [])
      })
      .catch(() => {
        if (!cancelled) setZonesError('Unable to load delivery areas')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    setFormData((previous) => ({
      ...previous,
      email: previous.email || user.email || '',
      phone: previous.phone || user.phone || '',
      full_name: previous.full_name || user.full_name || '',
    }))
  }, [user])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    idempotencyKey.current = null
    if (name === 'paymentMethod' && value === 'cod') {
      setEvidenceFile(null)
    }
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleZoneChange = (value: string) => {
    idempotencyKey.current = null
    setZoneId(value)
  }

  const handleEvidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    idempotencyKey.current = null
    setEvidenceFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (itemCount === 0) {
      setError('Your cart is empty')
      return
    }
    if (formData.deliveryMethod === 'courier' && !formData.address.trim()) {
      setError('Enter a delivery address for home delivery')
      return
    }
    if (formData.deliveryMethod === 'courier' && zones.length === 0) {
      setError('Home delivery is not available in your area yet. Please choose shop pickup, or contact us on WhatsApp.')
      return
    }
    if (formData.deliveryMethod === 'courier' && !zoneId) {
      setError('Select your delivery area')
      return
    }
    if (formData.paymentMethod !== 'cod' && !formData.transactionId.trim()) {
      setError('Enter the JazzCash or Easypaisa transaction reference')
      return
    }
    if (formData.paymentMethod !== 'cod' && !evidenceFile) {
      setError('Attach a screenshot of the payment')
      return
    }
    if (evidenceFile && evidenceFile.size > 5 * 1024 * 1024) {
      setError('Screenshot must be up to 5MB')
      return
    }

    setLoading(true)
    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID()
      }
      const token = await getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey.current,
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      let paymentEvidence: string | undefined
      if (formData.paymentMethod !== 'cod' && evidenceFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', evidenceFile)
        const uploadResponse = await fetch('/api/uploads/evidence', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: uploadForm,
        })
        const uploadPayload = await uploadResponse.json()
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.error || 'Screenshot upload failed')
        }
        paymentEvidence = uploadPayload.evidence_key as string | undefined
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: formData.full_name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: formData.address.trim(),
          items: cart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payment_method: formData.paymentMethod,
          delivery_method: formData.deliveryMethod,
          delivery_zone_id: formData.deliveryMethod === 'courier' ? zoneId : undefined,
          transaction_id: formData.transactionId.trim() || undefined,
          payment_evidence: paymentEvidence,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create order')
      }

      sessionStorage.setItem('hubaib_last_order_phone', normalizePhone(formData.phone))
      clearCart()
      router.push(`/shop/order-confirmation/${payload.order_id}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  if (itemCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600 text-lg mb-4">Your cart is empty</p>
        <button
          onClick={() => router.push('/shop/products')}
          className="px-6 py-2 bg-primary hover:bg-indigo-700 rounded text-white font-medium"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  const selectedZone = zones.find((zone) => zone.id === zoneId) ?? null
  const deliveryFee = formData.deliveryMethod === 'self' ? 0 : (selectedZone?.fee ?? 0)
  const orderTotal = Math.round((cart.total + deliveryFee) * 100) / 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">Full name</label>
                <input id="full_name" name="full_name" required value={formData.full_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">WhatsApp number</label>
                <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="03XX XXXXXXX" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-900 mb-1">Delivery method</label>
                <select id="deliveryMethod" name="deliveryMethod" value={formData.deliveryMethod} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="courier">Home delivery</option>
                  <option value="self">Shop pickup</option>
                </select>
              </div>
              {formData.deliveryMethod === 'courier' && (
                <>
                  <div>
                    <label htmlFor="deliveryZone" className="block text-sm font-medium text-gray-900 mb-1">Delivery area</label>
                    {zonesError ? (
                      <p className="text-sm text-red-600">{zonesError}</p>
                    ) : zones.length === 0 ? (
                      <div className="rounded-md bg-amber-50 p-4">
                        <p className="text-sm text-amber-800">
                          We don&apos;t currently offer home delivery in your area. Please choose shop pickup
                          instead, or message us on WhatsApp and we&apos;ll see what we can arrange.
                        </p>
                        <WhatsAppContactLink
                          message="Asalaam-o-Alaikum, I placed an order but home delivery isn't showing for my area. Can you help?"
                          className="inline-block mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-semibold transition"
                        >
                          Chat on WhatsApp
                        </WhatsAppContactLink>
                      </div>
                    ) : (
                      <>
                        <select id="deliveryZone" value={zoneId} onChange={(event) => handleZoneChange(event.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option value="">Select your area</option>
                          {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name} — {zone.fee === 0 ? 'Free delivery' : `PKR ${zone.fee.toLocaleString()}`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Can&apos;t find your area?{' '}
                          <WhatsAppContactLink
                            message="Asalaam-o-Alaikum, I couldn't find my delivery area at checkout."
                            className="text-primary underline"
                          >
                            Message us on WhatsApp
                          </WhatsAppContactLink>{' '}
                          or choose shop pickup.
                        </p>
                      </>
                    )}
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">Delivery address</label>
                    <textarea id="address" name="address" required rows={3} value={formData.address} onChange={handleChange} placeholder="Area, village, landmark, city/district" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </>
              )}
              {formData.deliveryMethod === 'self' && (
                <p className="text-sm text-gray-600">
                  Pickup is free. The shop is open 7:00 AM – 8:00 PM daily; we&apos;ll confirm your pickup time once
                  your order is ready.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-3">
              {[
                { value: 'cod', label: 'Cash on Delivery (COD)' },
                { value: 'jazz_cash', label: 'JazzCash' },
                { value: 'easypaisa', label: 'Easypaisa' },
              ].map((method) => (
                <label key={method.value} className="flex items-center">
                  <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value} onChange={handleChange} className="w-4 h-4 text-primary" />
                  <span className="ml-3 text-gray-900">{method.label}</span>
                </label>
              ))}
            </div>
            {formData.paymentMethod !== 'cod' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="transactionId" className="block text-sm font-medium text-gray-900 mb-1">Transaction reference</label>
                  <input id="transactionId" name="transactionId" required value={formData.transactionId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <p className="text-xs text-gray-500 mt-1">The shop will verify this reference before confirming the order.</p>
                </div>
                <div>
                  <label htmlFor="evidenceFile" className="block text-sm font-medium text-gray-900 mb-1">Payment screenshot</label>
                  <input
                    id="evidenceFile"
                    name="evidenceFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                    onChange={handleEvidenceChange}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-indigo-700"
                  />
                  {evidenceFile && (
                    <p className="text-xs text-gray-500 mt-1">{evidenceFile.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">PNG, JPEG, or WebP up to 5MB. The shop verifies this screenshot before confirming the order.</p>
                </div>
              </div>
            )}
          </section>

          <button type="submit" disabled={loading} className="w-full py-3 bg-primary hover:bg-indigo-700 rounded-lg text-white font-semibold transition disabled:opacity-50">
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>

      <aside>
        <div className="bg-white rounded-lg shadow p-6 sticky top-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm text-gray-600">
                <span>{item.product_name} x {item.quantity}</span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>PKR {cart.total.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>
                {formData.deliveryMethod === 'self' ? (
                  'Free (shop pickup)'
                ) : selectedZone ? (
                  `PKR ${deliveryFee.toLocaleString()}`
                ) : (
                  'Select your area'
                )}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold"><span>Total</span><span>PKR {orderTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </aside>
    </div>
  )
}
