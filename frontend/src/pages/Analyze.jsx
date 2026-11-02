import { useCallback, useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, PageHeader, Spinner, Tabs, UploadZone } from '../components/ui'
import { api, upload } from '../lib/api'
import { useRecorder, useTask } from '../lib/hooks'

export default function Analyze() {
  const [tab, setTab] = useState('image')
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [log, setLog] = useState(true)
  const [text, setText] = useState('')
  const rec = useRecorder()
  const [state, run, reset] = useTask(useCallback((t, payload) => {
    if (t === 'image') return upload('/recognition/image', payload.file, { note: payload.note, log: payload.log })
    if (t === 'audio') return upload('/recognition/audio', payload.file)
    return api('/recognition/text', { method: 'POST', json: { description: payload.text } })
  }, []))

  const audio = file || rec.file
  const ready = tab === 'image' ? file : tab === 'audio' ? audio : text.trim().length >= 3
  const submit = () => run(tab, { file: tab === 'audio' ? audio : file, note, log, text })
  const switchTab = (t) => { setTab(t); reset() }

  return (
    <>
      <PageHeader icon="🍽️" title="Food recognition & nutrition" subtitle="Snap, speak or type. Get dishes, calories, macros and a health score." />
      <div className="card fade-up">
        <Tabs tabs={[['image', '📷 Photo'], ['audio', '🎙️ Voice'], ['text', '⌨️ Text']]} value={tab} onChange={switchTab} />
        {tab === 'image' && (<>
          <UploadZone accept="image/*" file={file} onFile={setFile} busy={state.loading} hint="JPG, PNG or WebP up to 10 MB" scanLabel="Identifying food…" />
          <label>Anything we should know? (optional)<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. homemade, less oil, half portion" /></label>
          <label className="check-row"><input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} /> Add to today’s food log</label>
        </>)}
        {tab === 'audio' && (<>
          <div className="recorder">
            <button className={`mic ${rec.recording ? 'live' : ''}`} onClick={rec.recording ? rec.stop : rec.start} aria-label={rec.recording ? 'Stop recording' : 'Start recording'}>{rec.recording ? '■' : '🎙️'}</button>
            <p>{rec.recording ? 'Listening… tell me what you ate' : 'Tap to record, e.g. “Two rotis, a bowl of dal and a glass of lassi”'}</p>
            <Alert level="danger">{rec.error}</Alert>
          </div>
          <p className="muted center">or upload a recording</p>
          <UploadZone accept="audio/*" file={audio} onFile={(f) => { rec.clear(); setFile(f) }} busy={state.loading} icon="🎧" hint="MP3, WAV, M4A, OGG up to 20 MB" scanLabel="Transcribing…" />
        </>)}
        {tab === 'text' && <label>Describe your meal<textarea rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="2 chapatis with paneer butter masala, a small bowl of rice and a cup of curd" /></label>}
        <button className="btn block-btn" disabled={!ready || state.loading} onClick={submit}>{state.loading ? 'Analyzing…' : 'Analyze meal'}</button>
        {state.loading && <Spinner label="Gemini is analyzing…" />}
        <Alert level="danger">{state.error}</Alert>
      </div>
      {state.data && <div className="card result-card"><ResultView analysis={state.data} /></div>}
    </>
  )
}
