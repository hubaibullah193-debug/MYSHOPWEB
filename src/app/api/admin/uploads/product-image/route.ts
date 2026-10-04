import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, { ext: string; magic: (buffer: Buffer) => boolean }> = {
  'image/png': {
    ext: 'png',
    magic: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  'image/jpeg': {
    ext: 'jpg',
    magic: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/webp': {
    ext: 'webp',
    magic: (buffer) =>
      buffer.length >= 12 &&
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP',
  },
}

const OBJECT_PATH_RE = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i

function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/product-images/${path}`
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_image_upload:${requestAddress(request)}`, 120, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const form = await request.formData().catch(() => null)
    const file = form?.get('image')

    if (!file || typeof file === 'string') {
      throw new ValidationError('Attach an image file.')
    }

    const allowed = ALLOWED_TYPES[file.type]
    if (!allowed) {
      throw new ValidationError('Only PNG, JPG and WebP images are accepted.')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ValidationError('Images must be 5 MB or smaller.')
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (!allowed.magic(bytes)) {
      throw new ValidationError('The file content does not match an image format.')
    }

    const path = `products/${crypto.randomUUID()}.${allowed.ext}`
    const { error } = await admin.client.storage
      .from('product-images')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (error) {
      throw new ValidationError('Unable to upload the image. Please try again.')
    }

    return NextResponse.json({ url: publicImageUrl(path), path }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    enforceRateLimit(`admin_image_delete:${requestAddress(request)}`, 120, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = (await request.json().catch(() => ({}))) as { path?: unknown }
    const path = typeof body.path === 'string' ? body.path.trim() : ''

    if (!OBJECT_PATH_RE.test(path)) {
      throw new ValidationError('Invalid image reference.')
    }

    const { error } = await admin.client.storage.from('product-images').remove([path])
    if (error) {
      throw new ValidationError('Unable to remove the image. Please try again.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}