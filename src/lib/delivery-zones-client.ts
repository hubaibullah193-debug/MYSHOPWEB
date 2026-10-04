import { apiFetch } from '@/lib/api'
import type { AdminDeliveryZoneRow, DeliveryZoneRecord } from '@/lib/delivery-types'

export interface DeliveryZonePayload {
  name: string
  fee: number
  isActive: boolean
  displayOrder: number
}

function toRecord(zone: AdminDeliveryZoneRow): DeliveryZoneRecord {
  return {
    id: zone.id,
    name: zone.name,
    fee: Number(zone.fee),
    is_active: zone.is_active,
    display_order: zone.display_order,
    created_at: zone.created_at,
    updated_at: zone.updated_at,
    order_count: zone.order_count ?? 0,
  }
}

export async function listDeliveryZones(): Promise<DeliveryZoneRecord[]> {
  const { zones } = await apiFetch<{ zones: AdminDeliveryZoneRow[] }>('/api/admin/delivery-zones')
  return (zones ?? []).map(toRecord)
}

export async function createDeliveryZone(payload: DeliveryZonePayload): Promise<DeliveryZoneRecord> {
  const { zone } = await apiFetch<{ zone: AdminDeliveryZoneRow }>('/api/admin/delivery-zones', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toRecord(zone)
}

export async function updateDeliveryZone(
  id: string,
  payload: DeliveryZonePayload
): Promise<DeliveryZoneRecord> {
  const { zone } = await apiFetch<{ zone: AdminDeliveryZoneRow }>(`/api/admin/delivery-zones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return toRecord(zone)
}

export async function deleteDeliveryZone(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' })
}