import { useEffect, useRef } from 'react'

const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

function impactColor(direction, alpha = 1)
{
    if (direction === 'positive') return `rgba(13, 148, 136, ${alpha})`
    if (direction === 'negative') return `rgba(220, 38, 38, ${alpha})`
    return `rgba(160, 152, 144, ${alpha})`
}

export default function WorldMap({ data })
{
    const svgRef = useRef(null)
    const wrapRef = useRef(null)

    useEffect(() =>
    {
        const d3 = window.d3
        const topojson = window.topojson
        if (!d3 || !topojson || !data?.length || !svgRef.current || !wrapRef.current) return

        const w = wrapRef.current.clientWidth || 800
        const h = Math.round(w * 0.5)

        const svg = d3.select(svgRef.current)
            .attr('width', w)
            .attr('height', h)

        svg.selectAll('*').remove()

        const defs = svg.append('defs')

        // ocean radial gradient
        const rg = defs.append('radialGradient').attr('id', 'csc-ocean')
        rg.append('stop').attr('offset', '0%').attr('stop-color', '#dbeafe')
        rg.append('stop').attr('offset', '100%').attr('stop-color', '#bfdbfe')
        svg.append('rect').attr('width', w).attr('height', h).attr('fill', 'url(#csc-ocean)')

        // glow filter
        const gf = defs.append('filter').attr('id', 'csc-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
        gf.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
        const fm = gf.append('feMerge')
        fm.append('feMergeNode').attr('in', 'blur')
        fm.append('feMergeNode').attr('in', 'SourceGraphic')

        const projection = d3.geoNaturalEarth1()
            .scale(w / 5.8)
            .translate([w / 2, h / 2])
        const path = d3.geoPath().projection(projection)

        const g = svg.append('g')

        // graticule
        g.append('path')
            .datum(d3.geoGraticule10())
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', '#c8d8f0')
            .attr('stroke-width', 0.3)

        // zoom
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', e => g.attr('transform', e.transform))
        svg.call(zoom)

        // tooltip div
        let tooltip = document.getElementById('csc-map-tooltip')
        if (!tooltip)
        {
            tooltip = document.createElement('div')
            tooltip.id = 'csc-map-tooltip'
            tooltip.style.cssText = `
                position:fixed; pointer-events:none; display:none;
                background:#ffffff; border:1px solid #e8e4dc;
                border-radius:8px; padding:10px 14px; font-size:13px;
                color:#1a1612; font-family:'DM Sans',sans-serif;
                max-width:240px; line-height:1.5; z-index:1000;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `
            document.body.appendChild(tooltip)
        }

        fetch(WORLD_ATLAS)
            .then(r => r.json())
            .then(world =>
            {
                // base countries
                g.selectAll('path.csc-country')
                    .data(topojson.feature(world, world.objects.countries).features)
                    .join('path')
                    .attr('class', 'csc-country')
                    .attr('d', path)
                    .attr('fill', '#e2ead4')
                    .attr('stroke', '#c8d4b0')
                    .attr('stroke-width', 0.4)

                // borders
                g.append('path')
                    .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
                    .attr('fill', 'none')
                    .attr('stroke', '#b8c89a')
                    .attr('stroke-width', 0.3)

                // impact circles — sorted so large circles render first
                const sorted = [...data].sort((a, b) => (b.magnitude || 1) - (a.magnitude || 1))

                sorted.forEach(impact =>
                {
                    const pos = projection([impact.lon, impact.lat])
                    if (!pos) return
                    const [x, y] = pos
                    const r = (impact.magnitude || 1) * 5 + 5   // 10–30px
                    const col = impactColor(impact.direction)
                    const colDim = impactColor(impact.direction, 0.15)

                    // outer pulse ring
                    g.append('circle')
                        .attr('cx', x).attr('cy', y).attr('r', r * 2.2)
                        .attr('fill', colDim)
                        .attr('stroke', col)
                        .attr('stroke-width', 0.5)
                        .attr('opacity', 0.4)

                    // inner glow dot
                    g.append('circle')
                        .attr('cx', x).attr('cy', y).attr('r', r)
                        .attr('fill', col)
                        .attr('opacity', 0.75)
                        .attr('filter', 'url(#csc-glow)')

                    // centre dot
                    g.append('circle')
                        .attr('cx', x).attr('cy', y).attr('r', 2.5)
                        .attr('fill', '#fff')
                        .attr('opacity', 0.9)

                    // label
                    g.append('text')
                        .attr('x', x).attr('y', y - r - 6)
                        .attr('text-anchor', 'middle')
                        .attr('font-family', "'DM Sans', sans-serif")
                        .attr('font-size', '9px')
                        .attr('font-weight', '500')
                        .attr('fill', '#7a7268')
                        .attr('pointer-events', 'none')
                        .text(impact.country)

                    // invisible hit target for tooltip
                    g.append('circle')
                        .attr('cx', x).attr('cy', y).attr('r', r * 2.2)
                        .attr('fill', 'transparent')
                        .style('cursor', 'pointer')
                        .on('mousemove', (event) =>
                        {
                            tooltip.style.display = 'block'
                            tooltip.style.left = (event.clientX + 14) + 'px'
                            tooltip.style.top = (event.clientY - 10) + 'px'
                            tooltip.innerHTML = `
                                <div style="font-weight:600;margin-bottom:4px">${impact.country}</div>
                                <div style="color:${col};font-size:12px;margin-bottom:4px">
                                    ${impact.direction} · magnitude ${impact.magnitude}/5
                                </div>
                                <div style="color:#7a7590;font-size:12px">${impact.mechanism}</div>
                            `
                        })
                        .on('mouseleave', () => { tooltip.style.display = 'none' })
                })
            })

        return () =>
        {
            svg.selectAll('*').remove()
            const t = document.getElementById('csc-map-tooltip')
            if (t) t.style.display = 'none'
        }
    }, [data])

    return (
        <div>
            <p style={{ fontSize: '13px', color: '#7a7590', marginBottom: '16px' }}>
                Geographic impact — circle size = magnitude, colour = direction. Scroll to zoom, drag to pan.
            </p>
            <div ref={wrapRef} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #252540' }}>
                <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#a09890' }}>
                <span><span style={{ color: '#0d9488' }}>●</span> Positive impact</span>
                <span><span style={{ color: '#dc2626' }}>●</span> Negative impact</span>
                <span><span style={{ color: '#a09890' }}>●</span> Neutral / mixed</span>
                <span style={{ marginLeft: 'auto' }}>Circle size = magnitude</span>
            </div>
        </div>
    )
}
