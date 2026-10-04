export interface AdminDeliveryZoneRow {
  id: string
  name: string
  fee: number | string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  orders?: { id: string }[]
  order_count?: number
}

export interface DeliveryZoneRecord {
  id: string
  name: string
  fee: number
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  order_count: number
}