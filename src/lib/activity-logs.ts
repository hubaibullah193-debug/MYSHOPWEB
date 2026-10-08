import { apiFetch } from './api'

export interface ActivityLog {
  id: string
  admin_id: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  changes?: Record<string, unknown> | null
  ip_address?: string | null
  created_at: string
  admin?: {
    id: string
    email: string
    full_name: string
  } | null
}

function buildQuery(filters?: {
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  if (filters?.action) params.set('action', filters.action)
  if (filters?.entityType) params.set('entityType', filters.entityType)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  if (filters?.limit) params.set('limit', String(filters.limit))
  return params.toString() ? `?${params.toString()}` : ''
}

export async function getActivityLogs(filters?: Parameters<typeof buildQuery>[0]) {
  const result = await apiFetch<{ logs: ActivityLog[]; summary: Record<string, number> }>(
    `/api/admin/activity${buildQuery(filters)}`
  )
  return result.logs
}

export async function getActivityLogsWithAdmin(filters?: Parameters<typeof buildQuery>[0]) {
  return getActivityLogs(filters)
}

export async function getActivitySummary() {
  const result = await apiFetch<{ summary: Record<string, number> }>('/api/admin/activity')
  return result.summary
}
