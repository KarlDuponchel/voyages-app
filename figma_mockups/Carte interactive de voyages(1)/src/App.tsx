import { useMemo, useState } from 'react'

type Page = 'world' | 'trips' | 'memories' | 'explore'
type TripTab = 'itinerary' | 'tickets' | 'budget' | 'photos'
type IconName = 'arrow' | 'back' | 'bed' | 'calendar' | 'camera' | 'check' | 'chevron' | 'close' | 'download' | 'eye' | 'globe' | 'heart' | 'home' | 'image' | 'menu' | 'moon' | 'more' | 'plane' | 'plus' | 'search' | 'share' | 'sparkles' | 'ticket' | 'train' | 'trash' | 'upload' | 'user' | 'wallet'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    bed: <><path d="M3 12h18v7M3 5v14M6 12V8h6a3 3 0 0 1 3 3v1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    camera: <><path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12.5" r="4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3-14.6 0-18" /></>,
    heart: <path d="M20.8 5.8a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.2a5.4 5.4 0 0 0-7.7 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z" />,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    moon: <path d="M20 15.2A8 8 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    plane: <><path d="M22 2 9 15" /><path d="m22 2-7 20-4-9-9-4Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5m-8 7 8 5" /></>,
    sparkles: <><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" /><path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14Z" /></>,
    ticket: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6Z" /><path d="M13 5v14" /></>,
    train: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 21l2-3m6 3-2-3M5 11h14M9 7h.01M15 7h.01" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    upload: <><path d="M12 16V4m0 0-5 5m5-5 5 5M4 20h16" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    wallet: <><path d="M4 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" /><path d="M16 12h5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const photos = {
  lisbon: 'https://images.unsplash.com/photo-1733418750591-6b47d7614c7b?auto=format&fit=crop&w=1200&q=85',
  lisbon2: 'https://images.unsplash.com/photo-1733356233079-f342ec3cab6f?auto=format&fit=crop&w=900&q=82',
  lisbon3: 'https://images.unsplash.com/photo-1766935974794-cd0c188e7674?auto=format&fit=crop&w=900&q=82',
  lisbon4: 'https://images.unsplash.com/photo-1749063006309-8f0eb9b0a527?auto=format&fit=crop&w=900&q=82',
  kyoto: 'https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?auto=format&fit=crop&w=1000&q=82',
  kyoto2: 'https://images.unsplash.com/photo-1558862107-d49ef2a04d72?auto=format&fit=crop&w=900&q=82',
  iceland: 'https://images.unsplash.com/photo-1563484549801-f2abe0cf5bfa?auto=format&fit=crop&w=1000&q=82',
  iceland2: 'https://images.unsplash.com/photo-1652993827791-dcf53591ba76?auto=format&fit=crop&w=1000&q=82',
  marrakech: 'https://images.unsplash.com/photo-1708823080827-a11573390498?auto=format&fit=crop&w=1000&q=82',
  newyork: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1000&q=82',
  cyclades: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=82',
}

const trips = [
  { title: 'Lisbonne & Porto', date: '20 — 27 nov. 2026', flag: '🇵🇹', image: photos.lisbon, upcoming: true },
  { title: 'Kyoto & Tokyo', date: '12 — 23 mai 2026', flag: '🇯🇵', image: photos.kyoto },
  { title: 'Road trip en Islande', date: '4 — 15 août 2025', flag: '🇮🇸', image: photos.iceland },
  { title: 'New York', date: '8 — 14 avr. 2025', flag: '🇺🇸', image: photos.newyork },
  { title: 'Cyclades', date: '17 — 28 juin 2024', flag: '🇬🇷', image: photos.cyclades },
  { title: 'Marrakech', date: '2 — 7 mars 2024', flag: '🇲🇦', image: photos.marrakech },
]

