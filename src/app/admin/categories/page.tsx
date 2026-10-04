'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryClient,
} from '@/lib/catalog-client'
import {
  buttonPrimary,
  buttonSecondary,
  EmptyState,
  ErrorBanner,
  Field,
  inputClassName,
  Spinner,
} from '@/components/admin/fields'

interface CategoryFormState {
  name: string
  slug: string
  parentId: string
  isActive: boolean
  displayOrder: string
}

const EMPTY_FORM: CategoryFormState = { name: '', slug: '', parentId: '', isActive: true, displayOrder: '0' }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildForm(category: CategoryClient): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id ?? '',
    isActive: category.is_active,
    displayOrder: String(category.display_order),
  }
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState<CategoryFormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setCategories(await listCategories())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const topLevel = categories.filter((category) => category.parent_id === null)
  const subcategoriesOf = (id: string) => categories.filter((category) => category.parent_id === id)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createCategory({
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        parentId: form.parentId || null,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      })
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the category.')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (category: CategoryClient) => {
    setEditingId(category.id)
    setEditingForm(buildForm(category))
  }

  const handleSaveEdit = async (category: CategoryClient) => {
    setBusy(true)
    setError(null)
    try {
      await updateCategory(category.id, {
        name: editingForm.name.trim(),
        slug: editingForm.slug.trim() || slugify(editingForm.name),
        parentId: editingForm.parentId || null,
        isActive: editingForm.isActive,
        displayOrder: Number(editingForm.displayOrder) || 0,
      })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the category.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (category: CategoryClient) => {
    const childCount = subcategoriesOf(category.id).length
    const confirmMessage = childCount > 0
      ? `Delete "${category.name}" and its ${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}? Products will keep their data but be unlinked.`
      : `Delete "${category.name}"? Products will keep their data but be unlinked.`
    if (!window.confirm(confirmMessage)) return
    setBusy(true)
    setError(null)
    try {
      await deleteCategory(category.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the category.')
    } finally {
      setBusy(false)
    }
  }

  const renderCategory = (category: CategoryClient) => {
    const children = subcategoriesOf(category.id)
    const editing = editingId === category.id
    return (
      <li key={category.id} className="rounded-md border border-gray-200 bg-white p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Name" required>
                <input
                  className={inputClassName}
                  value={editingForm.name}
                  onChange={(event) =>
                    setEditingForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Slug">
                <input
                  className={inputClassName}
                  value={editingForm.slug}
                  onChange={(event) => setEditingForm((current) => ({ ...current, slug: event.target.value }))}
                />
              </Field>
              <Field label="Parent category">
                <select
                  className={inputClassName}
                  value={editingForm.parentId}
                  onChange={(event) =>
                    setEditingForm((current) => ({ ...current, parentId: event.target.value }))
                  }
                  disabled={childCountOf(category.id) > 0}
                >
                  <option value="">Top-level category</option>
                  {topLevel
                    .filter((candidate) => candidate.id !== category.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                </select>
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
                  onClick={() => void handleSaveEdit(category)}
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
                {category.name}
                {category.product_count !== undefined && category.product_count > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {category.product_count} product{category.product_count === 1 ? '' : 's'}
                  </span>
                )}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {category.is_active ? 'Active' : 'Hidden'}
                </span>
              </p>
              <p className="text-xs text-gray-500">/{category.slug}</p>
            </div>
            <div className="flex gap-3">
              <button
                className="font-medium text-indigo-600 hover:text-indigo-700"
                onClick={() => startEdit(category)}
              >
                Edit
              </button>
              <button
                className="font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleDelete(category)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </div>
        )}
        {children.length > 0 && (
          <ul className="mt-3 space-y-3 border-t border-gray-100 pt-3 pl-4">
            {children.map(renderCategory)}
          </ul>
        )}
      </li>
    )
  }

  const childCountOf = (id: string) => subcategoriesOf(id).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <p className="mt-2 text-gray-600">Organise your catalogue into top-level categories and subcategories.</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Add category</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <Field label="Name" required>
            <input
              className={inputClassName}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.slug || slugify(event.target.value),
                }))
              }
              required
            />
          </Field>
          <Field label="Slug">
            <input
              className={inputClassName}
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            />
          </Field>
          <Field label="Parent category">
            <select
              className={inputClassName}
              value={form.parentId}
              onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
            >
              <option value="">Top-level category</option>
              {topLevel.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Display order">
            <input
              className={inputClassName}
              type="number"
              value={form.displayOrder}
              onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
            />
          </Field>
          <div className="flex items-end justify-between gap-3 md:col-span-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
            <button className={buttonPrimary} disabled={busy}>
              {busy ? 'Saving…' : 'Add category'}
            </button>
          </div>
        </form>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Loading categories…" />
      ) : categories.length === 0 ? (
        <EmptyState message="No categories yet. Add your first category above." />
      ) : (
        <ul className="space-y-3">{topLevel.map(renderCategory)}</ul>
      )}
    </div>
  )
}