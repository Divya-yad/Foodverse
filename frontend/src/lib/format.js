export const fmt = (n, d = 0) => (n === null || n === undefined || Number.isNaN(+n) ? '–' : (+n).toFixed(d))
export const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n))
export const pct = (a, b) => (b ? clamp(Math.round((a / b) * 100), 0, 999) : 0)
export const localOffset = () => -new Date().getTimezoneOffset()
export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const statusTone = (status = '') => {
  const s = status.toLowerCase()
  if (['fresh', 'compliant', 'low'].includes(s)) return 'good'
  if (['moderately fresh', 'partial', 'medium', 'mild', 'moderate'].includes(s)) return 'warn'
  if (['spoiled', 'non_compliant', 'high', 'severe'].includes(s)) return 'bad'
  return 'muted'
}

export const scoreTone = (v) => (v >= 75 ? 'good' : v >= 50 ? 'warn' : 'bad')

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const KIND = {
  recognition: { label: 'Meal', icon: '🍽️' },
  freshness: { label: 'Freshness', icon: '🥬' },
  hygiene: { label: 'Hygiene', icon: '🧼' },
  cooking: { label: 'Recipe', icon: '👩‍🍳' },
  mealplan: { label: 'Meal plan', icon: '🗓️' },
}
