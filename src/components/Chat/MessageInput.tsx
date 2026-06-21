import { useState, type KeyboardEvent } from 'react'
import { IoSendSharp } from 'react-icons/io5'

const MAX_LEN = 1000

interface Props {
  onSend: (text: string) => void
  onKeyPress?: () => void
  onBlur?: () => void
}

export function MessageInput({ onSend, onKeyPress, onBlur }: Props) {
  const [text, setText] = useState('')

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

  const remaining = MAX_LEN - text.length
  const nearLimit = remaining <= 100

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-t border-[#3f3f5a] bg-[#1e1e2e]">
      <div className="flex items-end gap-3">
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
