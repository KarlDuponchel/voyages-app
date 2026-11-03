import { Bug, Check, ImagePlus, Lightbulb, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { sendFeedback, type FeedbackKind } from '../lib/feedback'
import { errorMessage } from '../lib/supabase'
import './FeedbackCard.css'

/**
 * « Un bug, une idée ? » (profil) : un texte, une capture facultative ; l'appareil est joint tout seul.
 * Le message arrive par e-mail à l'équipe, qui peut répondre directement.
 */
export function FeedbackCard() {
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await sendFeedback(kind, message.trim(), location.pathname, screenshot ?? undefined)
      setSent(true)
      setMessage('')
      setScreenshot(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div className="card profil-card feedback">
        <span className="strong feedback__thanks">
          <Check size={18} aria-hidden /> Merci, c'est bien reçu !
        </span>
        <span className="caption muted">On lit tout. Si une réponse est utile, elle arrivera sur votre adresse e-mail.</span>
        <button className="btn btn--ghost" onClick={() => setSent(false)}>
          Envoyer autre chose
        </button>
      </div>
    )

  return (
    <div className="card profil-card feedback">
      <div className="feedback__kinds" role="radiogroup" aria-label="Type de message">
        <button role="radio" aria-checked={kind === 'bug'} className={kind === 'bug' ? 'is-active' : ''} onClick={() => setKind('bug')}>
          <Bug size={16} aria-hidden /> Un bug
        </button>
        <button role="radio" aria-checked={kind === 'idee'} className={kind === 'idee' ? 'is-active' : ''} onClick={() => setKind('idee')}>
          <Lightbulb size={16} aria-hidden /> Une idée
        </button>
      </div>
      <textarea
        className="input feedback__message"
        rows={4}
        maxLength={4000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={kind === 'bug' ? 'Ce que vous faisiez, et ce qui s’est passé…' : 'Ce qui vous plairait dans Tripmates…'}
        aria-label="Votre message"
      />
      <div className="row" style={{ gap: 8 }}>
        {screenshot ? (
          <span className="pill feedback__file">
            {screenshot.name}
            <button onClick={() => setScreenshot(null)} aria-label="Retirer la capture">
              <X size={14} />
            </button>
          </span>
        ) : (
          <button className="btn btn--ghost feedback__attach" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus size={16} /> Capture
          </button>
        )}
        <button className="btn btn--accent" style={{ flex: 1 }} onClick={submit} disabled={busy || !message.trim()}>
          <Send size={16} /> {busy ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          setScreenshot(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      <span className="caption muted">Votre type d'appareil est joint pour nous aider à comprendre.</span>
      {error && (
        <span className="caption form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
