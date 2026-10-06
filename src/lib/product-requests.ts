import { apiFetch } from './api'
import type { ProductRequestInput, ProductRequestStatus } from './validation'

export type { ProductRequestStatus }

export interface ProductRequest {
  id: string
  customer_name: string
  whatsapp: string
  product_name: string
  quantity: number
  message?: string | null
  status: ProductRequestStatus
  admin_notes?: string | null
  created_at: string
  updated_at: string
}

export async function submitProductRequest(input: ProductRequestInput): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/api/product-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listProductRequests(): Promise<ProductRequest[]> {
  const result = await apiFetch<{ requests: ProductRequest[] }>('/api/admin/product-requests')
  return result.requests
}

export async function updateProductRequest(
  requestId: string,
  status: ProductRequestStatus,
  notes?: string
): Promise<ProductRequest> {
  const result = await apiFetch<{ request: ProductRequest }>(
    `/api/admin/product-requests/${requestId}`,
    {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }
  )
  return result.request
}