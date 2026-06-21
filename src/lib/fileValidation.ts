import { fileTypeFromBlob } from 'file-type'

export const MAX_FILE_BYTES = 5 * 1024 * 1024

export type AttachmentKind = 'image' | 'pdf' | 'audio'

interface AllowedType {
  kind: AttachmentKind
  mime: string
  ext: string[]
}

const ALLOWED: AllowedType[] = [
  { kind: 'image', mime: 'image/jpeg', ext: ['jpg', 'jpeg'] },
  { kind: 'image', mime: 'image/png', ext: ['png'] },
  { kind: 'image', mime: 'image/gif', ext: ['gif'] },
  { kind: 'image', mime: 'image/webp', ext: ['webp'] },
  { kind: 'pdf', mime: 'application/pdf', ext: ['pdf'] },
  { kind: 'audio', mime: 'audio/webm', ext: ['webm'] },
  { kind: 'audio', mime: 'audio/mp4', ext: ['m4a', 'mp4'] },
  { kind: 'audio', mime: 'audio/mpeg', ext: ['mp3'] },
  { kind: 'audio', mime: 'audio/wav', ext: ['wav'] },
]

export interface ValidationOk {
  ok: true
  kind: AttachmentKind
  mime: string
  ext: string
}

export interface ValidationErr {
  ok: false
  reason: string
}

export type ValidationResult = ValidationOk | ValidationErr

export async function validateFile(file: File | Blob, fallbackName = ''): Promise<ValidationResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `File too large. Max 5 MB (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB).` }
  }
  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' }
  }

  const sniff = await fileTypeFromBlob(file).catch(() => null)
  const name = file instanceof File ? file.name : fallbackName
  const nameExt = name.split('.').pop()?.toLowerCase() ?? ''

  const match = ALLOWED.find((a) => {
    if (sniff?.mime && a.mime === sniff.mime) return true
    if (sniff?.ext && a.ext.includes(sniff.ext)) return true
    if (!sniff && a.ext.includes(nameExt) && file.type === a.mime) return true
    return false
  })

  if (!match) {
    return {
      ok: false,
      reason: 'Unsupported file type. Allowed: JPG, PNG, GIF, WEBP, PDF, and audio recordings.',
    }
  }

  return { ok: true, kind: match.kind, mime: match.mime, ext: sniff?.ext ?? match.ext[0] }
}
