const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  resource_type: 'image' | 'video' | 'raw' | 'auto'
  format: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  original_filename: string
}

/**
 * Turns a Cloudinary delivery URL into one that forces a download with the
 * original filename, by injecting the `fl_attachment` flag. Cloudinary then
 * responds with `Content-Disposition: attachment`, so the browser saves the
 * file instead of navigating to it.
 */
export function toDownloadUrl(url: string, filename?: string): string {
  const flag = filename
    ? `fl_attachment:${encodeURIComponent(filename.replace(/\.[^.]+$/, ''))}`
    : 'fl_attachment'
  return url.replace('/upload/', `/upload/${flag}/`)
}

export function uploadToCloudinary(
  file: File | Blob,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return Promise.reject(new Error('Cloudinary env vars are missing'))
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid Cloudinary response'))
        }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try {
          const body = JSON.parse(xhr.responseText)
          msg = body?.error?.message ?? msg
        } catch { /* ignore */ }
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}
