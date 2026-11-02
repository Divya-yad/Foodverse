import { fireEvent, render, screen } from '@testing-library/react'
import { FreshnessResult, RecognitionResult } from './results'
import { MacroBars, ScoreRing, UploadZone } from './ui'

const rec = {
  dish_name: 'Dal Rice', cuisine: 'Indian', source: 'text', transcript: '', health_score: 82, health_summary: 'Balanced',
  totals: { calories: 450, protein_g: 15, carbs_g: 85, fat_g: 5, fiber_g: 10 }, tips: ['Add salad'],
  items: [{ name: 'Dal', portion: '1 bowl', calories: 200, protein_g: 10, carbs_g: 30, fat_g: 4, confidence: 0.9 }],
}

describe('components', () => {
  it('ScoreRing exposes an accessible label', () => {
    render(<ScoreRing value={82} label="Health score" />)
    expect(screen.getByRole('img', { name: /Health score 82 of 100/ })).toBeInTheDocument()
  })
  it('MacroBars renders all macros', () => {
    render(<MacroBars totals={{ protein_g: 10, carbs_g: 20, fat_g: 5 }} />)
    ;['Protein', 'Carbs', 'Fat'].forEach((m) => expect(screen.getByText(m)).toBeInTheDocument())
  })
  it('RecognitionResult shows dish, calories and items', () => {
    render(<RecognitionResult r={rec} />)
    expect(screen.getByText('Dal Rice')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByText('Add salad')).toBeInTheDocument()
  })
  it('FreshnessResult warns when unsafe', () => {
    const r = { food_name: 'Milk', freshness_score: 20, status: 'Spoiled', confidence: 0.9, recommendation: 'Discard', estimated_shelf_life: 'none', safe_to_eat: false, indicators: [], storage_tips: [], disclaimer: 'Visual only' }
    render(<FreshnessResult r={r} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/unsafe/i)
    expect(screen.getByText('Spoiled')).toBeInTheDocument()
  })
  it('UploadZone passes the chosen file up', () => {
    const onFile = vi.fn()
    render(<UploadZone accept="image/*" file={null} onFile={onFile} hint="x" />)
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })
})
