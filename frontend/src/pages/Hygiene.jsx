import { useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, PageHeader, Spinner, UploadZone } from '../components/ui'
import { upload } from '../lib/api'
import { useTask } from '../lib/hooks'

export default function Hygiene() {
  const [file, setFile] = useState(null)
  const [area, setArea] = useState('')
  const [state, run] = useTask((f, a) => upload('/hygiene/video', f, { area: a }))
  return (
    <>
      <PageHeader icon="🧼" title="Kitchen hygiene monitor" subtitle="Upload kitchen footage to audit gloves, hair caps, aprons, handwashing, food handling and cleanliness." />
      <div className="card fade-up">
        <UploadZone accept="video/*" file={file} onFile={setFile} busy={state.loading} icon="🎥" hint="MP4 / MOV / WebM up to 100 MB · 30-90 s clips work best" scanLabel="Reviewing footage…" />
        <label>Area / shift (optional)<input value={area} onChange={(e) => setArea(e.target.value)} maxLength={200} placeholder="e.g. Hot line, evening shift" /></label>
        <button className="btn block-btn" disabled={!file || state.loading} onClick={() => run(file, area)}>Run hygiene audit</button>
        {state.loading && <Spinner label="Analyzing video, this can take a minute…" />}
        <Alert level="danger">{state.error}</Alert>
      </div>
      {state.data && <div className="card result-card"><ResultView analysis={state.data} /></div>}
    </>
  )
}
