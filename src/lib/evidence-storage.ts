import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from './supabase-server'

export const EVIDENCE_BUCKET = 'payment-evidence'
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export class EvidenceUploadError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'EvidenceUploadError'
    this.status = status
  }
}

export function evidenceExtension(contentType: string): string | null {
  return EXTENSION_BY_TYPE[contentType] ?? null
}

export function isLikelyImage(buffer: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (contentType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      new TextDecoder().decode(buffer.subarray(0, 12)) === 'RIFF....WEBP'
    )
  }
  return false
}

export async function uploadPaymentEvidence(
  data: ArrayBuffer,
  contentType: string,
  extension: string
): Promise<string> {
  const admin = getSupabaseAdmin()
  const key = `${EVIDENCE_BUCKET}/${randomUUID()}.${extension}`

  const { data: uploaded, error } = await admin.storage
    .from(EVIDENCE_BUCKET)
    .upload(key, data, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error || !uploaded) {
    throw new EvidenceUploadError('Screenshot upload failed', 502)
  }

  return uploaded.path
}

export async function signedEvidenceUrl(path: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}