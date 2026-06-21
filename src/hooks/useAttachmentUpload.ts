import { useState } from 'react'
import { uploadToCloudinary } from '../lib/cloudinary'
import { validateFile } from '../lib/fileValidation'
import type { Attachment, AudioClip } from '../types'

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'error'

export function useAttachmentUpload(conversationId: string | null) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setError(null)
  }

  const uploadAttachment = async (file: File): Promise<Attachment | null> => {
    if (!conversationId) return null
    setError(null)
    setStatus('validating')

    const v = await validateFile(file)
    if (!v.ok) {
      setError(v.reason)
      setStatus('error')
      return null
    }
    if (v.kind !== 'image' && v.kind !== 'pdf') {
      setError('Only images and PDFs can be sent as attachments here.')
      setStatus('error')
      return null
    }

    setStatus('uploading')
    setProgress(0)
    try {
      const res = await uploadToCloudinary(file, `chatly/${conversationId}`, setProgress)
      setStatus('idle')
      return {
        type: v.kind,
        url: res.secure_url,
        publicId: res.public_id,
        name: file.name,
        size: res.bytes,
        mimeType: v.mime,
        width: res.width,
        height: res.height,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStatus('error')
      return null
    }
  }

  const uploadAudio = async (blob: Blob, duration: number): Promise<AudioClip | null> => {
    if (!conversationId) return null
    setError(null)
    setStatus('validating')

    const v = await validateFile(blob, 'voice-note.webm')
    if (!v.ok) {
      setError(v.reason)
      setStatus('error')
      return null
    }
    if (v.kind !== 'audio') {
      setError('Recording is not a valid audio file.')
      setStatus('error')
      return null
    }

    setStatus('uploading')
    setProgress(0)
    try {
      const res = await uploadToCloudinary(blob, `chatly/${conversationId}/audio`, setProgress)
      setStatus('idle')
      return {
        url: res.secure_url,
        publicId: res.public_id,
        duration,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStatus('error')
      return null
    }
  }

  return { status, progress, error, uploadAttachment, uploadAudio, reset }
}
