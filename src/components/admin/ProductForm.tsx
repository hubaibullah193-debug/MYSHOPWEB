'use client'

import { useState } from 'react'
import {
  createProduct,
  removeProductImage,
  type CategoryClient,
  type ProductClient,
  type ProductPayload,
  updateProduct,
  uploadProductImage,
} from '@/lib/catalog-client'
import { buttonPrimary, buttonSecondary, ErrorBanner, Field, inputClassName } from '@/components/admin/fields'

interface VariantEditorRow {
  id: string | null
  name: string
  price: string
  isActive: boolean
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  product?: ProductClient
  categories: CategoryClient[]
  onSaved: (product: ProductClient) => void
}

const IMAGE_PATH_RE = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const amount = Number(trimmed)
  return Number.isFinite(amount) ? amount : null
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function ProductForm({ mode, product, categories, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(product?.seo_description ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategory_id ?? '')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [salePrice, setSalePrice] = useState(product?.sale_price ? String(product.sale_price) : '')
  const [saleStartsAt, setSaleStartsAt] = useState(toLocalInput(product?.sale_starts_at ?? null))
  const [saleEndsAt, setSaleEndsAt] = useState(toLocalInput(product?.sale_ends_at ?? null))
  const [images, setImages] = useState<string[]>(
    Array.isArray(product?.images) ? (product.images as string[]) : []
  )
  const [variants, setVariants] = useState<VariantEditorRow[]>(
    (product?.product_variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price === null || variant.price === '' ? '' : String(variant.price),
      isActive: variant.is_active,
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const subcategories = categories.filter((category) => category.parent_id === categoryId)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug) setSlug(slugify(value))
  }

  const handleCategoryChange = (value: string) => {
    setCategoryId(value)
    setSubcategoryId('')
  }

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { url } = await uploadProductImage(file)
      setImages((current) => [...current, url])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload the image.')
    } finally {
      setUploading(false)
    }
  }

  const handleImageRemove = async (url: string) => {
    setError(null)
    try {
      const path = url.split('/product-images/')[1]
      if (path && IMAGE_PATH_RE.test(path)) {
        await removeProductImage(path)
      }
    } catch {
      // The image is removed from the list regardless; orphaned files are harmless.
    }
    setImages((current) => current.filter((image) => image !== url))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const updateVariant = (index: number, patch: Partial<VariantEditorRow>) => {
    setVariants((current) => current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const saleActive = salePrice.trim() !== ''
      let startsAt: string | null = null
      let endsAt: string | null = null
      if (saleActive && saleStartsAt && saleEndsAt) {
        startsAt = new Date(saleStartsAt).toISOString()
        endsAt = new Date(saleEndsAt).toISOString()
      }

      const payload: ProductPayload = {
        name: name.trim(),
        description: description.trim(),
        price: toNumberOrNull(price) ?? 0,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        isActive,
        slug: slug.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        sale: {
          price: saleActive ? toNumberOrNull(salePrice) : null,
          startsAt,
          endsAt,
        },
        images,
        variants: variants.map((variant) => ({
          id: variant.id,
          name: variant.name.trim(),
          price: variant.price.trim() === '' ? null : toNumberOrNull(variant.price),
          isActive: variant.isActive,
        })),
      }

      const saved =
        mode === 'create'
          ? await createProduct(payload)
          : await updateProduct(product?.id as string, payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the product.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorBanner message={error} />

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Basics</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Product name" required>
            <input
              className={inputClassName}
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              required
              maxLength={140}
            />
          </Field>
          <Field label="Price (PKR)" required hint="Price must be greater than 0.">
            <input
              className={inputClassName}
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClassName}
              value={categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              <option value="">No category</option>
              {categories
                .filter((category) => category.parent_id === null)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Subcategory">
            <select
              className={inputClassName}
              value={subcategoryId}
              onChange={(event) => setSubcategoryId(event.target.value)}
              disabled={!categoryId || subcategories.length === 0}
            >
              <option value="">No subcategory</option>
              {subcategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                className={inputClassName}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={4000}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Available on the store
          </label>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sale pricing</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Sale price (PKR)" hint="Leave empty to remove the sale.">
            <input
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
            />
          </Field>
          <Field label="Sale starts">
            <input
              className={inputClassName}
              type="datetime-local"
              value={saleStartsAt}
              onChange={(event) => setSaleStartsAt(event.target.value)}
              disabled={!salePrice}
            />
          </Field>
          <Field label="Sale ends">
            <input
              className={inputClassName}
              type="datetime-local"
              value={saleEndsAt}
              onChange={(event) => setSaleEndsAt(event.target.value)}
              disabled={!salePrice}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          A sale price without a start/end window is active until removed. Orders always use the effective
          sale price.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">SEO</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="URL slug">
            <input
              className={inputClassName}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="SEO title">
            <input
              className={inputClassName}
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              maxLength={160}
            />
          </Field>
          <Field label="SEO description">
            <input
              className={inputClassName}
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              maxLength={160}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Images</h2>
        <div className="flex flex-wrap gap-4">
          {images.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-24 w-24 rounded-md border border-gray-200 object-cover"
              />
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === images.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => handleImageRemove(url)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400">
            {uploading ? 'Uploading…' : 'Add image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(event) => handleImageUpload(event.target.files?.[0])}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          PNG, JPG or WebP, up to 5 MB each. The first image is shown first; up to 12 images.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => setVariants((current) => [...current, { id: null, name: '', price: '', isActive: true }])}
          >
            Add variant
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Variants (e.g. size, colour) each keep their own stock. Leave the price empty to inherit the product
          price. Add at least one to switch this product to variant-based inventory.
        </p>
        {variants.length === 0 ? (
          <p className="text-sm text-gray-500">No variants — stock is managed at the product level.</p>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-3">
                <div className="min-w-40 flex-1">
                  <Field label={`Variant ${index + 1} name`} required>
                    <input
                      className={inputClassName}
                      value={variant.name}
                      onChange={(event) => updateVariant(index, { name: event.target.value })}
                      required
                    />
                  </Field>
                </div>
                <div className="min-w-32">
                  <Field label="Price (PKR)">
                    <input
                      className={inputClassName}
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      onChange={(event) => updateVariant(index, { price: event.target.value })}
                    />
                  </Field>
                </div>
                <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(event) => updateVariant(index, { isActive: event.target.checked })}
                  />
                  Active
                </label>
                <button
                  type="button"
                  className="mb-2 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => setVariants((current) => current.filter((_, idx) => idx !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="submit" className={buttonPrimary} disabled={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}