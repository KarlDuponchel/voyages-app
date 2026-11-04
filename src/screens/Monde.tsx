import { BarChart3, Globe2, Map as MapIcon, Plane, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CommunityMemories } from "../components/CommunityMemories";
import { Globe } from "../components/Globe";
import { WorldMap } from "../components/WorldMap";
import { useAuth } from "../data/auth";
import { useTrips } from "../data/store";
import { daysUntil, formatNumber, formatRange } from "../lib/format";
import { visitedCities } from "../lib/stats";
import { mainPlace } from "../lib/trip";
import { useDesktop } from "../lib/useDesktop";
import { useStats } from "../lib/useStats";
import { NewTripSheet } from "./NewTripSheet";
import "./Monde.css";

type Vue = "globe" | "carte";
const VUE_KEY = "voyages:vue-monde";

/** Vue choisie sur l'écran Monde (globe par défaut), gardée sur l'appareil */
function readVue(): Vue {
  try {
    return localStorage.getItem(VUE_KEY) === "carte" ? "carte" : "globe";
  } catch {
    return "globe";
  }
}

export function Monde() {
  const { trips, visitedCountryIds } = useTrips();
  const { profile } = useAuth();
  const stats = useStats();
  const visitedIds = useMemo(
    () => new Set(visitedCountryIds),
    [visitedCountryIds],
  );
  const pins = useMemo(() => visitedCities(trips), [trips]);
  const next = useMemo(
    () =>
      trips
        .filter((t) => daysUntil(t.end) >= 0)
        .sort((a, b) => a.start.localeCompare(b.start))[0],
    [trips],
  );
  const highlight = useMemo(() => {
    const place = next && mainPlace(next);
    return place
      ? { name: place.city, lat: place.lat, lng: place.lng }
      : undefined;
  }, [next]);
  // Sur ordinateur, le globe occupe la colonne de gauche (src/desktop.css)
  const desktop = useDesktop();
  const globeSize = desktop
    ? Math.min(520, Math.round(window.innerWidth * 0.36))
    : Math.min(320, window.innerWidth - 60);
  const mapWidth = desktop
    ? Math.min(680, Math.round(window.innerWidth * 0.5))
    : Math.min(480, window.innerWidth) - 32;
  const [creating, setCreating] = useState(false);
  const [vue, setVueState] = useState<Vue>(readVue);
  const setVue = (v: Vue) => {
    setVueState(v);
    try {
      localStorage.setItem(VUE_KEY, v);
    } catch {
      // ignoré : le choix vaut pour la session
    }
  };

  return (
    <main className="screen screen--fab monde">
      <div className="monde__stars" aria-hidden />

      <header className="row between px">
        <div className="stack" style={{ gap: 4 }}>
          <span className="overline overline--accent">
            {profile ? `Bonjour, ${profile.displayName}` : "Bonjour"}
          </span>
          <h1 className="display-xl">
            Votre monde,
            <br />
            <em>en un regard</em>
          </h1>
        </div>
        <Link
          to="/stats"
          className="icon-btn"
          aria-label="Statistiques détaillées"
        >
          <BarChart3 size={20} />
        </Link>
      </header>

      <section className="monde__view">
        <div className="row between px monde__controls">
          <div
            className="monde__switch"
            role="radiogroup"
            aria-label="Affichage"
          >
            <button
              role="radio"
              aria-checked={vue === "globe"}
              aria-label="Globe"
              onClick={() => setVue("globe")}
            >
              <Globe2 size={17} aria-hidden />
            </button>
            <button
              role="radio"
              aria-checked={vue === "carte"}
              aria-label="Carte"
              onClick={() => setVue("carte")}
            >
              <MapIcon size={17} aria-hidden />
            </button>
          </div>
          {next && (
            <span className="pill monde__tag">
              <i aria-hidden /> {next.title} ·{" "}
              {daysUntil(next.start) > 0
                ? `J-${daysUntil(next.start)}`
                : "en cours"}
            </span>
          )}
        </div>
        {vue === "globe" ? (
          <div className="monde__globe">
            <span className="monde__orbit monde__orbit--a" aria-hidden />
            <span className="monde__orbit monde__orbit--b" aria-hidden />
            <Globe
              visitedIds={visitedIds}
              pins={pins}
              highlight={highlight}
              size={globeSize}
            />
          </div>
        ) : (
          <div className="monde__map fade-in">
            <WorldMap
              visitedIds={visitedIds}
              pins={pins}
              highlight={highlight}
              width={mapWidth}
            />
          </div>
        )}
      </section>

      {/* Chiffres et prochain départ : sous le globe sur téléphone, à sa droite sur ordinateur */}
      <div className="monde__side">
        <section className="px stack" style={{ gap: 10 }}>
          <div className="row between" style={{ alignItems: "baseline" }}>
            <div className="row" style={{ gap: 6, alignItems: "baseline" }}>
              <span className="numeric-l">
                {formatNumber(stats.worldPercent, 1)} %
              </span>
              <span className="muted">du monde exploré</span>
            </div>
            <span className="caption muted">{stats.countries} / 195 pays</span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={Math.round(stats.worldPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${stats.worldPercent}%` }} />
          </div>
        </section>

        <section className="px">
          <div className="monde__tiles">
            <Link to="/stats" className="tile">
              <span className="numeric-l">{stats.countries}</span>
              <span className="overline muted">pays</span>
            </Link>
            <Link to="/stats" className="tile">
              <span className="numeric-l">
                {stats.continentsVisited}/{stats.continentsTotal}
              </span>
              <span className="overline muted">continents</span>
            </Link>
            <Link to="/stats" className="tile">
              <span className="numeric-l">{stats.cities}</span>
              <span className="overline muted">villes</span>
            </Link>
          </div>
        </section>

        {next && (
          <section className="px">
            <Link to={`/voyages/${next.id}`} className="monde__next">
              <div className="stack" style={{ gap: 2 }}>
                <span className="overline monde__next-kicker">
                  Prochain départ · J-{Math.max(0, daysUntil(next.start))}
                </span>
                <span className="display-l">{next.title}</span>
                <span className="caption" style={{ opacity: 0.75 }}>
                  {formatRange(next.start, next.end, false)} ·{" "}
                  {next.bookings.length} réservations
                </span>
              </div>
              <span className="monde__next-icon" aria-hidden>
                <Plane size={24} />
              </span>
            </Link>
          </section>
        )}
      </div>

      <CommunityMemories />

      <button className="fab btn btn--accent" onClick={() => setCreating(true)}>
        <Plus size={20} /> Nouveau voyage
      </button>
      <NewTripSheet open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}
