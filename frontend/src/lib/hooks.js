import { useCallback, useEffect, useRef, useState } from 'react'

/** Wraps an async function with loading / error / data state. */
export function useTask(fn) {
  const [state, setState] = useState({ loading: false, error: null, data: null })
  const run = useCallback(async (...args) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn(...args)
      setState({ loading: false, error: null, data })
      return data
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong' }))
      return null
    }
  }, [fn]) // eslint-disable-line react-hooks/exhaustive-deps
  const reset = useCallback(() => setState({ loading: false, error: null, data: null }), [])
  return [state, run, reset]
}

/** Microphone recorder using MediaRecorder. Returns a File ready to upload. */
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const rec = useRef(null)
  const chunks = useRef([])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = mr.mimeType || 'audio/webm'
        setFile(new File(chunks.current, `voice.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type }))
      }
      mr.start()
      rec.current = mr
      setRecording(true)
    } catch {
      setError('Microphone access was denied or is unavailable.')
    }
  }
  const stop = () => { rec.current?.stop(); setRecording(false) }
  useEffect(() => () => rec.current?.state === 'recording' && rec.current.stop(), [])
  return { recording, file, error, start, stop, clear: () => setFile(null) }
}
