import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { useMemo } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'
import './WorldMap.css'

type Pin = { name: string; lat: number; lng: number }

type Props = {
  visitedIds: Set<string>
  pins: Pin[]
  /** Repère mis en avant (prochain voyage), avec une onde animée */
  highlight?: Pin
  width: number
}

const topology = worldTopo as unknown as Topology<{ countries: GeometryCollection }>
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features
const graticule = geoGraticule10()

/**
 * Mappemonde à plat (projection Equal Earth), avec les mêmes couleurs que le globe :
 * l'autre vue de l'écran Monde, au choix de l'utilisateur.
 */
export function WorldMap({ visitedIds, pins, highlight, width }: Props) {
  const height = Math.round(width * 0.5)

  const { projection, sphere, lines, land } = useMemo(() => {
    const projection = geoEqualEarth().fitSize([width - 4, height - 4], { type: 'Sphere' }).translate([width / 2, height / 2])
    const path = geoPath(projection)
    return {
      projection,
      sphere: path({ type: 'Sphere' }) ?? '',
      lines: path(graticule) ?? '',
      land: countries.map((c) => ({ id: String(c.id), d: path(c) ?? '' })),
    }
  }, [width, height])

  const point = (p: Pin) => projection([p.lng, p.lat])
  const active = highlight && point(highlight)

  return (
    <svg className="world-map" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Carte du monde : ${visitedIds.size} pays visités`}>
      <defs>
        <linearGradient id="world-map-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="world-map__ocean-light" />
          <stop offset="1" className="world-map__ocean-dark" />
        </linearGradient>
      </defs>
      <path d={sphere} fill="url(#world-map-ocean)" />
      <path d={lines} className="world-map__lines" />
      {/* Quelques territoires n'ont pas de code pays : la clé est donc la position */}
      {land.map((c, i) => (
        <path key={i} d={c.d} className={visitedIds.has(c.id) ? 'world-map__visited' : 'world-map__land'} />
      ))}
      <path d={sphere} className="world-map__outline" />
      {pins.map((p) => {
        const xy = point(p)
        return xy && <circle key={`${p.name}-${p.lat}`} cx={xy[0]} cy={xy[1]} r={3.5} className="world-map__pin" />
      })}
      {active && (
        <g transform={`translate(${active[0]} ${active[1]})`}>
          <circle r={9} className="world-map__ping" />
          <circle r={5} className="world-map__active" />
        </g>
      )}
    </svg>
  )
}