function TopDock({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: { id: Page; label: string; icon: IconName }[] = [
    { id: 'world', label: 'Monde', icon: 'globe' },
    { id: 'trips', label: 'Voyages', icon: 'plane' },
    { id: 'memories', label: 'Souvenirs', icon: 'image' },
    { id: 'explore', label: 'Explorer', icon: 'sparkles' },
  ]
  return (
    <div className="top-dock">
      <button className="app-logo" onClick={() => setPage('world')} aria-label="Tripmates, accueil"><Icon name="globe" size={23} /><span>T</span></button>
      <nav>
        {items.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)} aria-label={item.label}><Icon name={item.icon} /><span>{item.label}</span></button>)}
      </nav>
      <button className="profile-button" aria-label="Profil de Camille"><span>CM</span><i>Profil</i></button>
    </div>
  )
}

function Topbar({ title, subtitle, onNew }: { title: string; subtitle: string; onNew: () => void }) {
  return (
    <header className="topbar">
      <div><span className="eyebrow-label">{subtitle}</span><h1>{title}</h1></div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Recherche"><Icon name="search" /></button>
        <div className="travelers"><span>CM</span><span>HG</span></div>
        <button className="primary-action" onClick={onNew}><Icon name="plus" size={18} />Nouveau voyage</button>
      </div>
    </header>
  )
}

function Globe() {
  const [turn, setTurn] = useState(0)
  return (
    <div className="desktop-globe-wrap" onPointerMove={(e) => e.buttons && setTurn((v) => v + e.movementX * .25)}>
      <span className="drag-hint"><Icon name="globe" size={14} /> Faites glisser pour explorer</span>
      <svg className="desktop-globe" viewBox="0 0 600 600" style={{ transform: `rotate(${turn * .04}deg)` }} role="img" aria-label="Globe des pays visités">
        <defs><clipPath id="desktopGlobeClip"><circle cx="300" cy="300" r="245" /></clipPath></defs>
        <circle cx="300" cy="300" r="250" className="ocean" />
        <g clipPath="url(#desktopGlobeClip)" className="meridians"><ellipse cx="300" cy="300" rx="85" ry="245" /><ellipse cx="300" cy="300" rx="175" ry="245" /><ellipse cx="300" cy="300" rx="245" ry="80" /><ellipse cx="300" cy="300" rx="245" ry="165" /><path d="M55 300h490" /></g>
        <g clipPath="url(#desktopGlobeClip)">
          <path className="globe-land" d="m53 135 80-45 78 28 43 52-30 42-32 71-48 12-29-57-68-34Z" />
          <path className="globe-land" d="m133 289 72 7 32 54-17 70-45 86-43-61 14-67-34-50Z" />
          <path className="globe-land visited-land" d="m249 119 57-24 55 27 68 15 32 42-38 39-57-12-31 46-62 8-42-51 17-49Z" />
          <path className="globe-land" d="m270 258 83-26 67 42-5 57-34 37-11 84-42 48-39-45-11-78-37-48Z" />
          <path className="globe-land visited-land" d="m382 141 88-42 102 48 35 63-35 56-67 9-31 47-44-17-29-55-56-36Z" />
          <path className="globe-land" d="m471 407 65-24 49 36-10 57-66 16-48-37Z" />
          <g className="city-dots"><circle cx="286" cy="177" r="7" /><circle cx="393" cy="187" r="7" /><circle cx="469" cy="209" r="7" /><circle cx="152" cy="193" r="7" /><circle cx="343" cy="314" r="7" /></g>
        </g>
      </svg>
      <span className="globe-caption">14 pays visités</span>
    </div>
  )
}

function CityCard({ city, image, count, people }: { city: string; image: string; count: number; people: string }) {
  return (
    <button className="city-card">
      <img src={image} alt={city} />
      <span className="trend-tag">TENDANCE</span>
      <div><strong>{city}</strong><small>{count} photos · {people} voyageurs</small><span><Icon name="heart" size={13} /> {Math.floor(count * 2.4)}</span></div>
    </button>
  )
}

