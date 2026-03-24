import { useEffect, useRef } from 'react'

function toScore(d)
{
    const mag = d.magnitude || 1
    if (d.net_effect === 'benefits') return mag
    if (d.net_effect === 'hurts') return -mag
    if (d.net_effect === 'mixed') return mag * 0.3
    return 0
}

function barColor(score)
{
    if (score >= 4) return '#10b981'
    if (score > 0) return '#34d399'
    if (score <= -4) return '#ef4444'
    if (score < 0) return '#f87171'
    return '#2a2a3e'
}

const CATEGORY_ORDER = ['income', 'age', 'geography', 'occupation']
const CATEGORY_LABELS = { income: 'Income', age: 'Age', geography: 'Geography', occupation: 'Occupation' }

export default function PeopleChart({ data })
{
    const containerRef = useRef(null)

    useEffect(() =>
    {
        if (!data?.length || !containerRef.current) return

        // sort within each category by score, then arrange by category order
        const grouped = {}
        for (const cat of CATEGORY_ORDER) grouped[cat] = []
        for (const d of data)
        {
            const cat = d.category || 'occupation'
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(d)
        }
        for (const cat of CATEGORY_ORDER)
        {
            grouped[cat].sort((a, b) => toScore(a) - toScore(b))
        }

        const ordered = []
        const separatorPositions = []
        for (const cat of CATEGORY_ORDER)
        {
            if (grouped[cat].length === 0) continue
            separatorPositions.push({ pos: ordered.length, label: CATEGORY_LABELS[cat] || cat })
            ordered.push(...grouped[cat])
        }

        const scores = ordered.map(toScore)
        const labels = ordered.map(d => d.group)
        const colors = scores.map(barColor)

        const hoverText = ordered.map(d =>
            `<b>${d.group}</b><br>` +
            `Effect: ${d.net_effect}<br>` +
            `Magnitude: ${d.magnitude}/5<br>` +
            `<i>${d.mechanism}</i>`
        )

        const trace = {
            type: 'bar',
            orientation: 'h',
            x: scores,
            y: labels,
            marker: { color: colors, line: { width: 0 } },
            hovertext: hoverText,
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: '#161625',
                bordercolor: '#2a2a3e',
                font: { family: "'DM Sans', sans-serif", color: '#e2ddd8', size: 13 },
                align: 'left',
            },
        }

        // category separator lines + labels
        const shapes = [{
            type: 'line',
            x0: 0, x1: 0, y0: -0.5, y1: ordered.length - 0.5,
            line: { color: '#2a2a3e', width: 1 },
        }]

        const annotations = [
            {
                x: -4, y: -0.9, xref: 'x', yref: 'y',
                text: '← Harmed',
                showarrow: false,
                font: { size: 11, color: '#7a7590' },
            },
            {
                x: 4, y: -0.9, xref: 'x', yref: 'y',
                text: 'Benefits →',
                showarrow: false,
                font: { size: 11, color: '#7a7590' },
            },
        ]

        for (let i = 1; i < separatorPositions.length; i++)
        {
            const pos = separatorPositions[i].pos - 0.5
            shapes.push({
                type: 'line',
                x0: -5.5, x1: 5.5, y0: pos, y1: pos,
                line: { color: '#1e1e30', width: 1, dash: 'dot' },
            })
        }

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: "'DM Sans', system-ui, sans-serif", color: '#e2ddd8', size: 13 },
            margin: { l: 200, r: 40, t: 10, b: 50 },
            height: Math.max(500, ordered.length * 32),
            xaxis: {
                range: [-5.5, 5.5],
                gridcolor: '#1e1e30',
                zerolinecolor: '#2a2a3e',
                zerolinewidth: 1,
                tickfont: { color: '#7a7590', size: 12 },
            },
            yaxis: {
                tickfont: { color: '#e2ddd8', size: 12 },
                gridwidth: 0,
            },
            shapes,
            annotations,
        }

        window.Plotly.newPlot(containerRef.current, [trace], layout, {
            displayModeBar: false,
            responsive: true,
        })

        return () => { if (containerRef.current) window.Plotly.purge(containerRef.current) }
    }, [data])

    return (
        <div>
            <p style={{ fontSize: '13px', color: '#7a7590', marginBottom: '16px' }}>
                Demographic impact by income, age, geography, and occupation groups
            </p>
            <div ref={containerRef} />
        </div>
    )
}
