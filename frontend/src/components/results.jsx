import { useState } from 'react'
import { api } from '../lib/api'
import { useTask } from '../lib/hooks'
import { fmt, KIND, titleCase } from '../lib/format'
import { Alert, Badge, MacroBars, ScoreRing, Spinner, StatusBadge, Tabs } from './ui'

const List = ({ title, items, icon = '•' }) => items?.length ? (
  <div className="block"><h4>{title}</h4><ul className="plain">{items.map((t, i) => <li key={i}><span>{icon}</span>{t}</li>)}</ul></div>
) : null

export function RecognitionResult({ r }) {
  const t = r.totals
  return (
    <div className="result stagger">
      <div className="hero-row">
        <ScoreRing value={r.health_score} label="Health score" caption="health" />
        <div className="grow">
          <h2>{r.dish_name}</h2>
          <p className="muted">{[r.cuisine, r.source && `via ${r.source}`].filter(Boolean).join(' · ')}</p>
          <div className="kcal"><b>{fmt(t.calories)}</b> kcal</div>
          <p>{r.health_summary}</p>
        </div>
      </div>
      {r.transcript && <blockquote className="transcript">🎙️ “{r.transcript}”</blockquote>}
      <MacroBars totals={t} />
      <div className="table-wrap"><table>
        <thead><tr><th>Item</th><th>Portion</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>Conf.</th></tr></thead>
        <tbody>{r.items.map((i, k) => (
          <tr key={k}><td>{i.name}</td><td>{i.portion}</td><td>{fmt(i.calories)}</td><td>{fmt(i.protein_g, 1)}</td><td>{fmt(i.carbs_g, 1)}</td><td>{fmt(i.fat_g, 1)}</td><td>{Math.round(i.confidence * 100)}%</td></tr>
        ))}</tbody>
      </table></div>
      <List title="Smart tips" items={r.tips} icon="💡" />
      <p className="fine">Estimates from a visual/verbal description. Not medical advice.</p>
    </div>
  )
}

export function FreshnessResult({ r }) {
  return (
    <div className="result stagger">
      <div className="hero-row">
        <ScoreRing value={r.freshness_score} label="Freshness" caption="fresh" />
        <div className="grow">
          <h2>{r.food_name}</h2>
          <StatusBadge status={r.status} /> <span className="muted"> {Math.round(r.confidence * 100)}% confidence</span>
          <p>{r.recommendation}</p>
          <p className="muted">⏳ Estimated shelf life: {r.estimated_shelf_life}</p>
        </div>
      </div>
      {!r.safe_to_eat && <Alert level="danger">⚠️ This looks unsafe to eat. Discard it.</Alert>}
      <div className="block"><h4>What the model saw</h4>
        <div className="chips">{r.indicators.map((i, k) => (
          <div className="indicator" key={k} style={{ '--i': k }}><div><b>{titleCase(i.name)}</b> <Badge>{i.severity}</Badge></div><small>{i.observation}</small></div>
        ))}</div>
      </div>
      <List title="Storage tips" items={r.storage_tips} icon="🧊" />
      <p className="fine">{r.disclaimer}</p>
    </div>
  )
}

const CHECK_ICON = { compliant: '✅', partial: '🟡', non_compliant: '❌', not_observed: '➖' }

export function HygieneResult({ r }) {
  return (
    <div className="result stagger">
      <div className="hero-row">
        <ScoreRing value={r.score} label="Hygiene score" caption={`Grade ${r.grade}`} />
        <div className="grow"><h2>Kitchen hygiene audit</h2><p>{r.summary}</p>
          <p className="muted">👥 {r.people_observed} staff observed · {r.observed} of {r.checks.length} checks verifiable</p></div>
      </div>
      {r.alerts.map((a, i) => <Alert key={i} level={a.level}>{a.timestamp && <b>[{a.timestamp}] </b>}{a.message}</Alert>)}
      <div className="grid-cards">{r.checks.map((c, i) => (
        <div className={`check check-${c.status}`} key={i} style={{ '--i': i }}>
          <div>{CHECK_ICON[c.status]} <b>{titleCase(c.category)}</b></div>
          <small>{c.evidence || 'No evidence in footage'}{c.timestamp && ` (${c.timestamp})`}</small>
        </div>
      ))}</div>
      <List title="Recommendations" items={r.recommendations} icon="🛠️" />
    </div>
  )
}

