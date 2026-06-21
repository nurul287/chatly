import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { uploadToCloudinary } from '../lib/cloudinary'
import { validateFile } from '../lib/fileValidation'
import type { Attachment, AudioClip } from '../types'

export function useAttachmentUpload(conversationId: string | null) {
  const [error, setError] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)

  const clearError = () => setError(null)
  const clearAudioError = () => setAudioError(null)

  const uploadAttachments = async (
    files: File[],
    onEach: (attachment: Attachment) => Promise<void>
  ) => {
    if (!conversationId || files.length === 0) return

    const errors: string[] = []

    await Promise.all(
      files.map(async (file) => {
        const v = await validateFile(file)
        if (!v.ok) { errors.push(`${file.name}: ${v.reason}`); return }
        if (v.kind !== 'image' && v.kind !== 'pdf') {
          errors.push(`${file.name}: Only images and PDFs allowed.`); return
        }

        let uploadFile: File | Blob = file
        if (v.kind === 'image') {
          try {
            uploadFile = await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            })
          } catch {
            uploadFile = file
          }
        }

        try {
          const res = await uploadToCloudinary(uploadFile, `chatly/${conversationId}`)
          await onEach({
            type: v.kind as 'image' | 'pdf',
            url: res.secure_url,
            publicId: res.public_id,
            name: file.name,
            size: res.bytes,
            mimeType: v.mime,
            width: res.width,
            height: res.height,
          })
        } catch (e) {
          errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Upload failed'}`)
        }
      })
    )

    if (errors.length > 0) setError(errors.join('\n'))
  }

  const uploadAudio = async (blob: Blob, duration: number): Promise<AudioClip | null> => {
    if (!conversationId) return null

    const v = await validateFile(blob, 'voice-note.webm')
    if (!v.ok) { setAudioError(v.reason); return null }
    if (v.kind !== 'audio') { setAudioError('Recording is not a valid audio file.'); return null }

    try {
      const res = await uploadToCloudinary(blob, `chatly/${conversationId}/audio`)
      return { url: res.secure_url, publicId: res.public_id, duration }
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : 'Upload failed')
      return null
    }
  }

  return { error, clearError, audioError, clearAudioError, uploadAttachments, uploadAudio }
}
