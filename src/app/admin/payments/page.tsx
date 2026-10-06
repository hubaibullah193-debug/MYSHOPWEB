'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { confirmPayment, failPayment, getPayments, refundPayment } from '@/lib/payments'
import type { Payment, PaymentStatus, PaymentStatusFilter } from '@/lib/payments'
import type { OrderItem } from '@/lib/orders'

interface PaymentWithOrder extends Payment {
  orders?: {
    id: string
    customer_name?: string
    customer_email: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: string
    items: OrderItem[]
  }
}

const TABS: Array<{ key: PaymentStatusFilter; label: string }> = [
  { key: 'action', label: 'Action Needed' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
]

const STATUS_BADGES: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-700',
}

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentStatusFilter>('action')
  const [payments, setPayments] = useState<PaymentWithOrder[]>([])
  const [summary, setSummary] = useState<Record<PaymentStatus, number>>({
    pending: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithOrder | null>(null)
  const [verificationNotes, setVerificationNotes] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [refundReference, setRefundReference] = useState('')

  const refresh = useCallback(async (tab: PaymentStatusFilter) => {
    try {
      setLoading(true)
      setError(null)
      const result = await getPayments(tab)
      setPayments(result.payments as PaymentWithOrder[])
      setSummary(result.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(activeTab)
  }, [activeTab, refresh])

  const resetPanel = () => {
    setSelectedPayment(null)
    setVerificationNotes('')
    setTransactionReference('')
    setRefundReference('')
  }

  const selectPayment = (payment: PaymentWithOrder) => {
    if (selectedPayment?.id === payment.id) {
      resetPanel()
      return
    }
    setSelectedPayment(payment)
    setVerificationNotes('')
    setTransactionReference('')
    setRefundReference('')
    setError(null)
    setNotice(null)
  }

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    const payment = selectedPayment
    if (!payment) return
    setProcessingId(payment.id)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(successMessage)
      resetPanel()
      await refresh(activeTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirm = () => {
    const payment = selectedPayment
    if (!payment) return
    if (payment.method !== 'cod' && !transactionReference.trim() && !payment.transaction_id) return
    void runAction(
      () =>
        confirmPayment(
          payment.id,
          verificationNotes || undefined,
          transactionReference || payment.transaction_id || undefined
        ),
      'Payment confirmed'
    )
  }

  const handleFail = () => {
    const payment = selectedPayment
    if (!payment || !verificationNotes.trim()) return
    void runAction(() => failPayment(payment.id, verificationNotes.trim()), 'Payment marked as failed')
  }

  const handleRefund = () => {
    const payment = selectedPayment
    if (!payment || !refundReference.trim()) return
    void runAction(
      () => refundPayment(payment.id, refundReference.trim(), verificationNotes || undefined),
      'Refund recorded'
    )
  }

  const canConfirm = selectedPayment?.status === 'pending' || selectedPayment?.status === 'failed'
  const canRefund = selectedPayment?.status === 'paid'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-2">Verify and confirm customer payments, and record refunds</p>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'pending', label: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
          { key: 'paid', label: 'Paid', color: 'bg-green-50 border-green-200' },
          { key: 'failed', label: 'Failed', color: 'bg-red-50 border-red-200' },
          { key: 'refunded', label: 'Refunded', color: 'bg-gray-50 border-gray-200' },
        ].map((stat) => (
          <div key={stat.key} className={`${stat.color} border rounded-lg p-4`}>
            <p className="text-sm font-medium text-gray-700">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary[stat.key as PaymentStatus] || 0}</p>
          </div>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              resetPanel()
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}
      {notice && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">{notice}</p>
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
              <p className="text-gray-600 text-lg">No payments in this view</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition ${
                    selectedPayment?.id === payment.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => selectPayment(payment)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">Order: {payment.orders?.id?.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {payment.orders?.customer_name || payment.orders?.customer_email}
                      </p>
                      <p className="text-sm text-gray-600">{payment.orders?.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">PKR {payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 mt-1 capitalize">{payment.method.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleString()}</span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[payment.status]}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail / Action Panel */}
        <div>
          {selectedPayment ? (
            <div className="bg-white rounded-lg shadow p-6 sticky top-8 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>

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
                  <p className="text-gray-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[selectedPayment.status]}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-600">Method</p>
                  <p className="text-gray-900 capitalize">{selectedPayment.method.replace('_', ' ')}</p>
                </div>
                {selectedPayment.transaction_id && (
                  <div>
                    <p className="text-gray-600">Transaction reference</p>
                    <p className="text-gray-900 font-mono text-xs break-all">{selectedPayment.transaction_id}</p>
                  </div>
                )}
                {selectedPayment.refund_reference && (
                  <div>
                    <p className="text-gray-600">Refund reference</p>
                    <p className="text-gray-900 font-mono text-xs break-all">{selectedPayment.refund_reference}</p>
                  </div>
                )}
                {selectedPayment.failure_reason && (
                  <div>
                    <p className="text-gray-600">Failure reason</p>
                    <p className="text-gray-900 text-xs break-words">{selectedPayment.failure_reason}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="text-gray-900 text-xs break-all">
                    {selectedPayment.orders?.customer_name
                      ? `${selectedPayment.orders.customer_name} · ${selectedPayment.orders.customer_email}`
                      : selectedPayment.orders?.customer_email}
                  </p>
                </div>
                {selectedPayment.method !== 'cod' && (
                  <div>
                    <p className="text-gray-600">Payment screenshot</p>
                    {selectedPayment.evidence_url ? (
                      <a
                        href={selectedPayment.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-indigo-700 font-medium"
                      >
                        View screenshot
                      </a>
                    ) : (
                      <p className="text-xs text-gray-500">Not uploaded</p>
                    )}
                  </div>
                )}
              </div>

              {canConfirm || canRefund ? (
                <>
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
                    <textarea
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder={canRefund ? 'Optional notes for the refund' : 'Verification notes or rejection reason'}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {canRefund ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Refund reference</label>
                      <input
                        value={refundReference}
                        onChange={(e) => setRefundReference(e.target.value)}
                        placeholder="Reference from the banking app"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Refunds are processed within 2 - 3 business days via JazzCash / Easypaisa.
                      </p>
                    </div>
                  ) : (
                    selectedPayment.method !== 'cod' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Transaction reference</label>
                        <input
                          value={transactionReference || selectedPayment.transaction_id || ''}
                          onChange={(e) => setTransactionReference(e.target.value)}
                          placeholder="Reference shown in the payment app"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                      </div>
                    )
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {canConfirm && (
                      <button
                        onClick={handleConfirm}
                        disabled={
                          processingId === selectedPayment.id ||
                          (selectedPayment.method !== 'cod' && !transactionReference.trim() && !selectedPayment.transaction_id)
                        }
                        className="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {processingId === selectedPayment.id ? 'Processing...' : 'Confirm Payment'}
                      </button>
                    )}
                    {selectedPayment.status === 'pending' && (
                      <button
                        onClick={handleFail}
                        disabled={processingId === selectedPayment.id || !verificationNotes.trim()}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {processingId === selectedPayment.id ? 'Processing...' : 'Reject Payment'}
                      </button>
                    )}
                    {canRefund && (
                      <button
                        onClick={handleRefund}
                        disabled={processingId === selectedPayment.id || !refundReference.trim()}
                        className="w-full py-2 bg-gray-700 hover:bg-gray-800 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {processingId === selectedPayment.id ? 'Processing...' : 'Record Refund'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {selectedPayment.status === 'refunded'
                    ? 'This payment has been refunded.'
                    : 'This payment has no pending actions.'}
                </p>
              )}

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
              <p>Select a payment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}