function WorldScreen({ onNew, goTrips }: { onNew: () => void; goTrips: () => void }) {
  return (
    <>
      <Topbar title="Bonjour Camille." subtitle="VOTRE MONDE" onNew={onNew} />
      <div className="world-layout">
        <section className="globe-card"><Globe /></section>
        <section className="world-side">
          <div className="progress-card">
            <span className="eyebrow-label">MONDE EXPLORÉ</span><div className="progress-title"><strong>7,2%</strong><span>du monde<br />exploré</span></div>
            <div className="progress-track"><i style={{ width: '7.2%' }} /></div>
            <div className="stat-grid"><div><strong>14</strong><span>Pays</span></div><div><strong>4/7</strong><span>Continents</span></div><div><strong>10</strong><span>Villes</span></div></div>
          </div>
          <button className="next-trip-card" onClick={goTrips}>
            <div><span>PROCHAIN DÉPART · J-16</span><h3>Lisbonne<br />& Porto</h3><small>20 — 27 novembre 2026</small></div>
            <span className="round-arrow"><Icon name="arrow" /></span>
            <div className="route-art"><i>ORY</i><span>· · · ✈ · · ·</span><i>LIS</i></div>
          </button>
        </section>
      </div>
      <section className="community-section">
        <div className="section-heading"><div><span className="eyebrow-label">INSPIRATION</span><h2>Les souvenirs de la communauté</h2></div><button>Tout explorer <Icon name="arrow" size={16} /></button></div>
        <div className="city-grid"><CityCard city="Lisbonne" image={photos.lisbon2} count={284} people="62" /><CityCard city="Kyoto" image={photos.kyoto} count={198} people="47" /><CityCard city="Marrakech" image={photos.marrakech} count={156} people="39" /></div>
      </section>
    </>
  )
}

function TripList({ selected, setSelected }: { selected: number; setSelected: (v: number) => void }) {
  return (
    <aside className="trip-list">
      <div className="list-section-title"><span>À VENIR</span><small>1 voyage</small></div>
      <button className={`trip-list-card ${selected === 0 ? 'active' : ''}`} onClick={() => setSelected(0)}><img src={trips[0].image} alt="" /><div><strong>{trips[0].title}</strong><span>{trips[0].date}</span><small>{trips[0].flag} · Camille & Hugo</small></div></button>
      <div className="list-section-title"><span>VOS VOYAGES</span><small>5 voyages</small></div>
      {trips.slice(1).map((trip, i) => <button className={`trip-list-card ${selected === i + 1 ? 'active' : ''}`} key={trip.title} onClick={() => setSelected(i + 1)}><img src={trip.image} alt="" /><div><strong>{trip.title}</strong><span>{trip.date}</span><small>{trip.flag} · {i % 2 ? 'Camille' : 'Camille & Hugo'}</small></div></button>)}
    </aside>
  )
}

const timeline = [
  { time: '07:15', title: 'Vol Paris → Lisbonne', meta: 'TAP Air Portugal · TP 433', icon: 'plane' as IconName, tone: 'coral' },
  { time: '11:30', title: 'Casa do Largo', meta: 'Check-in · 3 nuits', icon: 'bed' as IconName, tone: 'lavender' },
  { time: '15:00', title: 'Tram 28 & Alfama', meta: 'Balade · 3 h', icon: 'sparkles' as IconName, tone: 'lagoon' },
  { time: '19:45', title: 'Dîner chez Prado', meta: 'Table pour 2 · Confirmé', icon: 'calendar' as IconName, tone: 'gold' },
]

function Itinerary() {
  return (
    <div className="itinerary-grid">
      <div className="day-plan">
        <div className="day-header"><div><span>JOUR 1</span><h3>Vendredi 20 novembre</h3></div><button><Icon name="plus" size={16} />Ajouter</button></div>
        <div className="timeline">
          {timeline.map((item) => <div className="timeline-item" key={item.time}><time>{item.time}</time><span className={`timeline-icon ${item.tone}`}><Icon name={item.icon} size={18} /></span><div><strong>{item.title}</strong><small>{item.meta}</small></div><button><Icon name="more" /></button></div>)}
        </div>
        <div className="next-day"><span>JOUR 2</span><strong>Samedi 21 novembre · Belém</strong><Icon name="chevron" /></div>
        <div className="next-day"><span>JOUR 4</span><strong>Lundi 23 novembre · Train vers Porto</strong><Icon name="train" /></div>
      </div>
      <aside className="route-map">
        <span className="eyebrow-label">VOTRE TRAJET</span>
        <div className="map-paper"><span className="coast coast-one" /><span className="coast coast-two" /><i className="route-path" /><div className="map-city lis"><b /><strong>Lisbonne</strong><small>3 nuits</small></div><div className="map-city por"><b /><strong>Porto</strong><small>4 nuits</small></div></div>
        <div className="route-summary"><span><Icon name="train" size={16} /> 2 villes</span><span>7 jours</span><strong>324 km</strong></div>
      </aside>
    </div>
  )
}

