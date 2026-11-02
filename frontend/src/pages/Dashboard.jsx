import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Empty, MacroBars, PageHeader, ScoreRing, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmt, KIND, localOffset, statusTone } from '../lib/format'
import { useTask } from '../lib/hooks'

export default function Dashboard() {
  const { user } = useAuth()
  const load = useCallback(() => api('/dashboard', { query: { offset: localOffset() } }), [])
  const [d, fetchDash] = useTask(load)
  const getInsights = useCallback(() => api('/dashboard/insights', { query: { offset: localOffset() } }), [])
  const [ins, fetchIns] = useTask(getInsights)
  useEffect(() => { fetchDash() }, [fetchDash])

  const s = d.data
  if (!s) return <>{d.error ? <Alert level="danger">{d.error}</Alert> : <Spinner label="Loading your dashboard…" />}</>
  const maxCal = Math.max(...s.week.map((x) => x.calories), s.targets?.calories || 0, 1)

  return (
    <>
      <PageHeader icon="📊" title={`Hello, ${user.full_name.split(' ')[0]}`} subtitle="Your food intelligence at a glance" />
      {s.alerts.map((a, i) => <Alert key={i} level={a.level}>{a.message}</Alert>)}

      <div className="grid-3 stagger">
        <section className="card center">
          <h3>Today</h3>
          <ScoreRing value={s.today.calories} max={s.targets?.calories || Math.max(s.today.calories, 2000)} size={150} caption="kcal" tone="good" />
          <p className="muted">{s.targets ? `of ${s.targets.calories} kcal target` : <Link to="/plan">Set up your profile for a target</Link>} · {s.today.meals} meals</p>
        </section>
        <section className="card"><h3>Macros today</h3><MacroBars totals={s.today} targets={s.targets} /></section>
        <section className="card center">
          <h3>Avg health score</h3>
          {s.avg_health_score != null ? <ScoreRing value={s.avg_health_score} size={150} caption="7 days" /> : <Empty icon="🍽️">Log meals to see your score.</Empty>}
        </section>
      </div>

      <section className="card fade-up">
        <h3>Last 7 days · calories</h3>
        <div className="chart">
          {s.week.map((w, i) => (
            <div className="col" key={w.date} title={`${w.date}: ${fmt(w.calories)} kcal`}>
              <div className="col-bar" style={{ height: `${(w.calories / maxCal) * 100}%`, '--i': i }} />
              <small>{new Date(w.date).toLocaleDateString(undefined, { weekday: 'short' })}</small>
            </div>
          ))}
          {s.targets && <div className="target-line" style={{ bottom: `calc(${(s.targets.calories / maxCal) * 100}% * 0.82 + 22px)` }} />}
        </div>
      </section>

      <div className="grid-3 stagger">
        {Object.entries(KIND).map(([k, v]) => <Link className="card tile" to={k === 'recognition' ? '/analyze' : k === 'cooking' ? '/cook' : k === 'mealplan' ? '/plan' : `/${k === 'freshness' ? 'freshness' : 'hygiene'}`} key={k}><span>{v.icon}</span><b>{s.counts[k]}</b><small>{v.label}s analyzed</small></Link>)}
        <section className="card">
          <h3>Safety status</h3>
          {s.latest_freshness ? <p>🥬 {s.latest_freshness.title}: <Badge tone={statusTone(s.latest_freshness.status)}>{s.latest_freshness.status}</Badge></p> : <p className="muted">No freshness checks yet.</p>}
          {s.latest_hygiene ? <p>🧼 Hygiene <b>{s.latest_hygiene.score}/100</b> (Grade {s.latest_hygiene.grade})</p> : <p className="muted">No hygiene audits yet.</p>}
        </section>
      </div>

      <section className="card insights fade-up">
        <div className="row between"><h3>✨ AI insights</h3><button className="btn" onClick={() => fetchIns()} disabled={ins.loading}>{ins.data ? 'Refresh' : 'Generate insights'}</button></div>
        {ins.loading && <Spinner label="Gemini is reviewing your week…" />}
        <Alert level="danger">{ins.error}</Alert>
        {ins.data && (
          <div className="stagger">
            <h2>{ins.data.headline}</h2>
            {ins.data.insights.map((x, i) => <div className="insight" key={i}><Badge>{x.priority}</Badge><div><b>{x.title}</b><p>{x.detail}</p></div></div>)}
            <h4>Next 24 hours</h4><ul className="plain">{ins.data.recommendations.map((r, i) => <li key={i}><span>✅</span>{r}</li>)}</ul>
          </div>
        )}
      </section>
    </>
  )
}
