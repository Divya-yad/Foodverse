import { clamp, fmt, pct, scoreTone, statusTone, titleCase } from './format'

describe('format helpers', () => {
  it('formats numbers safely', () => {
    expect(fmt(12.345, 1)).toBe('12.3')
    expect(fmt(null)).toBe('–')
    expect(fmt(undefined)).toBe('–')
  })
  it('clamps and computes percentages', () => {
    expect(clamp(150)).toBe(100)
    expect(clamp(-3)).toBe(0)
    expect(pct(50, 200)).toBe(25)
    expect(pct(5, 0)).toBe(0)
  })
  it('maps statuses to tones', () => {
    expect(statusTone('Fresh')).toBe('good')
    expect(statusTone('Moderately Fresh')).toBe('warn')
    expect(statusTone('Spoiled')).toBe('bad')
    expect(statusTone('non_compliant')).toBe('bad')
    expect(scoreTone(80)).toBe('good')
    expect(scoreTone(30)).toBe('bad')
  })
  it('title-cases snake_case', () => expect(titleCase('hair_cap')).toBe('Hair Cap'))
})
