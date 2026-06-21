import { useRef, useState, type KeyboardEvent } from 'react'
import { IoSendSharp, IoAttachOutline, IoCloseOutline } from 'react-icons/io5'

const MAX_LEN = 1000

interface Props {
  onSend: (text: string) => void
  onAttach: (file: File) => Promise<void>
  uploadStatus: 'idle' | 'validating' | 'uploading' | 'error'
  uploadProgress: number
  uploadError: string | null
  onClearError: () => void
  onKeyPress?: () => void
  onBlur?: () => void
}

export function MessageInput({
  onSend,
  onAttach,
  uploadStatus,
  uploadProgress,
  uploadError,
  onClearError,
  onKeyPress,
  onBlur,
}: Props) {
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const uploading = uploadStatus === 'uploading' || uploadStatus === 'validating'

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_LEN) return
    onSend(trimmed)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else {
      onKeyPress?.()
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await onAttach(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const remaining = MAX_LEN - text.length
  const nearLimit = remaining <= 100

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-t border-[#3f3f5a] bg-[#1e1e2e]">
      {uploadError && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          <span className="flex-1">{uploadError}</span>
          <button onClick={onClearError} className="hover:text-red-200">
            <IoCloseOutline />
          </button>
        </div>
      )}
      {uploading && (
        <div className="px-3 py-2 mb-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">
          {uploadStatus === 'validating' ? 'Validating file...' : `Uploading... ${uploadProgress}%`}
          {uploadStatus === 'uploading' && (
            <div className="mt-1 h-1 bg-indigo-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={onFile}
          hidden
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Attach image or PDF"
          className="w-10 h-10 rounded-xl bg-[#2a2a3e] hover:bg-[#3f3f5a] disabled:opacity-40 flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors flex-shrink-0"
        >
          <IoAttachOutline className="text-xl" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder="Type a message..."
          rows={1}
          maxLength={MAX_LEN}
          className="flex-1 min-w-0 bg-[#2a2a3e] text-sm text-white placeholder-[#94a3b8] rounded-xl px-4 py-2.5 outline-none resize-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors max-h-32 leading-relaxed break-words"
          style={{ overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden', wordBreak: 'break-word' }}
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0"
        >
          <IoSendSharp className="text-base" />
        </button>
      </div>
      {nearLimit && (
        <span className={`text-[10px] self-end pr-12 ${remaining <= 0 ? 'text-red-400' : 'text-[#94a3b8]'}`}>
          {remaining} characters left
        </span>
      )}
    </div>
  )
}
