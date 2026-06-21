import { useRef, useState, type KeyboardEvent } from 'react'
import { IoSendSharp, IoAttachOutline, IoCloseOutline, IoMicOutline } from 'react-icons/io5'
import { VoiceRecorder } from './VoiceRecorder'

const MAX_LEN = 1000

interface Props {
  onSend: (text: string) => void
  onAttach: (files: File[]) => Promise<void>
  onVoice: (blob: Blob, duration: number) => Promise<void>
  uploadError: string | null
  onClearError: () => void
  audioError: string | null
  onClearAudioError: () => void
  onKeyPress?: () => void
  onBlur?: () => void
}

export function MessageInput({
  onSend, onAttach, onVoice,
  uploadError, onClearError,
  audioError, onClearAudioError,
  onKeyPress, onBlur,
}: Props) {
  const [text, setText] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hasText = text.trim().length > 0
  const remaining = MAX_LEN - text.length
  const nearLimit = remaining <= 100

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_LEN) return
    onSend(trimmed)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    else onKeyPress?.()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) await onAttach(files)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-t border-[#3f3f5a] bg-[#1e1e2e]">

      {/* Error toasts — only shown on failure */}
      {uploadError && (
        <div className="flex items-start gap-2 px-3 py-2 mb-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          <span className="flex-1 whitespace-pre-wrap">{uploadError}</span>
          <button onClick={onClearError} className="hover:text-red-200 flex-shrink-0 mt-0.5">
            <IoCloseOutline />
          </button>
        </div>
      )}
      {audioError && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          <span className="flex-1">{audioError}</span>
          <button onClick={onClearAudioError} className="hover:text-red-200">
            <IoCloseOutline />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={onFile}
          hidden
        />
        {!voiceMode && (
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach images or PDFs"
            className="w-10 h-10 rounded-xl bg-[#2a2a3e] hover:bg-[#3f3f5a] flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors flex-shrink-0"
          >
            <IoAttachOutline className="text-xl" />
          </button>
        )}
        {voiceMode ? (
          <VoiceRecorder
            onComplete={async (blob, duration) => {
              await onVoice(blob, duration)
              setVoiceMode(false)
            }}
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder="Type a message..."
            rows={1}
            maxLength={MAX_LEN}
            className="flex-1 min-w-0 bg-[#2a2a3e] text-sm text-white placeholder-[#94a3b8] rounded-xl px-4 py-2.5 outline-none resize-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors max-h-32 leading-relaxed"
            style={{ overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden', wordBreak: 'break-word' }}
          />
        )}
        {hasText ? (
          <button
            onClick={submit}
            className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            <IoSendSharp className="text-base" />
          </button>
        ) : !voiceMode ? (
          <button
            onClick={() => setVoiceMode(true)}
            title="Record voice message"
            className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            <IoMicOutline className="text-lg" />
          </button>
        ) : null}
      </div>

      {nearLimit && (
        <span className={`text-[10px] self-end pr-12 ${remaining <= 0 ? 'text-red-400' : 'text-[#94a3b8]'}`}>
          {remaining} characters left
        </span>
      )}
    </div>
  )
}
