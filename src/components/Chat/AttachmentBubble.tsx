import { useState } from 'react'
import type { Attachment } from '../../types'
import { IoDocumentTextOutline, IoDownloadOutline, IoCloseOutline } from 'react-icons/io5'

interface Props {
  attachment: Attachment
  isOwn: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AttachmentBubble({ attachment, isOwn }: Props) {
  const [lightbox, setLightbox] = useState(false)

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
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 text-white text-3xl p-2 hover:bg-white/10 rounded-full"
            >
              <IoCloseOutline />
            </button>
            <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        isOwn
          ? 'border-indigo-300/40 bg-indigo-400/20 hover:bg-indigo-400/30'
          : 'border-[#3f3f5a] bg-[#1e1e2e] hover:bg-[#2a2a3e]'
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
      <IoDownloadOutline className={`text-lg flex-shrink-0 ${isOwn ? 'text-white' : 'text-[#94a3b8]'}`} />
    </a>
  )
}
