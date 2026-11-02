import { useState } from 'react'

type IconName = 'arrow' | 'chevron' | 'globe' | 'menu' | 'pin' | 'plus' | 'sparkles'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" /></>,
    menu: <><path d="M4 8h16M4 16h16" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    sparkles: <><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" /><path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14Z" /></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const places = [
  { city: 'Lisbonne', country: 'Portugal', x: 32, y: 40, flag: 'PT', color: '#F26B4B' },
  { city: 'Reykjavík', country: 'Islande', x: 40, y: 21, flag: 'IS', color: '#256B5D' },
  { city: 'Kyoto', country: 'Japon', x: 77, y: 43, flag: 'JP', color: '#EAAE3E' },
  { city: 'Cape Town', country: 'Afrique du Sud', x: 51, y: 76, flag: 'ZA', color: '#7968AC' },
]

function AppPreview() {
  const [activePlace, setActivePlace] = useState(0)
  const place = places[activePlace]

  return (
    <div className="app-preview" aria-label="Aperçu de l'application">
      <div className="preview-topbar">
        <div className="preview-brand">
          <span className="mini-logo"><Icon name="globe" size={15} /></span>
          <strong>WAYFARER</strong>
        </div>
        <button className="round-button" aria-label="Ajouter un voyage"><Icon name="plus" size={18} /></button>
      </div>

      <div className="preview-heading">
        <p>MON MONDE</p>
        <h2>Déjà tant de chemin.</h2>
      </div>

      <div className="globe-wrap">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <svg className="globe-art" viewBox="0 0 600 600" role="img" aria-label="Globe montrant les régions visitées">
          <defs>
            <clipPath id="globeClip"><circle cx="300" cy="300" r="246" /></clipPath>
            <radialGradient id="ocean" cx="32%" cy="24%" r="80%">
              <stop offset="0%" stopColor="#fffdf5" />
              <stop offset="100%" stopColor="#e5e5d2" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="255" fill="#d7d7c7" opacity=".3" />
          <circle cx="300" cy="300" r="246" fill="url(#ocean)" stroke="#163f37" strokeWidth="2" />
          <g clipPath="url(#globeClip)" fill="none" stroke="#b7b9a6" strokeWidth="1.2" opacity=".65">
            <ellipse cx="300" cy="300" rx="100" ry="246" />
            <ellipse cx="300" cy="300" rx="190" ry="246" />
            <ellipse cx="300" cy="300" rx="246" ry="80" />
            <ellipse cx="300" cy="300" rx="246" ry="165" />
            <path d="M54 300h492" />
          </g>
          <g clipPath="url(#globeClip)">
            <path className="land land-europe" d="M254 119 294 100l44 11 18 23 45 8 24 28-14 28-44-4-18 21-38-3-15 35-39 6-25-27 13-33-23-31Z" />
            <path className="land land-africa" d="m255 251 67-25 70 28 16 51-29 39-8 76-38 65-43-22-10-70-38-49-15-55Z" />
            <path className="land land-asia" d="m365 140 91-30 100 38 42 50-23 52-68 17-28 44-42-20-32-47-52-31 15-34Z" />
            <path className="land land-america" d="m50 127 73-35 68 22 38 44-35 41-28 58-41 18-20-54-53-30Z" />
            <path className="land land-samerica" d="m131 270 67 16 26 48-20 67-36 87-35-52 10-62-30-54Z" />
            <path className="land land-australia" d="m462 405 64-23 45 29-8 55-60 19-48-31Z" />
            <path className="visited visited-one" d="m258 126 36-18 31 8 13 18-28 21-16 31-38-2-13-28Z" />
            <path className="visited visited-two" d="m343 251 47 17 12 38-24 35-10 70-35 61-25-28 2-70-27-54 14-50Z" />
            <path className="visited visited-three" d="m457 168 67 2 42 29-17 36-50 13-19 31-40-11-20-41Z" />
          </g>
        </svg>

        {places.map((item, index) => (
          <button
            key={item.city}
            className={`map-pin ${activePlace === index ? 'active' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%`, '--pin-color': item.color } as React.CSSProperties}
            onClick={() => setActivePlace(index)}
            aria-label={`Voir ${item.city}`}
          >
            <span />
          </button>
        ))}

        <div className="place-card">
          <span className="flag-badge">{place.flag}</span>
          <span><strong>{place.city}</strong><small>{place.country}</small></span>
          <button aria-label="Lieu suivant" onClick={() => setActivePlace((activePlace + 1) % places.length)}><Icon name="arrow" size={17} /></button>
        </div>
      </div>

      <div className="stats-row">
        <div><strong>24</strong><span>Pays</span></div>
        <div><strong>4</strong><span>Continents</span></div>
        <div><strong>68</strong><span>Villes</span></div>
      </div>
    </div>
  )
}

