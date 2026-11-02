import { useCallback, useEffect, useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, PageHeader, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { localOffset } from '../lib/format'
import { useTask } from '../lib/hooks'

const EMPTY = { age: '', sex: 'female', height_cm: '', weight_kg: '', activity_level: 'moderate', goal: 'maintain', diet_type: 'none', allergies: '', dislikes: '', cuisines: '' }
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
const num = (v) => (v === '' ? null : Number(v))

export default function MealPlan() {
  const [p, setP] = useState(EMPTY)
  const [saved, setSaved] = useState(false)
  const [opts, setOpts] = useState({ days: 3, meals_per_day: 3, notes: '' })
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    api('/profile').then((d) => {
      setP({ ...EMPTY, ...d, age: d.age ?? '', height_cm: d.height_cm ?? '', weight_kg: d.weight_kg ?? '', sex: d.sex ?? 'female',
        allergies: d.allergies.join(', '), dislikes: d.dislikes.join(', '), cuisines: d.cuisines.join(', ') })
      setSaved(!!d.age)
    }).catch(() => {})
    api('/analyses', { query: { kind: 'mealplan', limit: 1 } }).then((r) => r[0] && setPlan(r[0])).catch(() => {})
  }, [])

  const [save, doSave] = useTask(useCallback(async (v) => {
    const body = { ...v, age: num(v.age), height_cm: num(v.height_cm), weight_kg: num(v.weight_kg), allergies: csv(v.allergies), dislikes: csv(v.dislikes), cuisines: csv(v.cuisines) }
    const r = await api('/profile', { method: 'PUT', json: body }); setSaved(true); return r
  }, []))
  const [gen, doGen] = useTask(useCallback(async (o) => { const r = await api('/mealplans/generate', { method: 'POST', json: { ...o, days: +o.days, meals_per_day: +o.meals_per_day } }); setPlan(r); return r }, []))
  const [adapt, doAdapt] = useTask(useCallback(async (fb) => { const r = await api(`/mealplans/${plan.id}/adapt`, { method: 'POST', json: { feedback: fb }, query: { offset: localOffset() } }); setPlan(r); return r }, [plan]))

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })
  const O = (k) => (e) => setOpts({ ...opts, [k]: e.target.value })

  return (
    <>
      <PageHeader icon="🗓️" title="Personalized meal plans" subtitle="Targets are calculated from your profile (Mifflin-St Jeor). Plans adapt to your feedback and what you actually eat." />
      <form className="card fade-up" onSubmit={(e) => { e.preventDefault(); doSave(p) }}>
        <h3>Your profile</h3>
        <div className="grid-4">
          <label>Age<input type="number" min={10} max={100} required value={p.age} onChange={set('age')} /></label>
          <label>Sex<select value={p.sex} onChange={set('sex')}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
          <label>Height (cm)<input type="number" min={100} max={250} required value={p.height_cm} onChange={set('height_cm')} /></label>
          <label>Weight (kg)<input type="number" min={25} max={300} step="0.1" required value={p.weight_kg} onChange={set('weight_kg')} /></label>
          <label>Activity<select value={p.activity_level} onChange={set('activity_level')}>{['sedentary', 'light', 'moderate', 'active', 'very_active'].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Goal<select value={p.goal} onChange={set('goal')}>{['lose_weight', 'maintain', 'gain_weight', 'build_muscle'].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Diet<select value={p.diet_type} onChange={set('diet_type')}>{['none', 'vegetarian', 'vegan', 'eggetarian', 'pescatarian', 'keto', 'jain'].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Cuisines<input value={p.cuisines} onChange={set('cuisines')} placeholder="north indian, mediterranean" /></label>
        </div>
        <div className="grid-2 tight">
          <label>Allergies<input value={p.allergies} onChange={set('allergies')} placeholder="peanuts, shellfish" /></label>
          <label>Dislikes<input value={p.dislikes} onChange={set('dislikes')} placeholder="bitter gourd, mushrooms" /></label>
        </div>
        <button className="btn" disabled={save.loading}>Save profile</button> {save.data && <span className="ok-flag">✓ Saved</span>}
        <Alert level="danger">{save.error}</Alert>
      </form>

      <div className="card fade-up">
        <h3>Generate a plan</h3>
        <div className="grid-3 tight">
          <label>Days<select value={opts.days} onChange={O('days')}>{[1, 2, 3, 5, 7].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Meals per day<select value={opts.meals_per_day} onChange={O('meals_per_day')}>{[2, 3, 4, 5].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Notes<input value={opts.notes} onChange={O('notes')} maxLength={500} placeholder="quick lunches, budget friendly" /></label>
        </div>
        <button className="btn block-btn" disabled={!saved || gen.loading} onClick={() => doGen(opts)}>{saved ? 'Generate meal plan' : 'Save your profile first'}</button>
        {gen.loading && <Spinner label="Balancing macros and flavors…" />}
        <Alert level="danger">{gen.error}</Alert>
      </div>
      <Alert level="danger">{adapt.error}</Alert>
      {adapt.loading && <Spinner label="Adapting your plan…" />}
      {plan && <div className="card result-card"><ResultView analysis={plan} onAdapt={doAdapt} adapting={adapt.loading} /></div>}
    </>
  )
}
