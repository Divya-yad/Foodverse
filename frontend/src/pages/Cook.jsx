import { useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, PageHeader, Spinner, UploadZone } from '../components/ui'
import { upload } from '../lib/api'
import { useTask } from '../lib/hooks'

const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'jain']

export default function Cook() {
  const [f, setF] = useState({ query: '', servings: 2, max_minutes: '', skill: 'intermediate' })
  const [diet, setDiet] = useState([])
  const [img, setImg] = useState(null)
  const [state, run] = useTask((form, d, file) => upload('/cooking/recipe', file, { ...form, dietary: d.join(',') }))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (d) => setDiet((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))
  const ok = f.query.trim() || img

  return (
    <>
      <PageHeader icon="👩‍🍳" title="Smart cooking assistant" subtitle="Tell me a dish, or show me your ingredients. Get a recipe, steps and live help." />
      <div className="card fade-up">
        <label>What do you want to cook?<input value={f.query} onChange={set('query')} maxLength={500} placeholder="Palak paneer · or: something quick with eggs, spinach and rice" /></label>
        <div className="grid-3 tight">
          <label>Servings<input type="number" min={1} max={20} value={f.servings} onChange={set('servings')} /></label>
          <label>Max minutes<input type="number" min={5} max={600} value={f.max_minutes} onChange={set('max_minutes')} placeholder="any" /></label>
          <label>Skill<select value={f.skill} onChange={set('skill')}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label>
        </div>
        <div className="chips inline">{DIETS.map((d) => <button key={d} type="button" className={`chip ${diet.includes(d) ? 'on' : ''}`} onClick={() => toggle(d)}>{d}</button>)}</div>
        <p className="muted">Optional: photo of your ingredients</p>
        <UploadZone accept="image/*" file={img} onFile={setImg} busy={state.loading} icon="🧅" hint="Fridge or counter photo" scanLabel="Spotting ingredients…" />
        <button className="btn block-btn" disabled={!ok || state.loading} onClick={() => run(f, diet, img)}>Create recipe</button>
        {state.loading && <Spinner label="Writing your recipe…" />}
        <Alert level="danger">{state.error}</Alert>
      </div>
      {state.data && <div className="card result-card"><ResultView analysis={state.data} /></div>}
    </>
  )
}
