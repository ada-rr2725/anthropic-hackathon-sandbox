import { useEffect, useRef } from 'react'

const EFFECTS = {
  positive: [['GDP ↑', '#0d9488'], ['Trade ↑', '#0d9488']],
  negative: [['GDP ↓', '#dc2626'], ['Jobs ↓', '#f87171']],
  mixed:    [['Inflation', '#d97706'], ['Trade ↓', '#d97706']],
  neutral:  [['Stable', '#a09890'], ['Markets', '#a09890']],
}

function nodeColor(dir)
{
  if (dir === 'positive') return '#0d9488'
  if (dir === 'negative') return '#dc2626'
  if (dir === 'mixed')    return '#d97706'
  return '#a09890'
}

export default function CascadeGraph({ analysis })
{
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() =>
  {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return

    const W = wrap.clientWidth || 300
    const countries = (analysis.geographic_impacts || [])
      .sort((a, b) => (b.magnitude || 1) - (a.magnitude || 1))
      .slice(0, 4)

    const N = countries.length
    if (N === 0) return

    const rootX = W / 2
    const rootY = 44
    const countryY = 136
    const fx1 = 225
    const fx2 = 272

    // evenly space countries
    const cxs = Array.from({ length: N }, (_, i) => (W / N) * i + W / N / 2)

    // total SVG height
    const H = fx2 + 28
    svg.setAttribute('width', W)
    svg.setAttribute('height', H)

    // build SVG string
    const ns = 'http://www.w3.org/2000/svg'
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    // helper: bezier path string
    function bez(x1, y1, x2, y2)
    {
      const cy = (y1 + y2) / 2
      return `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`
    }

    // helper: create svg element
    function el(tag, attrs)
    {
      const e = document.createElementNS(ns, tag)
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v))
      return e
    }

    // root → country lines
    countries.forEach((c, i) =>
    {
      const path = el('path', {
        d: bez(rootX, rootY + 18, cxs[i], countryY - 16),
        fill: 'none',
        stroke: '#ddd9d0',
        'stroke-width': '1.5',
        opacity: '0',
      })
      path.style.animation = `cgFade 0.4s ${0.1 + i * 0.08}s forwards`
      svg.appendChild(path)
    })

    // country → effect lines
    countries.forEach((c, i) =>
    {
      const effects = EFFECTS[c.direction] || EFFECTS.neutral
      effects.forEach(([, col], j) =>
      {
        const ey = j === 0 ? fx1 : fx2
        const path = el('path', {
          d: bez(cxs[i], countryY + 16, cxs[i], ey - 12),
          fill: 'none',
          stroke: col + '60',
          'stroke-width': '1',
          opacity: '0',
        })
        path.style.animation = `cgFade 0.4s ${0.35 + i * 0.08 + j * 0.05}s forwards`
        svg.appendChild(path)
      })
    })

    // root node
    const rootG = el('g', { opacity: '0' })
    rootG.style.animation = 'cgFade 0.4s 0s forwards'
    const rw = Math.min(W - 24, 200)
    const rx = rootX - rw / 2
    rootG.appendChild(el('rect', { x: rx, y: rootY - 18, width: rw, height: 36, rx: 18, fill: '#f97316' }))
    const rootText = el('text', {
      x: rootX, y: rootY + 5,
      'text-anchor': 'middle',
      fill: 'white', 'font-size': '11', 'font-weight': '700',
      'font-family': "'DM Sans', sans-serif",
    })
    const label = (analysis.policy_name || 'Policy').slice(0, 28)
    rootText.textContent = label
    rootG.appendChild(rootText)
    svg.appendChild(rootG)

    // country nodes
    countries.forEach((c, i) =>
    {
      const col = nodeColor(c.direction)
      const cg = el('g', { opacity: '0' })
      cg.style.animation = `cgFade 0.4s ${0.2 + i * 0.08}s forwards`

      cg.appendChild(el('rect', {
        x: cxs[i] - 32, y: countryY - 16, width: 64, height: 32, rx: 16,
        fill: col + '18', stroke: col, 'stroke-width': '1.5',
      }))

      const shortName = c.country.length > 9 ? c.country.slice(0, 8) + '…' : c.country
      const ct = el('text', {
        x: cxs[i], y: countryY + 5,
        'text-anchor': 'middle',
        fill: col, 'font-size': '9.5', 'font-weight': '700',
        'font-family': "'DM Sans', sans-serif",
      })
      ct.textContent = shortName
      cg.appendChild(ct)

      // magnitude dots
      const mag = Math.round(c.magnitude || 1)
      for (let m = 0; m < Math.min(mag, 5); m++)
      {
        cg.appendChild(el('circle', {
          cx: cxs[i] - 10 + m * 5, cy: countryY + 22,
          r: '2', fill: col, opacity: '0.7',
        }))
      }

      svg.appendChild(cg)
    })

    // effect nodes
    countries.forEach((c, i) =>
    {
      const effects = EFFECTS[c.direction] || EFFECTS.neutral
      effects.forEach(([label, col], j) =>
      {
        const ey = j === 0 ? fx1 : fx2
        const eg = el('g', { opacity: '0' })
        eg.style.animation = `cgFade 0.4s ${0.4 + i * 0.08 + j * 0.05}s forwards`

        eg.appendChild(el('rect', {
          x: cxs[i] - 24, y: ey - 12, width: 48, height: 22, rx: 11,
          fill: col + '14', stroke: col, 'stroke-width': '1',
        }))

        const et = el('text', {
          x: cxs[i], y: ey + 3,
          'text-anchor': 'middle',
          fill: col, 'font-size': '9', 'font-weight': '600',
          'font-family': "'DM Sans', sans-serif",
        })
        et.textContent = label
        eg.appendChild(et)
        svg.appendChild(eg)
      })
    })

  }, [analysis])

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <style>{`@keyframes cgFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }`}</style>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', overflow: 'visible' }} />
    </div>
  )
}
