'use client'

import { useEffect, useState } from 'react'
import { getActivityLogsWithAdmin, getActivitySummary } from '@/lib/activity-logs'

interface ActivityLogEntry {
  id: string
  admin_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: Record<string, unknown>
  ip_address?: string
  created_at: string
  admin?: {
    id: string
    email: string
    full_name: string
  }
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Record<string, number>>({})

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const logsData = await getActivityLogsWithAdmin({
          action: actionFilter || undefined,
          entityType: entityTypeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 100,
        })
        setLogs(logsData as ActivityLogEntry[])

        const summaryData = await getActivitySummary()
        setSummary(summaryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity logs')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [actionFilter, entityTypeFilter, startDate, endDate])

  const actionTypes = [
    'order_status_updated',
    'payment_confirmed',
    'payment_failed',
    'delivery_assigned',
    'product_created',
    'product_updated',
    'inventory_adjusted',
  ]

  const entityTypes = ['order', 'payment', 'product', 'inventory', 'user']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-2">Complete audit trail of all admin actions</p>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(summary).slice(0, 4).map(([action, count]) => (
          <div key={action} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-700 capitalize">{action.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Entity Type</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">All Types</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {(actionFilter || entityTypeFilter || startDate || endDate) && (
          <button
            onClick={() => {
              setActionFilter('')
              setEntityTypeFilter('')
              setStartDate('')
              setEndDate('')
            }}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Activity Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading activity logs...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No activity logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{log.admin?.full_name}</p>
                      <p className="text-xs text-gray-600">{log.admin?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{log.entity_type}</p>
                      <p className="text-xs text-gray-600 font-mono">{log.entity_id?.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.changes ? (
                      <details className="cursor-pointer">
                        <summary className="text-primary hover:text-indigo-700">View changes</summary>
                        <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-48">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
