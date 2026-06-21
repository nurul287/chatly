import { useEffect, useRef, useState } from 'react'
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5'

interface Props {
  src: string
  isOwn: boolean
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export function AudioPlayer({ src, isOwn }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onMeta = () => setDuration(el.duration)
    const onTime = () => { if (!dragging) setCurrent(el.currentTime) }
    const onEnded = () => { setPlaying(false); setCurrent(0) }
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [dragging])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play(); setPlaying(true) }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setCurrent(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  const track = isOwn
    ? { bg: 'rgba(255,255,255,0.25)', fill: '#fff', btn: 'bg-white/20 hover:bg-white/30 text-white', time: 'text-indigo-100' }
    : { bg: '#3f3f5a', fill: '#818cf8', btn: 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300', time: 'text-[#94a3b8]' }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl ${isOwn ? 'bg-indigo-500 rounded-br-sm' : 'bg-[#2a2a3e] rounded-bl-sm'} w-56 sm:w-64`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${track.btn}`}
      >
        {playing ? <IoPauseSharp className="text-sm" /> : <IoPlaySharp className="text-sm ml-0.5" />}
      </button>

      <div className="relative h-1.5 rounded-full flex-1" style={{ background: track.bg }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${progress}%`, background: track.fill }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={current}
          onChange={seek}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <span className={`text-[10px] font-mono flex-shrink-0 ${track.time}`}>
        {fmt(current)}<span className="opacity-50"> / </span>{fmt(duration)}
      </span>
    </div>
  )
}
