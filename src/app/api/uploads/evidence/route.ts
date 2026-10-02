import { NextRequest, NextResponse } from 'next/server'
import { ServerAuthError } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import {
  evidenceExtension,
  EvidenceUploadError,
  isLikelyImage,
  MAX_EVIDENCE_BYTES,
  uploadPaymentEvidence,
} from '@/lib/evidence-storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`evidence-upload:${requestAddress(request)}`, 15, 60 * 60 * 1000)

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A screenshot file is required' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be up to 5MB' }, { status: 400 })
    }

    const extension = evidenceExtension(file.type)
    if (!extension) {
      return NextResponse.json({ error: 'Only PNG, JPEG, or WebP images are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    if (!isLikelyImage(new Uint8Array(buffer), file.type)) {
      return NextResponse.json({ error: 'The uploaded file is not a valid image' }, { status: 400 })
    }

    const evidenceKey = await uploadPaymentEvidence(buffer, file.type, extension)
    return NextResponse.json({ evidence_key: evidenceKey }, { status: 201 })
  } catch (error) {
    if (error instanceof EvidenceUploadError || error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
    }
    console.error('Evidence upload failed:', error)
    return NextResponse.json({ error: 'Unable to upload screenshot' }, { status: 500 })
  }
}