export function RecipeView({ r }) {
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const [ask, run] = useTask((question) => api('/cooking/ask', { method: 'POST', json: { question, recipe: r, step } }))
  return (
    <div className="result stagger">
      <h2>{r.title}</h2><p>{r.description}</p>
      <div className="chips inline">
        <Badge tone="muted">⏱️ {r.total_min} min</Badge><Badge tone="muted">🍽️ {r.servings} servings</Badge>
        <Badge tone="muted">📶 {r.difficulty}</Badge><Badge tone="muted">🔥 {fmt(r.calories_per_serving)} kcal/serving</Badge>
      </div>
      <MacroBars totals={r} />
      <div className="two-col">
        <div className="block"><h4>Ingredients</h4><ul className="plain">{r.ingredients.map((i, k) => <li key={k}><b>{i.quantity}</b> {i.name}</li>)}</ul></div>
        <div className="block"><h4>Steps</h4><ol className="steps">{r.steps.map((s, k) => (
          <li key={k} className={k === step ? 'current' : k < step ? 'done' : ''} onClick={() => setStep(k)}>
            {s.instruction}{s.duration_min > 0 && <Badge tone="muted">⏱️ {s.duration_min} min</Badge>}{s.tip && <small>💡 {s.tip}</small>}
          </li>))}</ol>
          <div className="row no-print"><button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Prev</button>
            <button className="btn" disabled={step >= r.steps.length - 1} onClick={() => setStep(step + 1)}>Next step →</button></div>
        </div>
      </div>
      <List title="Substitutions" items={r.substitutions} icon="🔁" />
      <List title="Chef tips" items={r.chef_tips} icon="👩‍🍳" />
      <form className="ask no-print" onSubmit={(e) => { e.preventDefault(); q.trim() && run(q) }}>
        <h4>Ask the cooking assistant (step {step + 1})</h4>
        <div className="row"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Too salty? No cumin? How do I know it's done?" maxLength={500} />
          <button className="btn" disabled={ask.loading}>Ask</button></div>
        {ask.loading && <Spinner label="Thinking…" />}
        <Alert level="danger">{ask.error}</Alert>
        {ask.data && <div className="bubble">{ask.data.answer}</div>}
      </form>
    </div>
  )
}

export function MealPlanView({ r, onAdapt, adapting }) {
  const [day, setDay] = useState(0)
  const [fb, setFb] = useState('')
  const d = r.days[day] ?? r.days[0]
  return (
    <div className="result stagger">
      <div className="hero-row">
        <ScoreRing value={r.targets.calories} max={Math.max(r.targets.calories, 1)} size={110} tone="good" caption="kcal/day" />
        <div className="grow"><h2>Plan v{r.version ?? 1}</h2>
          <p className="muted">Target {r.targets.calories} kcal · P {r.targets.protein_g} g · C {r.targets.carbs_g} g · F {r.targets.fat_g} g</p>
          <p className="fine">BMR {r.targets.bmr} · maintenance {r.targets.tdee} kcal</p></div>
      </div>
      <Tabs tabs={r.days.map((x, i) => [i, `Day ${x.day}`])} value={day} onChange={setDay} />
      <p className="muted">Day total: <b>{fmt(d.totals.calories)}</b> kcal ({d.calorie_deviation_pct > 0 ? '+' : ''}{d.calorie_deviation_pct}% vs target) · P {fmt(d.totals.protein_g)} g</p>
      <div className="grid-cards">{d.meals.map((m, i) => (
        <div className="meal" key={`${day}-${i}`} style={{ '--i': i }}>
          <Badge tone="muted">{titleCase(m.type)}</Badge><h4>{m.name}</h4><p>{m.description}</p>
          <small>{fmt(m.calories)} kcal · P {fmt(m.protein_g)} · C {fmt(m.carbs_g)} · F {fmt(m.fat_g)} · ⏱️ {m.prep_min} min</small>
          <small className="muted">{m.ingredients.join(', ')}</small>
        </div>))}</div>
      <List title="Grocery list" items={r.grocery_list} icon="🛒" />
      <List title="Tips" items={r.tips} icon="💡" />
      {onAdapt && (
        <form className="ask no-print" onSubmit={(e) => { e.preventDefault(); fb.trim() && onAdapt(fb) }}>
          <h4>Adapt this plan</h4>
          <div className="row"><input value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Too much rice, add more protein, I skipped dinner yesterday…" maxLength={800} />
            <button className="btn" disabled={adapting}>Adapt</button></div>
          <small className="muted">Uses your feedback and what you actually logged this week.</small>
        </form>)}
    </div>
  )
}

export function ResultView({ analysis, onAdapt, adapting }) {
  const r = analysis.result
  return {
    recognition: <RecognitionResult r={r} />,
    freshness: <FreshnessResult r={r} />,
    hygiene: <HygieneResult r={r} />,
    cooking: <RecipeView r={r} />,
    mealplan: <MealPlanView r={r} onAdapt={onAdapt} adapting={adapting} />,
  }[analysis.kind] ?? <p>Unknown result type “{KIND[analysis.kind]?.label ?? analysis.kind}”.</p>
}