function Budget({ openExpense }: { openExpense: () => void }) {
  const expenses = [
    ['20 nov.', 'Vol TAP Portugal', 'Transport', 'Camille', '426,00 €'],
    ['20 nov.', 'Casa do Largo', 'Hôtel', 'Hugo', '384,00 €'],
    ['21 nov.', 'Dîner chez Prado', 'Restaurant', 'Camille', '86,50 €'],
    ['21 nov.', 'Tram & Musée', 'Activité', 'Hugo', '38,00 €'],
  ]
  return (
    <div className="budget-screen">
      <div className="budget-top">
        <div className="budget-overview">
          <div><span className="eyebrow-label">TOTAL DÉPENSÉ</span><h3>934,50 €</h3><p>sur 1 450 € prévus</p></div><strong>64%</strong>
          <div className="budget-bar"><i /></div>
          <div className="category-bars"><span style={{ '--w': '45%', '--c': '#F26B4B' } as React.CSSProperties}>Transport <b>426 €</b></span><span style={{ '--w': '38%', '--c': '#B9A8E2' } as React.CSSProperties}>Hôtels <b>384 €</b></span><span style={{ '--w': '15%', '--c': '#E9AD3A' } as React.CSSProperties}>Repas <b>86,50 €</b></span><span style={{ '--w': '8%', '--c': '#7FC4B2' } as React.CSSProperties}>Activités <b>38 €</b></span></div>
        </div>
        <div className="debts-card"><span className="eyebrow-label">QUI DOIT QUOI</span><div className="debt-avatars"><span>HG</span><i>→</i><span>CM</span></div><h3>Hugo doit 133,50 € à Camille</h3><button><Icon name="check" size={16} />Remboursé</button></div>
      </div>
      <div className="expenses">
        <div className="expenses-heading"><div><span className="eyebrow-label">DÉPENSES</span><h3>Toutes les dépenses</h3></div><button className="primary-action" onClick={openExpense}><Icon name="plus" size={17} />Ajouter une dépense</button></div>
        <div className="expense-table"><div className="table-row table-head"><span>Date</span><span>Intitulé</span><span>Catégorie</span><span>Payé par</span><span>Montant</span></div>{expenses.map(row => <div className="table-row" key={row[1]}>{row.map((cell, i) => <span key={cell} className={i === 2 ? `category category-${cell}` : ''}>{cell}</span>)}</div>)}</div>
      </div>
    </div>
  )
}

const gallery = [photos.lisbon, photos.lisbon2, photos.lisbon3, photos.lisbon4, photos.lisbon2, photos.lisbon3, photos.lisbon4, photos.lisbon, photos.lisbon3, photos.lisbon2, photos.lisbon, photos.lisbon4]

function PhotoGrid({ openViewer }: { openViewer: (i: number) => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const [dragging, setDragging] = useState(false)
  const toggle = (index: number) => setSelected(v => v.includes(index) ? v.filter(i => i !== index) : [...v, index])
  return (
    <div className="photos-screen">
      <div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false) }}><span><Icon name="upload" /></span><div><strong>Déposez vos photos ici</strong><small>ou cliquez pour parcourir · JPG, PNG, HEIC</small></div><button>Choisir des photos</button></div>
      {selected.length > 0 && <div className="selection-bar"><strong>{selected.length} photo{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}</strong><div><button><Icon name="eye" size={16} />Rendre publiques</button><button><Icon name="trash" size={16} />Supprimer</button><button onClick={() => setSelected([])}><Icon name="close" size={16} /></button></div></div>}
      <div className="gallery-day"><div><span className="eyebrow-label">VENDREDI 20 NOVEMBRE</span><h3>Premiers pas à Lisbonne</h3></div><small>12 photos</small></div>
      <div className="photo-grid">{gallery.map((photo, i) => <article className={`photo-tile ${selected.includes(i) ? 'selected' : ''}`} key={i}><img src={photo} alt={`Souvenir de Lisbonne ${i + 1}`} onClick={() => openViewer(i)} /><button className="photo-select" onClick={() => toggle(i)}>{selected.includes(i) ? <Icon name="check" size={14} /> : ''}</button><span>Camille</span></article>)}</div>
    </div>
  )
}

