import { useEffect, useRef, useState } from 'react'

const MAX_DURATION_SEC = 120

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg']
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

export interface RecorderResult {
  blob: Blob
  duration: number
}

export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resolveRef = useRef<((r: RecorderResult | null) => void) | null>(null)

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setDuration(0)
  }

  useEffect(() => () => cleanup(), [])

  const start = async (): Promise<boolean> => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const resolver = resolveRef.current
        resolveRef.current = null
        cleanup()
        resolver?.({ blob, duration: elapsed })
      }

      startedAtRef.current = Date.now()
      recorder.start()
      setRecording(true)

      timerRef.current = setInterval(() => {
        const sec = (Date.now() - startedAtRef.current) / 1000
        setDuration(sec)
        if (sec >= MAX_DURATION_SEC) stop()
      }, 100)

      return true
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Could not access microphone'
      )
      cleanup()
      return false
    }
  }

  const stop = (): Promise<RecorderResult | null> => {
    return new Promise((resolve) => {
      const r = recorderRef.current
      if (!r || r.state === 'inactive') {
        cleanup()
        resolve(null)
        return
      }
      resolveRef.current = resolve
      r.stop()
    })
  }

  const cancel = () => {
    resolveRef.current?.(null)
    resolveRef.current = null
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    cleanup()
  }

  return { recording, duration, error, start, stop, cancel, maxDuration: MAX_DURATION_SEC }
}
