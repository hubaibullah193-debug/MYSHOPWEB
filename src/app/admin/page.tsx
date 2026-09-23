'use client'

import { useAuth } from '@/hooks/useAuth'

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Total Orders</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">—</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Pending Payments</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">—</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Processing Orders</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">—</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Low Stock Items</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">—</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900">Getting Started</h2>
        <ul className="mt-4 space-y-2 text-blue-800">
          <li>• View orders in the Orders section</li>
          <li>• Confirm payments before processing orders</li>
          <li>• Assign delivery methods and dates</li>
          <li>• Monitor activity logs for audit trail</li>
          {isSuperAdmin && <li>• Manage products and inventory (Super Admin)</li>}
        </ul>
      </div>
    </div>
  )
}