const palette = [
  { name: 'Forest', value: '#183F37', className: 'forest' },
  { name: 'Deep Forest', value: '#0F302A', className: 'deep-forest' },
  { name: 'Warm Cream', value: '#F7F3E9', className: 'warm-cream' },
  { name: 'Paper', value: '#FFFCF4', className: 'paper' },
  { name: 'Travel Coral', value: '#F26B4B', className: 'travel-coral' },
  { name: 'Golden Hour', value: '#E9AD3A', className: 'golden-hour' },
  { name: 'Soft Sage', value: '#DFE5CF', className: 'soft-sage' },
]

function MobileHomeMockup() {
  const [liked, setLiked] = useState(false)

  return (
    <div className="iphone-shell" aria-label="Maquette de la page d'accueil mobile Wayfarer">
      <div className="iphone-buttons left-one" />
      <div className="iphone-buttons left-two" />
      <div className="iphone-buttons right-one" />
      <div className="iphone-screen">
        <div className="dynamic-island" />
        <div className="status-bar"><strong>9:41</strong><span>● ◒ ▰</span></div>
        <div className="mobile-app-header">
          <div>
            <span className="mobile-kicker">BONJOUR, MARION</span>
            <h3>Où êtes-vous<br />allée ?</h3>
          </div>
          <button className="profile-avatar" aria-label="Ouvrir votre profil">ML</button>
        </div>

        <button className="add-trip-button"><Icon name="plus" size={17} /> Ajouter un voyage</button>

        <div className="mobile-map">
          <div className="mobile-map-grid grid-one" />
          <div className="mobile-map-grid grid-two" />
          <span className="mini-continent america" />
          <span className="mini-continent europe" />
          <span className="mini-continent africa" />
          <span className="mini-continent asia" />
          <span className="mini-map-pin pin-a" />
          <span className="mini-map-pin pin-b" />
          <span className="mini-map-pin pin-c" />
          <div className="map-progress"><strong>24</strong><span>pays visités</span></div>
          <button className="expand-map" aria-label="Agrandir la carte">↗</button>
        </div>

        <div className="mobile-stats">
          <div><strong>24</strong><span>Pays</span></div>
          <div><strong>68</strong><span>Villes</span></div>
          <div><strong>38%</strong><span>Exploré</span></div>
        </div>

        <div className="mobile-section-title">
          <div><span>SOUVENIRS RÉCENTS</span><strong>Revivez vos voyages</strong></div>
          <button>Tout voir</button>
        </div>
        <div className="memory-card">
          <img src="https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?auto=format&fit=crop&w=700&q=82" alt="Pagode traditionnelle dans une rue de Kyoto à la lumière dorée" />
          <div className="memory-overlay">
            <span>12 — 21 MAI 2024</span>
            <strong>Kyoto, Japon</strong>
            <small>18 souvenirs · 9 jours</small>
          </div>
          <button className={liked ? 'liked' : ''} onClick={() => setLiked(!liked)} aria-label="Ajouter Kyoto aux favoris">{liked ? '♥' : '♡'}</button>
        </div>

        <div className="mobile-tabbar">
          <span className="glass-shine" />
          <button className="active"><Icon name="globe" size={19} /><span>Monde</span></button>
          <button><Icon name="pin" size={19} /><span>Voyages</span></button>
          <button className="tab-add"><Icon name="plus" size={21} /></button>
          <button><Icon name="sparkles" size={19} /><span>Souvenirs</span></button>
          <button><span className="tiny-profile">ML</span><span>Profil</span></button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToApp = () => document.querySelector('#apercu')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <main>
      <nav className="navbar" aria-label="Navigation principale">
        <a className="brand" href="#" aria-label="Wayfarer, accueil">
          <span className="brand-mark"><Icon name="globe" size={18} /></span>
          <span>WAYFARER</span>
        </a>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#mobile">L'app</a>
          <a href="#temoignage">Notre vision</a>
        </div>

        <button className="nav-cta" onClick={scrollToApp}>
          Commencer
          <Icon name="arrow" size={17} />
        </button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu"><Icon name="menu" /></button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Icon name="sparkles" size={17} /> Votre monde, à votre façon</div>
          <h1>Chaque voyage<br />laisse une <em>trace.</em></h1>
          <p className="hero-lead">Marquez les endroits qui ont compté. Visualisez votre parcours. Gardez précieusement l'histoire de vos aventures.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={scrollToApp}>Créer ma carte <Icon name="arrow" size={18} /></button>
            <button className="text-button" onClick={scrollToApp}><span className="play-icon">▶</span> Découvrir l'app</button>
          </div>
          <div className="social-proof">
            <div className="avatar-stack">
              <span>ML</span><span>EA</span><span>SB</span><span>+</span>
            </div>
            <div><strong>12 000+ voyageurs</strong><span>racontent déjà leur monde</span></div>
          </div>
        </div>

        <div className="hero-visual" id="apercu">
          <div className="sun-shape" />
          <div className="doodle doodle-one">✦</div>
          <div className="doodle doodle-two">⌁</div>
          <AppPreview />
          <div className="floating-note note-left">
            <span><Icon name="pin" size={17} /></span>
            <div><small>DERNIER VOYAGE</small><strong>Kyoto, Japon</strong></div>
          </div>
          <div className="floating-note note-right">
            <strong>38%</strong>
            <span>du monde<br />exploré</span>
          </div>
        </div>
      </section>

      <section className="feature-strip" id="fonctionnalites">
        <div className="feature-intro">
          <span>01 — VOTRE CARTE</span>
          <p>Un journal vivant de vos aventures, pensé pour évoluer avec vous.</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon"><Icon name="globe" /></span>
          <div><strong>Visualisez votre monde</strong><p>Pays, villes et souvenirs réunis sur une carte personnelle.</p></div>
        </div>
        <div className="feature-item">
          <span className="feature-icon coral"><Icon name="pin" /></span>
          <div><strong>Ajoutez en un instant</strong><p>Quelques secondes suffisent pour enrichir votre histoire.</p></div>
        </div>
        <div className="feature-item">
          <span className="feature-icon gold">↗</span>
          <div><strong>Suivez votre parcours</strong><p>Des statistiques inspirantes, jamais une course aux chiffres.</p></div>
        </div>
      </section>

      <section className="mobile-showcase" id="mobile">
        <div className="mobile-showcase-copy">
          <span className="section-number">02 — DANS VOTRE POCHE</span>
          <h2>Votre monde.<br /><em>Toujours avec vous.</em></h2>
          <p>Une homepage pensée comme un point de départ : retrouvez votre carte, mesurez le chemin parcouru et replongez dans vos derniers souvenirs.</p>
          <ul className="app-benefits">
            <li><span>01</span><div><strong>Votre carte en un regard</strong><p>Les pays visités et votre progression au premier plan.</p></div></li>
            <li><span>02</span><div><strong>Des souvenirs vivants</strong><p>Vos voyages récents racontés comme de belles histoires.</p></div></li>
            <li><span>03</span><div><strong>Une navigation naturelle</strong><p>Tout ce qui compte accessible au pouce, sans effort.</p></div></li>
          </ul>
        </div>
        <div className="phone-stage">
          <span className="phone-orbit orbit-a" />
          <span className="phone-orbit orbit-b" />
          <span className="phone-caption caption-one">Votre monde<br /><strong>en mouvement</strong></span>
          <span className="phone-caption caption-two"><strong>68</strong><br />villes racontées</span>
          <MobileHomeMockup />
        </div>
      </section>

      <section className="palette-section" id="palette">
        <div className="palette-header">
          <div>
            <span className="section-number">03 — IDENTITÉ</span>
            <h2>La palette Wayfarer</h2>
          </div>
          <div className="palette-downloads">
            <a href="/wayfarer-palette.css" download>Exporter en CSS <Icon name="arrow" size={16} /></a>
            <a href="/wayfarer-palette.json" download>Exporter en JSON <Icon name="arrow" size={16} /></a>
          </div>
        </div>
        <div className="swatch-grid">
          {palette.map((color) => (
            <div className={`swatch ${color.className}`} key={color.name}>
              <span className="swatch-color" />
              <div><strong>{color.name}</strong><code>{color.value}</code></div>
            </div>
          ))}
        </div>
      </section>

      <section className="manifesto" id="temoignage">
        <p className="section-kicker">LE MONDE EST VASTE</p>
        <blockquote>“On ne se souvient pas des jours,<br />on se souvient des <em>moments.</em>”</blockquote>
        <button className="secondary-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Commencer mon histoire <Icon name="arrow" size={18} /></button>
      </section>

      <footer>
        <a className="brand" href="#"><span className="brand-mark"><Icon name="globe" size={18} /></span><span>WAYFARER</span></a>
        <p>Votre monde mérite d'être raconté.</p>
        <span>© 2025 Wayfarer</span>
      </footer>
    </main>
  )
}
