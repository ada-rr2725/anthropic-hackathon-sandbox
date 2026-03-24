import { useEffect, useRef } from 'react'

const ALIGNMENT_SCORE = {
    strongly_supports: 2,
    supports: 1,
    neutral: 0,
    opposes: -1,
    strongly_opposes: -2,
}

function barColor(score)
{
    if (score >= 2) return '#0d9488'
    if (score > 0) return '#14b8a6'
    if (score <= -2) return '#dc2626'
    if (score < 0) return '#f87171'
    return '#d4cfc5'
}

function sigWidth(sig)
{
    if (sig === 'high') return 0.7
    if (sig === 'medium') return 0.5
    return 0.35
}

export default function VotersChart({ data })
{
    const containerRef = useRef(null)

    useEffect(() =>
    {
        if (!data?.length || !containerRef.current) return

        const sorted = [...data].sort((a, b) =>
            (ALIGNMENT_SCORE[a.alignment] || 0) - (ALIGNMENT_SCORE[b.alignment] || 0)
        )

        const scores = sorted.map(d => ALIGNMENT_SCORE[d.alignment] || 0)
        const labels = sorted.map(d => d.group)
        const colors = scores.map(barColor)
        const widths = sorted.map(d => sigWidth(d.electoral_significance))

        const hoverText = sorted.map(d =>
            `<b>${d.group}</b><br>` +
            `Alignment: ${(d.alignment || '').replace(/_/g, ' ')}<br>` +
            `Electoral significance: ${d.electoral_significance}<br>` +
            `<i>${d.reasoning}</i>`
        )

        const trace = {
            type: 'bar',
            orientation: 'h',
            x: scores,
            y: labels,
            width: widths,
            marker: { color: colors, line: { width: 0 } },
            hovertext: hoverText,
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: '#ffffff',
                bordercolor: '#d4cfc5',
                font: { family: "'DM Sans', sans-serif", color: '#1a1612', size: 13 },
                align: 'left',
            },
        }

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: "'DM Sans', system-ui, sans-serif", color: '#1a1612', size: 13 },
            margin: { l: 220, r: 40, t: 10, b: 50 },
            height: Math.max(380, sorted.length * 38),
            xaxis: {
                range: [-2.5, 2.5],
                gridcolor: '#f0ede8',
                zerolinecolor: '#d4cfc5',
                zerolinewidth: 1,
                tickvals: [-2, -1, 0, 1, 2],
                ticktext: ['Strongly oppose', 'Oppose', 'Neutral', 'Support', 'Strongly support'],
                tickfont: { color: '#a09890', size: 11 },
            },
            yaxis: {
                tickfont: { color: '#1a1612', size: 12 },
                gridwidth: 0,
            },
            shapes: [{
                type: 'line',
                x0: 0, x1: 0, y0: -0.5, y1: sorted.length - 0.5,
                line: { color: '#d4cfc5', width: 1 },
            }],
        }

        window.Plotly.newPlot(containerRef.current, [trace], layout, {
            displayModeBar: false,
            responsive: true,
        })

        return () => { if (containerRef.current) window.Plotly.purge(containerRef.current) }
    }, [data])

    return (
        <div>
            <p style={{ fontSize: '13px', color: '#a09890', marginBottom: '16px' }}>
                Voter group alignment — bar width reflects electoral significance
            </p>
            <div ref={containerRef} />
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#a09890' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '10px', background: '#7a7590', borderRadius: '2px' }} />
                    High significance
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '14px', height: '8px', background: '#7a7590', borderRadius: '2px', opacity: 0.6 }} />
                    Medium
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '6px', background: '#7a7590', borderRadius: '2px', opacity: 0.35 }} />
                    Low
                </span>
            </div>
        </div>
    )
}
