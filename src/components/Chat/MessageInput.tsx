import { useState, type KeyboardEvent } from 'react'
import { IoSendSharp } from 'react-icons/io5'

interface Props {
  onSend: (text: string) => void
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-end gap-3 px-4 py-3 border-t border-[#3f3f5a] bg-[#1e1e2e]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 bg-[#2a2a3e] text-sm text-white placeholder-[#94a3b8] rounded-xl px-4 py-2.5 outline-none resize-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors max-h-32 leading-relaxed"
        style={{ overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden' }}
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0"
      >
        <IoSendSharp className="text-base" />
      </button>
    </div>
  )
}
