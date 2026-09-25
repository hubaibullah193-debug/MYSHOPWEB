'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPendingPayments, getPaymentSummary, confirmPayment, failPayment } from '@/lib/payments'
import { useAuth } from '@/hooks/useAuth'
import type { Payment } from '@/lib/payments'

interface PaymentWithOrder extends Payment {
  orders?: {
    id: string
    customer_email: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: string
    items: any[]
  }
}

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<PaymentWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithOrder | null>(null)
  const [verificationNotes, setVerificationNotes] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const paymentData = await getPendingPayments()
        setPayments(paymentData as PaymentWithOrder[])

        const summaryData = await getPaymentSummary()
        setSummary(summaryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payments')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleConfirmPayment = async (payment: PaymentWithOrder) => {
    if (!user) return

    setProcessingId(payment.id)
    try {
      await confirmPayment(payment.id, user.id, verificationNotes)

      // Remove from list
      setPayments((prev) => prev.filter((p) => p.id !== payment.id))
      setSummary((prev) => ({
        ...prev,
        pending: (prev.pending || 0) - 1,
        confirmed: (prev.confirmed || 0) + 1,
      }))

      setSelectedPayment(null)
      setVerificationNotes('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setProcessingId(null)
    }
  }

  const handleFailPayment = async (payment: PaymentWithOrder) => {
    if (!user || !verificationNotes.trim()) {
      setError('Please enter a reason for failure')
      return
    }

    setProcessingId(payment.id)
    try {
      await failPayment(payment.id, user.id, verificationNotes)

      setPayments((prev) => prev.filter((p) => p.id !== payment.id))
      setSummary((prev) => ({
        ...prev,
        pending: (prev.pending || 0) - 1,
        failed: (prev.failed || 0) + 1,
      }))

      setSelectedPayment(null)
      setVerificationNotes('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fail payment')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-2">Verify and confirm customer payments</p>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'pending', label: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
          { key: 'confirmed', label: 'Confirmed', color: 'bg-green-50 border-green-200' },
          { key: 'failed', label: 'Failed', color: 'bg-red-50 border-red-200' },
        ].map((stat) => (
          <div key={stat.key} className={`${stat.color} border rounded-lg p-4`}>
            <p className="text-sm font-medium text-gray-700">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary[stat.key] || 0}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payments List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Loading payments...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg">No pending payments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition ${
                    selectedPayment?.id === payment.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPayment(payment)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Order: {payment.orders?.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{payment.orders?.customer_email}</p>
                      <p className="text-sm text-gray-600">{payment.orders?.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        PKR {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 capitalize">{payment.method}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleString()}
                    </span>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Panel */}
        <div>
          {selectedPayment ? (
            <div className="bg-white rounded-lg shadow p-6 sticky top-8 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Verify Payment</h2>

              {/* Order Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Order ID</p>
                  <p className="font-mono text-gray-900">{selectedPayment.orders?.id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Amount</p>
                  <p className="font-bold text-gray-900">PKR {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Method</p>
                  <p className="text-gray-900 capitalize">{selectedPayment.method}</p>
                </div>
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="text-gray-900 text-xs break-all">{selectedPayment.orders?.customer_email}</p>
                </div>
              </div>

              {/* Verification Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Verification Notes
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Enter verification notes or rejection reason"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleConfirmPayment(selectedPayment)}
                  disabled={processingId === selectedPayment.id}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processingId === selectedPayment.id ? 'Processing...' : '✓ Confirm Payment'}
                </button>
                <button
                  onClick={() => handleFailPayment(selectedPayment)}
                  disabled={processingId === selectedPayment.id || !verificationNotes.trim()}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processingId === selectedPayment.id ? 'Processing...' : '✗ Reject Payment'}
                </button>
              </div>

              {/* Order Link */}
              <Link
                href={`/admin/orders/${selectedPayment.order_id}`}
                className="block text-center py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded transition"
              >
                View Order
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 sticky top-8 text-center text-gray-600">
              <p>Select a payment to verify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
