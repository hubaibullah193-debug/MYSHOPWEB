'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createDeliveryZone,
  deleteDeliveryZone,
  listDeliveryZones,
  updateDeliveryZone,
} from '@/lib/delivery-zones-client'
import type { DeliveryZoneRecord } from '@/lib/delivery-types'
import {
  buttonPrimary,
  buttonSecondary,
  EmptyState,
  ErrorBanner,
  Field,
  formatMoney,
  inputClassName,
  Spinner,
} from '@/components/admin/fields'

interface ZoneFormState {
  name: string
  fee: string
  isActive: boolean
  displayOrder: string
}

const EMPTY_FORM: ZoneFormState = { name: '', fee: '', isActive: true, displayOrder: '0' }

function buildForm(zone: DeliveryZoneRecord): ZoneFormState {
  return {
    name: zone.name,
    fee: String(zone.fee),
    isActive: zone.is_active,
    displayOrder: String(zone.display_order),
  }
}

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZoneRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ZoneFormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState<ZoneFormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setZones(await listDeliveryZones())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery zones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createDeliveryZone({
        name: form.name.trim(),
        fee: Number(form.fee),
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      })
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the delivery zone.')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (zone: DeliveryZoneRecord) => {
    setEditingId(zone.id)
    setEditingForm(buildForm(zone))
  }

  const handleSaveEdit = async (zone: DeliveryZoneRecord) => {
    setBusy(true)
    setError(null)
    try {
      await updateDeliveryZone(zone.id, {
        name: editingForm.name.trim(),
        fee: Number(editingForm.fee),
        isActive: editingForm.isActive,
        displayOrder: Number(editingForm.displayOrder) || 0,
      })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the delivery zone.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (zone: DeliveryZoneRecord) => {
    const confirmMessage =
      zone.order_count > 0
        ? `Delete "${zone.name}"? ${zone.order_count} past ${zone.order_count === 1 ? 'order' : 'orders'} will keep their records but be unlinked from this zone.`
        : `Delete "${zone.name}"?`
    if (!window.confirm(confirmMessage)) return
    setBusy(true)
    setError(null)
    try {
      await deleteDeliveryZone(zone.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the delivery zone.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Delivery Zones</h1>
        <p className="mt-2 text-gray-600">
          Fixed-charge home-delivery zones. The zone fee is added to the order total at checkout.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Add zone</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <Field label="Zone name" required>
            <input
              className={inputClassName}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </Field>
          <Field label="Delivery fee (PKR)" required>
            <input
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={(event) => setForm((current) => ({ ...current, fee: event.target.value }))}
              required
            />
          </Field>
          <Field label="Display order">
            <input
              className={inputClassName}
              type="number"
              value={form.displayOrder}
              onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
            />
          </Field>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
            <button className={buttonPrimary} disabled={busy}>
              {busy ? 'Saving…' : 'Add zone'}
            </button>
          </div>
        </form>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Loading delivery zones…" />
      ) : zones.length === 0 ? (
        <EmptyState message="No delivery zones yet. Add your first zone above." />
      ) : (
        <ul className="space-y-3">
          {zones.map((zone) => (
            <li key={zone.id} className="rounded-md border border-gray-200 bg-white p-4">
              {editingId === zone.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Field label="Zone name" required>
                      <input
                        className={inputClassName}
                        value={editingForm.name}
                        onChange={(event) =>
                          setEditingForm((current) => ({ ...current, name: event.target.value }))
                        }
                        required
                      />
                    </Field>
                    <Field label="Delivery fee (PKR)" required>
                      <input
                        className={inputClassName}
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingForm.fee}
                        onChange={(event) =>
                          setEditingForm((current) => ({ ...current, fee: event.target.value }))
                        }
                        required
                      />
                    </Field>
                    <Field label="Display order">
                      <input
                        className={inputClassName}
                        type="number"
                        value={editingForm.displayOrder}
                        onChange={(event) =>
                          setEditingForm((current) => ({ ...current, displayOrder: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editingForm.isActive}
                        onChange={(event) =>
                          setEditingForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button className={buttonSecondary} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                      <button
                        className={buttonPrimary}
                        onClick={() => void handleSaveEdit(zone)}
                        disabled={busy}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {zone.name}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          zone.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {zone.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatMoney(zone.fee)} delivery fee
                      {zone.order_count > 0 && (
                        <span className="ml-2">
                          · {zone.order_count} order{zone.order_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                      onClick={() => startEdit(zone)}
                    >
                      Edit
                    </button>
                    <button
                      className="font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void handleDelete(zone)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}