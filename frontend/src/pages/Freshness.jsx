import { useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, PageHeader, Spinner, UploadZone } from '../components/ui'
import { upload } from '../lib/api'
import { useTask } from '../lib/hooks'

export default function Freshness() {
  const [file, setFile] = useState(null)
  const [hint, setHint] = useState('')
  const [state, run] = useTask((f, h) => upload('/freshness/image', f, { hint: h }))
  return (
    <>
      <PageHeader icon="🥬" title="Freshness detector" subtitle="Color, texture, discoloration and surface patterns → Fresh, Moderately Fresh or Spoiled." />
      <div className="card fade-up">
        <UploadZone accept="image/*" file={file} onFile={setFile} busy={state.loading} icon="🍎" hint="Take a close, well-lit photo of the food" scanLabel="Inspecting surface…" />
        <label>What is it? (optional)<input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={200} placeholder="e.g. cooked rice from yesterday" /></label>
        <button className="btn block-btn" disabled={!file || state.loading} onClick={() => run(file, hint)}>Check freshness</button>
        {state.loading && <Spinner label="Inspecting…" />}
        <Alert level="danger">{state.error}</Alert>
      </div>
      {state.data && <div className="card result-card"><ResultView analysis={state.data} /></div>}
    </>
  )
}
