import { useEffect, useRef } from 'react'

// convert direction + magnitude to a signed score
function toScore(d)
{
    const mag = d.magnitude || 1
    if (d.direction === 'positive') return mag
    if (d.direction === 'negative') return -mag
    if (d.direction === 'mixed') return mag * 0.3
    return 0
}

function barColor(score)
{
    if (score >= 4) return '#0d9488'
    if (score > 0) return '#14b8a6'
    if (score <= -4) return '#dc2626'
    if (score < 0) return '#f87171'
    return '#d4cfc5'
}

export default function MarketsChart({ data })
{
    const containerRef = useRef(null)

    useEffect(() =>
    {
        if (!data?.length || !containerRef.current) return

        const sorted = [...data].sort((a, b) => toScore(a) - toScore(b))
        const scores = sorted.map(toScore)
        const labels = sorted.map(d => d.sector)
        const colors = scores.map(barColor)

        const hoverText = sorted.map(d =>
            `<b>${d.sector}</b><br>` +
            `Direction: ${d.direction}<br>` +
            `Magnitude: ${d.magnitude}/5<br>` +
            `Timeframe: ${(d.timeframe || '').replace(/_/g, ' ')}<br>` +
            `Confidence: ${d.confidence}<br>` +
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
                bgcolor: '#ffffff',
                bordercolor: '#e8e4dc',
                font: { family: "'DM Sans', sans-serif", color: '#1a1612', size: 13 },
                align: 'left',
            },
        }

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: "'DM Sans', system-ui, sans-serif", color: '#1a1612', size: 13 },
            margin: { l: 180, r: 40, t: 10, b: 50 },
            height: 420,
            xaxis: {
                range: [-5.5, 5.5],
                gridcolor: '#f0ede8',
                zerolinecolor: '#d4cfc5',
                zerolinewidth: 1.5,
                tickfont: { color: '#a09890', size: 12 },
            },
            yaxis: {
                tickfont: { color: '#1a1612', size: 13 },
                gridwidth: 0,
            },
            shapes: [{
                type: 'line',
                x0: 0, x1: 0, y0: -0.5, y1: sorted.length - 0.5,
                line: { color: '#d4cfc5', width: 1.5 },
            }],
            annotations: [
                {
                    x: -4, y: -0.8, xref: 'x', yref: 'y',
                    text: '← Negative impact',
                    showarrow: false,
                    font: { size: 11, color: '#a09890' },
                },
                {
                    x: 4, y: -0.8, xref: 'x', yref: 'y',
                    text: 'Positive impact →',
                    showarrow: false,
                    font: { size: 11, color: '#a09890' },
                },
            ],
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
                S&P 500 sector exposure — bars show direction and magnitude of expected impact
            </p>
            <div ref={containerRef} />
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#a09890' }}>
                <span><span style={{ color: '#0d9488' }}>●</span> Positive</span>
                <span><span style={{ color: '#dc2626' }}>●</span> Negative</span>
                <span><span style={{ color: '#d4cfc5' }}>●</span> Neutral</span>
            </div>
        </div>
    )
}
