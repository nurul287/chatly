import { useState } from 'react'
import type { Attachment } from '../../types'
import { toDownloadUrl } from '../../lib/cloudinary'
import { IoDocumentTextOutline, IoDownloadOutline, IoCloseOutline, IoOpenOutline } from 'react-icons/io5'

interface Props {
  attachment: Attachment
  isOwn: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Cross-origin `download` attributes are ignored by browsers, so we fetch the
 * file into a blob (same-origin object URL) and save that. Falls back to opening
 * the attachment-flagged URL in a new tab if the fetch is blocked.
 */
async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(toDownloadUrl(url, filename), '_blank', 'noopener')
  }
}

export function AttachmentBubble({ attachment, isOwn }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    await downloadFile(attachment.url, attachment.name)
    setDownloading(false)
  }

  if (attachment.type === 'image') {
    return (
      <>
        <button
          onClick={() => setLightbox(true)}
          className="block max-w-full overflow-hidden rounded-2xl border border-[#3f3f5a] hover:opacity-90 transition-opacity"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            loading="lazy"
            className="block max-w-full max-h-72 object-contain bg-[#1a1a2a]"
          />
        </button>
        {lightbox && (
          <div
            onClick={() => setLightbox(false)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload() }}
                disabled={downloading}
                title="Download"
                className="text-white text-2xl p-2 hover:bg-white/10 rounded-full disabled:opacity-50"
              >
                <IoDownloadOutline />
              </button>
              <button
                onClick={() => setLightbox(false)}
                title="Close"
                className="text-white text-3xl p-2 hover:bg-white/10 rounded-full"
              >
                <IoCloseOutline />
              </button>
            </div>
            <img
              src={attachment.url}
              alt={attachment.name}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain cursor-default"
            />
          </div>
        )}
      </>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
        isOwn
          ? 'border-indigo-300/40 bg-indigo-400/20'
          : 'border-[#3f3f5a] bg-[#1e1e2e]'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isOwn ? 'bg-white/15' : 'bg-indigo-500/20'
      }`}>
        <IoDocumentTextOutline className={isOwn ? 'text-white text-xl' : 'text-indigo-300 text-xl'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-[#e2e8f0]'}`}>
          {attachment.name}
        </p>
        <p className={`text-[11px] ${isOwn ? 'text-indigo-100/80' : 'text-[#94a3b8]'}`}>
          PDF · {formatSize(attachment.size)}
        </p>
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open"
        className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
          isOwn ? 'text-white hover:bg-white/15' : 'text-[#94a3b8] hover:bg-[#2a2a3e] hover:text-white'
        }`}
      >
        <IoOpenOutline className="text-lg" />
      </a>
      <button
        onClick={handleDownload}
        disabled={downloading}
        title="Download"
        className={`p-1.5 rounded-lg flex-shrink-0 transition-colors disabled:opacity-50 ${
          isOwn ? 'text-white hover:bg-white/15' : 'text-[#94a3b8] hover:bg-[#2a2a3e] hover:text-white'
        }`}
      >
        <IoDownloadOutline className="text-lg" />
      </button>
    </div>
  )
}
