import { useRecorder } from '../../hooks/useRecorder'
import { IoMicOutline, IoStopOutline, IoTrashOutline } from 'react-icons/io5'

interface Props {
  disabled?: boolean
  onComplete: (blob: Blob, duration: number) => void
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export function VoiceRecorder({ disabled, onComplete }: Props) {
  const { recording, duration, error, start, stop, cancel, maxDuration } = useRecorder()

  const handleClick = async () => {
    if (recording) {
      const result = await stop()
      if (result && result.duration >= 0.5) {
        onComplete(result.blob, result.duration)
      }
    } else {
      await start()
    }
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 flex-1">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-xs text-red-200 font-mono flex-1">
          Recording... {formatDuration(duration)} / {formatDuration(maxDuration)}
        </span>
        <button
          onClick={cancel}
          title="Cancel"
          className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-red-300 flex items-center justify-center"
        >
          <IoTrashOutline className="text-lg" />
        </button>
        <button
          onClick={handleClick}
          title="Send"
          className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center"
        >
          <IoStopOutline className="text-lg" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={error ?? 'Record voice message'}
      className="w-10 h-10 rounded-xl bg-[#2a2a3e] hover:bg-[#3f3f5a] disabled:opacity-40 flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors flex-shrink-0"
    >
      <IoMicOutline className="text-xl" />
    </button>
  )
}
