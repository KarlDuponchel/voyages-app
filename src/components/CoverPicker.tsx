import { Check } from 'lucide-react'
import type { CoverTheme } from '../data/types'
import { COVER_THEMES, coverThemeUrl } from '../lib/covers'
import './CoverPicker.css'

/** Choix de la photo d'ambiance d'un voyage (miniatures de public/couvertures), en boutons radio */
export function CoverPicker({ value, onChange }: { value: CoverTheme; onChange: (theme: CoverTheme) => void }) {
  return (
    <fieldset className="field cover-picker">
      <legend className="overline muted">Couverture</legend>
      <div className="cover-picker__grid" role="radiogroup">
        {COVER_THEMES.map((t) => (
          <label key={t.id} className="cover-picker__item">
            <input type="radio" name="cover-theme" value={t.id} checked={value === t.id} onChange={() => onChange(t.id)} />
            <img src={coverThemeUrl(t.id)} alt="" draggable={false} />
            <span className="cover-picker__label">{t.label}</span>
            {value === t.id && (
              <span className="cover-picker__check" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
