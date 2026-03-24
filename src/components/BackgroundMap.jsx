import { useEffect, useRef } from 'react'

// major global capitals / financial hubs  [lon, lat]
const NODES = [
  { name: 'Washington DC', lon: -77.04, lat: 38.91 },
  { name: 'New York',      lon: -74.01, lat: 40.71 },
  { name: 'London',        lon: -0.12,  lat: 51.51 },
  { name: 'Brussels',      lon:  4.35,  lat: 50.85 },
  { name: 'Paris',         lon:  2.35,  lat: 48.85 },
  { name: 'Berlin',        lon: 13.40,  lat: 52.52 },
  { name: 'Geneva',        lon:  6.14,  lat: 46.20 },
  { name: 'Moscow',        lon: 37.62,  lat: 55.75 },
  { name: 'Dubai',         lon: 55.30,  lat: 25.20 },
  { name: 'Mumbai',        lon: 72.88,  lat: 19.08 },
  { name: 'Beijing',       lon: 116.40, lat: 39.90 },
  { name: 'Shanghai',      lon: 121.47, lat: 31.23 },
  { name: 'Tokyo',         lon: 139.69, lat: 35.69 },
  { name: 'Seoul',         lon: 126.98, lat: 37.57 },
  { name: 'Singapore',     lon: 103.82, lat:  1.35 },
  { name: 'Sydney',        lon: 151.21, lat: -33.87 },
  { name: 'São Paulo',     lon: -46.63, lat: -23.55 },
  { name: 'Mexico City',   lon: -99.13, lat: 19.43 },
  { name: 'Lagos',         lon:  3.39,  lat:  6.45 },
  { name: 'Riyadh',        lon: 46.68,  lat: 24.69 },
]

// pairs to connect [index a, index b]
const EDGES = [
  [0,1],[0,2],[0,11],[0,12],[0,17],   // Washington DC hub
  [1,2],[1,7],[1,10],                  // NY
  [2,3],[2,4],[2,5],[2,6],[2,7],       // London EU hub
  [3,4],[3,5],                         // Brussels-Paris-Berlin
  [6,9],[6,19],                        // Geneva
  [7,10],[7,8],                        // Moscow
  [8,9],[8,10],[8,19],                 // Dubai hub
  [9,10],[9,14],                       // Mumbai
  [10,11],[10,12],[10,13],[10,14],     // Beijing hub
  [11,12],[13,14],                     // East Asia
  [14,15],                             // Singapore-Sydney
  [1,16],[16,17],                      // Americas
  [2,18],[8,18],                       // Africa
]

export default function BackgroundMap()
{
  const svgRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() =>
  {
    const d3 = window.d3
    const topojson = window.topojson
    if (!d3 || !topojson || !svgRef.current) return

    const el = svgRef.current
    const w = el.parentElement.clientWidth || window.innerWidth
    const h = Math.round(w * 0.52)
    el.setAttribute('width', w)
    el.setAttribute('height', h)

    // clear
    while (el.firstChild) el.removeChild(el.firstChild)

    const ns = 'http://www.w3.org/2000/svg'

    // defs
    const defs = document.createElementNS(ns, 'defs')

    // orange gradient for arcs
    const gr1 = document.createElementNS(ns, 'linearGradient')
    gr1.setAttribute('id', 'bgArcOrange')
    gr1.setAttribute('gradientUnits', 'userSpaceOnUse')
    ;[['0%','#f9731600'],['50%','#f9731666'],['100%','#f9731600']].forEach(([o,c]) => {
      const s = document.createElementNS(ns, 'stop')
      s.setAttribute('offset', o); s.setAttribute('stop-color', c); gr1.appendChild(s)
    })

    // teal gradient for arcs
    const gr2 = document.createElementNS(ns, 'linearGradient')
    gr2.setAttribute('id', 'bgArcTeal')
    gr2.setAttribute('gradientUnits', 'userSpaceOnUse')
    ;[['0%','#0d948800'],['50%','#0d948855'],['100%','#0d948800']].forEach(([o,c]) => {
      const s = document.createElementNS(ns, 'stop')
      s.setAttribute('offset', o); s.setAttribute('stop-color', c); gr2.appendChild(s)
    })

    defs.appendChild(gr1); defs.appendChild(gr2)
    el.appendChild(defs)

    const projection = d3.geoNaturalEarth1()
      .scale(w / 5.8)
      .translate([w / 2, h / 2])
    const geoPath = d3.geoPath().projection(projection)

    // project nodes once
    const projected = NODES.map(n => {
      const p = projection([n.lon, n.lat])
      return p ? { x: p[0], y: p[1], name: n.name } : null
    }).filter(Boolean)

    // ── world map ──
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world =>
      {
        // graticule
        const gratPath = document.createElementNS(ns, 'path')
        gratPath.setAttribute('d', geoPath(d3.geoGraticule10()))
        gratPath.setAttribute('fill', 'none')
        gratPath.setAttribute('stroke', '#d4cfc5')
        gratPath.setAttribute('stroke-width', '0.4')
        gratPath.setAttribute('opacity', '0.5')
        el.appendChild(gratPath)

        // countries
        const countries = topojson.feature(world, world.objects.countries)
        countries.features.forEach(feat => {
          const p = document.createElementNS(ns, 'path')
          p.setAttribute('d', geoPath(feat))
          p.setAttribute('fill', '#ede8df')
          p.setAttribute('stroke', '#d4cec4')
          p.setAttribute('stroke-width', '0.5')
          el.appendChild(p)
        })

        // ── edges (arcs) ──
        const arcStyle = document.createElement('style')
        arcStyle.textContent = EDGES.map((_, i) => {
          const dur = 2.5 + (i % 5) * 0.7
          const del = (i * 0.37) % dur
          return `@keyframes dash${i}{to{stroke-dashoffset:-200}} .arc${i}{animation:dash${i} ${dur}s ${del}s linear infinite}`
        }).join('\n')
        document.head.appendChild(arcStyle)

        EDGES.forEach(([ai, bi], i) => {
          const a = projected[ai], b = projected[bi]
          if (!a || !b) return

          // control point: pull upward for arc shape
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.25

          const path = document.createElementNS(ns, 'path')
          path.setAttribute('d', `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`)
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', i % 2 === 0 ? '#f97316' : '#0d9488')
          path.setAttribute('stroke-width', '1')
          path.setAttribute('stroke-dasharray', '6 8')
          path.setAttribute('opacity', '0.35')
          path.setAttribute('class', `arc${i}`)

          // update gradient coords
          el.appendChild(path)
        })

        // ── nodes ──
        projected.forEach((n, i) => {
          // pulse ring
          const ring = document.createElementNS(ns, 'circle')
          ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y); ring.setAttribute('r', '6')
          ring.setAttribute('fill', i % 3 === 0 ? '#f9731618' : '#0d948818')
          ring.setAttribute('stroke', i % 3 === 0 ? '#f97316' : '#0d9488')
          ring.setAttribute('stroke-width', '0.8')
          ring.setAttribute('opacity', '0.6')
          el.appendChild(ring)

          // centre dot
          const dot = document.createElementNS(ns, 'circle')
          dot.setAttribute('cx', n.x); dot.setAttribute('cy', n.y); dot.setAttribute('r', '2.5')
          dot.setAttribute('fill', i % 3 === 0 ? '#f97316' : '#0d9488')
          dot.setAttribute('opacity', '0.8')
          el.appendChild(dot)
        })

        return () => { document.head.removeChild(arcStyle) }
      })

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
