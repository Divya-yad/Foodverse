import { useCallback, useEffect, useState } from 'react'
import { ResultView } from '../components/results'
import { Alert, Badge, Empty, Modal, PageHeader, Spinner, Tabs } from '../components/ui'
import { api } from '../lib/api'
import { fmt, fmtDate, KIND } from '../lib/format'
import { useTask } from '../lib/hooks'

export default function History() {
  const [kind, setKind] = useState('all')
  const [open, setOpen] = useState(null)
  const load = useCallback((k) => api('/analyses', { query: { limit: 60, ...(k !== 'all' && { kind: k }) } }), [])
  const [list, fetchList] = useTask(load)
  useEffect(() => { fetchList(kind) }, [kind, fetchList])

  const remove = async (a) => { if (confirm(`Delete “${a.title}”?`)) { await api(`/analyses/${a.id}`, { method: 'DELETE' }); setOpen(null); fetchList(kind) } }
  const toggleLog = async (a) => { const u = await api(`/analyses/${a.id}`, { method: 'PATCH', json: { logged: !a.logged } }); setOpen(u); fetchList(kind) }

  return (
    <>
      <PageHeader icon="🗂️" title="History & reports" subtitle="Every analysis is saved. Open one to review, print or export it." />
      <Tabs tabs={[['all', 'All'], ...Object.entries(KIND).map(([k, v]) => [k, `${v.icon} ${v.label}`])]} value={kind} onChange={setKind} />
      {list.loading && !list.data && <Spinner label="Loading…" />}
      <Alert level="danger">{list.error}</Alert>
      {list.data?.length === 0 && <Empty>Nothing here yet. Run your first analysis!</Empty>}
      <div className="list stagger">
        {list.data?.map((a, i) => (
          <button className="card row-item" key={a.id} style={{ '--i': i }} onClick={() => setOpen(a)}>
            <span className="kind-icon">{KIND[a.kind]?.icon}</span>
            <div className="grow"><b>{a.title}</b><small>{KIND[a.kind]?.label} · {fmtDate(a.created_at)}{a.calories != null && ` · ${fmt(a.calories)} kcal`}</small></div>
            {a.score != null && <Badge tone={a.score >= 75 ? 'good' : a.score >= 50 ? 'warn' : 'bad'}>{a.score}</Badge>}
          </button>
        ))}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <ResultView analysis={open} />
          <div className="row no-print modal-actions">
            <button className="btn ghost" onClick={() => window.print()}>🖨️ Print / save PDF</button>
            {open.kind === 'recognition' && <button className="btn ghost" onClick={() => toggleLog(open)}>{open.logged ? 'Remove from food log' : 'Add to food log'}</button>}
            <button className="btn danger" onClick={() => remove(open)}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  )
}
