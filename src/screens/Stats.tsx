import { BedDouble, ChevronLeft, Globe2, MapPin, Plane, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatNumber } from '../lib/format'
import { useStats } from '../lib/useStats'
import './Stats.css'

const continentColors: Record<string, string> = {
  Europe: 'var(--accent-sunset)',
  Afrique: 'var(--accent-sun)',
  'Amérique du Nord': 'var(--accent-lagoon)',
  Asie: 'var(--accent-lavender)',
  'Amérique du Sud': 'var(--accent-sunset)',
  Océanie: 'var(--accent-lagoon)',
}

export function Stats() {
  const navigate = useNavigate()
  const s = useStats()
  const continents = [...s.continents].sort((a, b) => b.percent - a.percent)

  const fun = [
    { Icon: Globe2, color: 'var(--accent-lagoon)', value: `${formatNumber(s.km)} km`, label: `≈ ${formatNumber(s.earthTurns, 1)} tour de la Terre` },
    { Icon: Plane, color: 'var(--accent-sunset)', value: `${s.flights} vols`, label: `${s.trips} voyages terminés` },
    { Icon: BedDouble, color: 'var(--accent-lavender)', value: `${s.nights} nuits`, label: 'loin de la maison' },
    {
      Icon: MapPin,
      color: 'var(--accent-sun)',
      value: s.farthest ? `${formatNumber(s.farthest.km)} km` : '—',
      label: s.farthest ? `le plus loin : ${s.farthest.name}` : s.hasHome ? 'pas encore de voyage' : 'ville de départ à renseigner',
    },
  ]

  return (
    <main className="screen screen--no-tabbar">
      <header className="px stack" style={{ gap: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <h1 className="display-xl">Statistiques</h1>
      </header>

      <section className="px">
        <div className="card stats-card">
          <div className="row between">
            <h2 className="title-m">Par continent</h2>
            <span className="caption muted">
              {s.continentsVisited} / {s.continentsTotal}
            </span>
          </div>
          {continents.map((c) => (
            <div key={c.name} className="stack" style={{ gap: 6 }}>
              <div className="row between">
                <span className="caption">{c.name}</span>
                <span className="caption muted">
                  {formatNumber(c.percent)} % · {c.visited} / {c.total}
                </span>
              </div>
              <div className="stats-bar">
                {c.visited > 0 && <span style={{ width: `${Math.max(2, c.percent)}%`, background: continentColors[c.name] }} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px stats-grid">
        {fun.map(({ Icon, color, value, label }) => (
          <div key={label} className="card stats-fun">
            <Icon size={20} style={{ color }} />
            <span className="title-m" style={{ fontSize: 20 }}>
              {value}
            </span>
            <span className="caption muted">{label}</span>
          </div>
        ))}
      </section>

      {!s.hasHome && (
        <p className="px caption muted" style={{ margin: 0 }}>
          Pour des distances exactes, indiquez votre ville de départ dans le <Link to="/profil" className="strong">profil</Link>.
        </p>
      )}

      <section className="px">
        <div className="stats-wrapped">
          <Sparkles size={22} />
          <div className="stack" style={{ gap: 2 }}>
            <span className="strong">Votre année {new Date().getFullYear()} en voyages</span>
            <span className="caption" style={{ opacity: 0.75 }}>
              Le bilan arrive le 31 décembre
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
