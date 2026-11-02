import { useEffect, useRef, useState } from 'react'
import { clamp, fmt, scoreTone, statusTone, titleCase } from '../lib/format'

export function ScoreRing({ value = 0, max = 100, size = 120, label, caption, tone }) {
  const R = 46
  const C = 2 * Math.PI * R
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setShown(clamp((value / max) * 100))); return () => cancelAnimationFrame(t) }, [value, max])
  const t = tone || scoreTone((value / max) * 100)
  return (
    <div className={`ring ring-${t}`} style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'} ${fmt(value)} of ${max}`}>
      <svg viewBox="0 0 120 120">
        <circle className="ring-track" cx="60" cy="60" r={R} />
        <circle className="ring-bar" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C - (C * shown) / 100} />
      </svg>
      <div className="ring-text"><strong>{fmt(value)}</strong>{caption && <small>{caption}</small>}</div>
    </div>
  )
}

export function MacroBars({ totals, targets }) {
  const rows = [
    ['Protein', 'protein_g', 'var(--c-protein)'],
    ['Carbs', 'carbs_g', 'var(--c-carbs)'],
    ['Fat', 'fat_g', 'var(--c-fat)'],
  ]
  return (
    <div className="macros">
      {rows.map(([label, key, color], i) => {
        const goal = targets?.[key]
        const w = goal ? clamp((totals[key] / goal) * 100) : clamp((totals[key] / Math.max(totals.protein_g + totals.carbs_g + totals.fat_g, 1)) * 100)
        return (
          <div key={key} className="macro" style={{ '--i': i }}>
            <div className="macro-head"><span>{label}</span><b>{fmt(totals[key], 1)} g{goal ? ` / ${goal} g` : ''}</b></div>
            <div className="bar"><i style={{ width: `${w}%`, background: color }} /></div>
          </div>
        )
      })}
    </div>
  )
}

export const Badge = ({ tone, children }) => <span className={`badge badge-${tone || statusTone(String(children))}`}>{children}</span>
export const StatusBadge = ({ status }) => <Badge tone={statusTone(status)}>{titleCase(status)}</Badge>

export const Alert = ({ level = 'info', children }) => (children ? <div className={`alert alert-${level}`} role={level === 'danger' ? 'alert' : 'status'}>{children}</div> : null)
export const Spinner = ({ label = 'Working…' }) => <div className="spinner-wrap"><span className="spinner" aria-hidden /> <span>{label}</span></div>
export const PageHeader = ({ icon, title, subtitle, children }) => (
  <header className="page-head">
    <div><h1><span className="head-icon">{icon}</span> {title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children}
  </header>
)
export const Empty = ({ icon = '🍃', children }) => <div className="empty"><div>{icon}</div><p>{children}</p></div>

export function UploadZone({ accept, file, onFile, hint, busy, icon = '📷', scanLabel = 'Analyzing…' }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file) { setUrl(null); return }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  const pick = (f) => f && onFile(f)
  const kind = file?.type?.split('/')[0]
  return (
    <div
      className={`dropzone ${over ? 'over' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}
      onClick={() => !busy && input.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
    >
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files[0])} data-testid="file-input" />
      {url && kind === 'image' && <img src={url} alt="Selected upload preview" />}
      {url && kind === 'video' && <video src={url} controls muted onClick={(e) => e.stopPropagation()} />}
      {url && kind === 'audio' && <audio src={url} controls onClick={(e) => e.stopPropagation()} />}
      {!file && <div className="dz-empty"><div className="dz-icon">{icon}</div><b>Drop a file or click to browse</b><small>{hint}</small></div>}
      {file && !busy && <small className="dz-change">{file.name} · click to change</small>}
      {busy && <div className="scan"><div className="scan-line" /><span>{scanLabel}</span></div>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  )
}

export function Modal({ onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x no-print" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  )
}