function BoardingPass() {
  return (
    <div className="tickets-screen">
      <div className="ticket-heading"><span className="eyebrow-label">VENDREDI 20 NOVEMBRE</span><h3>Paris → Lisbonne</h3><p>Tout ce qu’il vous faut pour partir sereinement.</p></div>
      <div className="boarding-layout">
        <article className="boarding-pass">
          <div className="boarding-main"><div className="airline"><span className="tap-mark">TAP</span><div><strong>Air Portugal</strong><small>TP 433 · ÉCONOMIE</small></div><Icon name="plane" /></div><div className="flight-route"><div><strong>ORY</strong><span>Paris Orly</span><small>07:15</small></div><div className="flight-line"><Icon name="plane" size={18} /><i /></div><div><strong>LIS</strong><span>Lisbonne</span><small>09:45</small></div></div><div className="pass-details"><div><span>PASSAGÈRE</span><strong>CAMILLE MOREAU</strong></div><div><span>DATE</span><strong>20 NOV. 2026</strong></div><div><span>EMBARQUEMENT</span><strong>06:35</strong></div></div></div>
          <div className="boarding-stub"><div><span>PORTE</span><strong>B32</strong></div><div><span>SIÈGE</span><strong>14A</strong></div><div className="barcode">|||| || ||| | |||| || |</div><small>TP0433 020 14A</small></div>
        </article>
        <aside className="ticket-files"><div className="pdf-card"><span><Icon name="ticket" /></span><div><strong>Carte d’embarquement.pdf</strong><small>PDF · 1,2 Mo</small></div><button><Icon name="download" /></button></div><button><Icon name="eye" />Ouvrir le PDF original</button><button><Icon name="share" />Partager avec Hugo</button><div className="ticket-note"><Icon name="check" size={16} /><span><strong>Prêt pour le départ</strong>Document disponible hors ligne</span></div></aside>
      </div>
    </div>
  )
}

function TripDetail({ tab, setTab, openExpense, openViewer }: { tab: TripTab; setTab: (tab: TripTab) => void; openExpense: () => void; openViewer: (i: number) => void }) {
  const tabs: { id: TripTab; label: string }[] = [{ id: 'itinerary', label: 'Itinéraire' }, { id: 'tickets', label: 'Billets' }, { id: 'budget', label: 'Budget' }, { id: 'photos', label: 'Photos' }]
  return (
    <section className="trip-detail">
      <div className="trip-hero"><img src={photos.lisbon} alt="Lisbonne" /><div className="trip-hero-overlay"><span className="trip-status">À VENIR · J-16</span><h2>Lisbonne & Porto</h2><div><span><Icon name="calendar" size={15} />20 — 27 novembre 2026</span><span><Icon name="wallet" size={15} />Budget · 1 450 €</span><span className="travelers small"><i>CM</i><i>HG</i></span></div></div><button className="hero-more"><Icon name="more" /></button></div>
      <div className="trip-tabs">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}{item.id === 'tickets' && <span>3</span>}</button>)}</div>
      <div className="trip-tab-content">{tab === 'itinerary' && <Itinerary />}{tab === 'budget' && <Budget openExpense={openExpense} />}{tab === 'photos' && <PhotoGrid openViewer={openViewer} />}{tab === 'tickets' && <BoardingPass />}</div>
    </section>
  )
}

