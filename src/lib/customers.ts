import { apiFetch } from './api'

export interface CustomerDirectoryEntry {
  phone: string
  customer_name: string
  customer_email: string
  customer_address: string
  total_orders: number
  total_spent: number
  first_order_at: string | null
  last_order_at: string | null
}

export async function getCustomers(params?: {
  q?: string
  limit?: number
}): Promise<CustomerDirectoryEntry[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString() ? `?${query.toString()}` : ''
  const result = await apiFetch<{ customers: CustomerDirectoryEntry[] }>(`/api/admin/customers${qs}`)
  return result.customers
}