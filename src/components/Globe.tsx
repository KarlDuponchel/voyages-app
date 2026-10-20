import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useEffect, useMemo, useRef } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'

type Pin = { name: string; lat: number; lng: number }

type Props = {
  visitedIds: Set<string>
  pins: Pin[]
  /** Repère mis en avant (prochain voyage), avec une onde animée */
  highlight?: Pin
  size?: number
}

const topology = worldTopo as unknown as Topology<{ countries: GeometryCollection }>
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features
const graticule = geoGraticule10()

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/**
 * Globe 3D interactif dessiné en canvas : on le fait tourner au doigt, il continue sur sa lancée
 * puis reprend une rotation lente. Les pays visités sont colorés, les villes ont un repère.
 */
export function Globe({ visitedIds, pins, highlight, size = 300 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotation = useRef<[number, number]>([highlight ? -highlight.lng + 20 : 10, highlight ? -highlight.lat + 12 : -25])

  const { visited, others } = useMemo(() => {
    const visited: Feature[] = []
    const others: Feature[] = []
    for (const c of countries) (visitedIds.has(String(c.id)) ? visited : others).push(c)
    return { visited, others }
  }, [visitedIds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const r = size / 2 - 14
    const projection = geoOrthographic().scale(r).translate([size / 2, size / 2]).clipAngle(90).precision(0.6)
    const path = geoPath(projection, ctx)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let velocity: [number, number] = [0, 0]
    let dragging = false
    let last: { x: number; y: number; t: number } | null = null
    let idleSince = performance.now()
    let raf = 0

    const draw = (now: number) => {
      const c = {
        oceanLight: cssVar('--globe-ocean-light'),
        oceanDark: cssVar('--globe-ocean-dark'),
        land: cssVar('--globe-land'),
        visited: cssVar('--globe-visited'),
        glow: cssVar('--globe-glow'),
        pin: cssVar('--accent-sun'),
        line: cssVar('--text-primary'),
        base: '#0A0F1F',
      }
      const cx = size / 2
      const cy = size / 2
      projection.rotate([rotation.current[0], rotation.current[1]])
      ctx.clearRect(0, 0, size, size)

      // Halo
      const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, size / 2)
      glow.addColorStop(0, hexA(c.glow, 0.28))
      glow.addColorStop(1, hexA(c.glow, 0))
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, size, size)

      // Océan
      const ocean = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15)
      ocean.addColorStop(0, c.oceanLight)
      ocean.addColorStop(1, c.oceanDark)
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fillStyle = ocean
      ctx.fill()

      // Méridiens et parallèles
      ctx.beginPath()
      path(graticule)
      ctx.strokeStyle = hexA(c.line, 0.07)
      ctx.lineWidth = 1
      ctx.stroke()

      // Pays
      ctx.beginPath()
      others.forEach((f) => path(f))
      ctx.fillStyle = c.land
      ctx.fill()
      ctx.beginPath()
      visited.forEach((f) => path(f))
      ctx.fillStyle = c.visited
      ctx.fill()
      ctx.strokeStyle = hexA(c.base, 0.35)
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Ombre (effet de volume) et contour
      const shade = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.5, cx, cy, r)
      shade.addColorStop(0, 'rgba(0,0,0,0)')
      shade.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fillStyle = shade
      ctx.fill()
      ctx.strokeStyle = hexA(c.glow, 0.4)
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Repères des villes (uniquement sur la face visible)
      const center: [number, number] = [-rotation.current[0], -rotation.current[1]]
      const visible = (p: Pin) => geoDistance([p.lng, p.lat], center) < Math.PI / 2 - 0.05
      for (const p of pins) {
        if (!visible(p)) continue
        const xy = projection([p.lng, p.lat])
        if (!xy) continue
        ctx.beginPath()
        ctx.arc(xy[0], xy[1], 4.5, 0, Math.PI * 2)
        ctx.fillStyle = c.pin
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = c.base
        ctx.stroke()
      }
      if (highlight && visible(highlight)) {
        const xy = projection([highlight.lng, highlight.lat])
        if (xy) {
          const phase = reduceMotion ? 0.5 : (now % 2000) / 2000
          ctx.beginPath()
          ctx.arc(xy[0], xy[1], 6 + phase * 14, 0, Math.PI * 2)
          ctx.strokeStyle = hexA(c.pin, 0.7 * (1 - phase))
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    }

    const tick = (now: number) => {
      if (!dragging) {
        const [vx, vy] = velocity
        if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
          rotation.current = [rotation.current[0] + vx, clampLat(rotation.current[1] + vy)]
          velocity = [vx * 0.95, vy * 0.95]
          idleSince = now
        } else if (!reduceMotion && now - idleSince > 2500) {
          rotation.current = [rotation.current[0] + 0.06, rotation.current[1]]
        }
      }
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const sensitivity = 75 / r
    const onDown = (e: PointerEvent) => {
      dragging = true
      velocity = [0, 0]
      last = { x: e.clientX, y: e.clientY, t: performance.now() }
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging || !last) return
      const dx = (e.clientX - last.x) * sensitivity
      const dy = (e.clientY - last.y) * sensitivity
      rotation.current = [rotation.current[0] + dx, clampLat(rotation.current[1] - dy)]
      velocity = [dx, -dy]
      last = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const onUp = () => {
      dragging = false
      idleSince = performance.now()
      if (last && performance.now() - last.t > 80) velocity = [0, 0]
      last = null
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [size, visited, others, pins, highlight])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, touchAction: 'none', cursor: 'grab' }}
      role="img"
      aria-label={`Globe : ${visitedIds.size} pays visités`}
    />
  )
}

const clampLat = (v: number) => Math.max(-70, Math.min(70, v))

/** "#RRGGBB" + opacité → rgba() */
function hexA(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