function TripsScreen({ onNew, openExpense, openViewer }: { onNew: () => void; openExpense: () => void; openViewer: (i: number) => void }) {
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<TripTab>('itinerary')
  return <><Topbar title="Vos voyages." subtitle="PRÉPAREZ, PARTEZ, REVIVEZ" onNew={onNew} /><div className="trips-layout"><TripList selected={selected} setSelected={setSelected} /><TripDetail tab={tab} setTab={setTab} openExpense={openExpense} openViewer={openViewer} /></div></>
}

function MemoriesScreen({ onNew, openViewer }: { onNew: () => void; openViewer: (i: number) => void }) {
  return <><Topbar title="Vos souvenirs." subtitle="TOUS VOS MOMENTS" onNew={onNew} /><div className="memory-page"><div className="memory-filters"><button className="active">Tous</button>{trips.slice(1).map(t => <button key={t.title}>{t.title}</button>)}</div><div className="memory-page-heading"><div><span className="eyebrow-label">MAI 2026</span><h2>Kyoto & Tokyo</h2></div><span>48 photos · Camille & Hugo</span></div><div className="memory-mosaic">{[photos.kyoto, photos.kyoto2, photos.lisbon3, photos.kyoto2, photos.kyoto, photos.marrakech, photos.kyoto2, photos.kyoto].map((p, i) => <button key={i} onClick={() => openViewer(i)}><img src={p} alt={`Souvenir ${i + 1}`} /><span><Icon name="heart" size={14} /> {12 + i}</span></button>)}</div></div></>
}

function ExploreScreen({ onNew, openViewer }: { onNew: () => void; openViewer: (i: number) => void }) {
  const [query, setQuery] = useState('')
  const all = [{ city: 'Lisbonne', img: photos.lisbon }, { city: 'Kyoto', img: photos.kyoto }, { city: 'Islande', img: photos.iceland }, { city: 'Marrakech', img: photos.marrakech }, { city: 'New York', img: photos.newyork }, { city: 'Cyclades', img: photos.cyclades }, { city: 'Lisbonne', img: photos.lisbon3 }, { city: 'Kyoto', img: photos.kyoto2 }]
  const shown = all.filter(p => p.city.toLowerCase().includes(query.toLowerCase()))
  return <div className="dark-screen"><Topbar title="Explorer le monde." subtitle="LA COMMUNAUTÉ TRIPMATES" onNew={onNew} /><div className="explore-search"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une ville, un pays…" /><kbd>⌘ K</kbd></div><section className="trending-cities"><div className="section-heading"><div><span className="eyebrow-label">VILLES TENDANCES</span><h2>Où part-on ensuite ?</h2></div></div><div className="trend-chips">{['Lisbonne', 'Kyoto', 'Marrakech', 'New York', 'Reykjavík'].map((city, i) => <button onClick={() => setQuery(city)} key={city}><span>{['🇵🇹','🇯🇵','🇲🇦','🇺🇸','🇮🇸'][i]}</span>{city}<small>{[284,198,156,142,118][i]} photos</small></button>)}</div></section><section className="explore-feed"><div className="section-heading"><div><span className="eyebrow-label">EN CE MOMENT</span><h2>Le monde vu par vous</h2></div><button>Les plus récentes <Icon name="chevron" size={14} /></button></div><div className="explore-mosaic">{shown.map((item, i) => <button className={`explore-photo item-${i}`} key={`${item.city}-${i}`} onClick={() => openViewer(i)}><img src={item.img} alt={item.city} /><div className="photo-hover"><span><Icon name="heart" size={15} /> {34 + i * 7}</span><span><Icon name="camera" size={15} /> {item.city}</span><small>par {i % 2 ? 'Hugo' : 'Camille'}</small></div></button>)}</div></section></div>
}

