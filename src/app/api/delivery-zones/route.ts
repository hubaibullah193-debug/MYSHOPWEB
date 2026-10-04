import { NextResponse } from 'next/server'
import { getSupabasePublicClient } from '@/lib/supabase-server'
import { toNumber } from '@/lib/catalog-types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = getSupabasePublicClient()

    const { data, error } = await client
      .from('delivery_zones')
      .select('id,name,fee')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Delivery zone lookup failed:', error)
      return NextResponse.json({ error: 'Unable to load delivery zones' }, { status: 503 })
    }

    const zones = (data ?? []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      fee: toNumber(zone.fee as number | string) ?? 0,
    }))

    return NextResponse.json({ zones })
  } catch (error) {
    console.error('Delivery zone lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load delivery zones' }, { status: 503 })
  }
}