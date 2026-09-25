import { supabase } from './supabase'

export interface ActivityLog {
  id: string
  admin_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: Record<string, any>
  ip_address?: string
  created_at: string
}

/**
 * Log an admin action to activity_logs table
 */
export async function logActivity(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  changes?: Record<string, any>,
  ipAddress?: string
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      ip_address: ipAddress,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - logging shouldn't break the main operation
    return null
  }

  return data
}

/**
 * Get activity logs with optional filtering
 */
export async function getActivityLogs(filters?: {
  adminId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.adminId) {
    query = query.eq('admin_id', filters.adminId)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get activity logs with admin details
 */
export async function getActivityLogsWithAdmin(filters?: {
  adminId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  let query = supabase
    .from('activity_logs')
    .select(
      `
      *,
      admin:admin_id(id, email, full_name)
    `
    )
    .order('created_at', { ascending: false })

  if (filters?.adminId) {
    query = query.eq('admin_id', filters.adminId)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get activity summary by action type
 */
export async function getActivitySummary(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('activity_logs')
    .select('action')
    .gte('created_at', startDate.toISOString())

  if (error) {
    throw error
  }

  const summary: Record<string, number> = {}
  ;(data || []).forEach((log: any) => {
    summary[log.action] = (summary[log.action] || 0) + 1
  })

  return summary
}

/**
 * Get unique admins who performed actions
 */
export async function getActiveAdmins(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('activity_logs')
    .select('admin_id')
    .gte('created_at', startDate.toISOString())

  if (error) {
    throw error
  }

  const adminIds = [...new Set((data || []).map((log: any) => log.admin_id))]
  return adminIds
}