function ExpenseModal({ close }: { close: () => void }) {
  const [category, setCategory] = useState('Transport')
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); close() }}><div className="modal-heading"><div><span className="eyebrow-label">LISBONNE & PORTO</span><h2>Ajouter une dépense</h2></div><button type="button" onClick={close}><Icon name="close" /></button></div><label>Montant<div className="amount-input"><input autoFocus inputMode="decimal" placeholder="0,00" /><span>€</span></div></label><label>Intitulé<input placeholder="Ex. Dîner chez Prado" /></label><fieldset><legend>Catégorie</legend><div className="category-pills">{['Transport','Hôtel','Restaurant','Activité'].map((item, i) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}><Icon name={['train','bed','home','sparkles'][i] as IconName} size={16} />{item}</button>)}</div></fieldset><div className="form-row"><label>Date<input type="date" defaultValue="2026-11-20" /></label><label>Payé par<select><option>Camille</option><option>Hugo</option></select></label></div><fieldset><legend>Pour qui ?</legend><div className="split-row"><label><input type="checkbox" defaultChecked /><span>CM</span>Camille<small>50%</small></label><label><input type="checkbox" defaultChecked /><span>HG</span>Hugo<small>50%</small></label></div></fieldset><div className="modal-actions"><button type="button" onClick={close}>Annuler</button><button className="primary-action" type="submit">Ajouter · 0,00 €</button></div></form></div>
}

function NewTripModal({ close }: { close: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="new-trip-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close" /></button><span className="modal-icon"><Icon name="plane" size={27} /></span><span className="eyebrow-label">NOUVELLE AVENTURE</span><h2>Où partez-vous ?</h2><p>Commencez par donner un nom à votre prochain voyage.</p><input autoFocus placeholder="Ex. Week-end à Rome" /><button className="primary-action" onClick={close}>Créer le voyage <Icon name="arrow" /></button></div></div>
}

function Viewer({ index, close, setIndex }: { index: number; close: () => void; setIndex: (i: number) => void }) {
  const safe = (index + gallery.length) % gallery.length
  return <div className="viewer"><button className="viewer-close" onClick={close}><Icon name="close" /></button><button className="viewer-arrow left" onClick={() => setIndex(safe - 1)}><Icon name="back" /></button><div className="viewer-image"><img src={gallery[safe]} alt="Souvenir de Lisbonne en plein écran" /></div><button className="viewer-arrow right" onClick={() => setIndex(safe + 1)}><Icon name="arrow" /></button><aside className="viewer-info"><div className="viewer-author"><span>CM</span><div><strong>Camille Moreau</strong><small>Ajoutée au voyage Lisbonne & Porto</small></div><button><Icon name="more" /></button></div><div className="viewer-meta"><span><Icon name="home" />Lisbonne, Portugal</span><span><Icon name="calendar" />21 novembre 2026 · 17:42</span></div><p>La lumière de fin de journée dans les rues d’Alfama. On pourrait rester ici des heures.</p><div className="reactions"><button>♥ 24</button><button>☀ 8</button><button>✦ 5</button><button><Icon name="plus" size={15} /></button></div></aside><div className="viewer-thumbs">{gallery.slice(0,8).map((p,i) => <button className={safe === i ? 'active' : ''} onClick={() => setIndex(i)} key={i}><img src={p} alt="" /></button>)}</div></div>
}

export default function App() {
  const [page, setPage] = useState<Page>('world')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [newTripOpen, setNewTripOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const screen = useMemo(() => {
    if (page === 'world') return <WorldScreen onNew={() => setNewTripOpen(true)} goTrips={() => setPage('trips')} />
    if (page === 'trips') return <TripsScreen onNew={() => setNewTripOpen(true)} openExpense={() => setExpenseOpen(true)} openViewer={setViewerIndex} />
    if (page === 'memories') return <MemoriesScreen onNew={() => setNewTripOpen(true)} openViewer={setViewerIndex} />
    return <ExploreScreen onNew={() => setNewTripOpen(true)} openViewer={setViewerIndex} />
  }, [page])
  return <main className={`desktop-app page-${page}`}><TopDock page={page} setPage={setPage} /><div className="app-content">{screen}</div>{expenseOpen && <ExpenseModal close={() => setExpenseOpen(false)} />}{newTripOpen && <NewTripModal close={() => setNewTripOpen(false)} />}{viewerIndex !== null && <Viewer index={viewerIndex} close={() => setViewerIndex(null)} setIndex={setViewerIndex} />}</main>
}
