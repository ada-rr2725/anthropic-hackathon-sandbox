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
    if (score >= 4) return '#10b981'
    if (score > 0) return '#34d399'
    if (score <= -4) return '#ef4444'
    if (score < 0) return '#f87171'
    return '#2a2a3e'
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
                bgcolor: '#161625',
                bordercolor: '#2a2a3e',
                font: { family: "'DM Sans', sans-serif", color: '#e2ddd8', size: 13 },
                align: 'left',
            },
        }

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: "'DM Sans', system-ui, sans-serif", color: '#e2ddd8', size: 13 },
            margin: { l: 180, r: 40, t: 10, b: 50 },
            height: 420,
            xaxis: {
                range: [-5.5, 5.5],
                gridcolor: '#1e1e30',
                zerolinecolor: '#2a2a3e',
                zerolinewidth: 1,
                tickfont: { color: '#7a7590', size: 12 },
            },
            yaxis: {
                tickfont: { color: '#e2ddd8', size: 13 },
                gridwidth: 0,
            },
            shapes: [{
                type: 'line',
                x0: 0, x1: 0, y0: -0.5, y1: sorted.length - 0.5,
                line: { color: '#2a2a3e', width: 1 },
            }],
            annotations: [
                {
                    x: -4, y: -0.8, xref: 'x', yref: 'y',
                    text: '← Negative impact',
                    showarrow: false,
                    font: { size: 11, color: '#7a7590' },
                },
                {
                    x: 4, y: -0.8, xref: 'x', yref: 'y',
                    text: 'Positive impact →',
                    showarrow: false,
                    font: { size: 11, color: '#7a7590' },
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
            <p style={{ fontSize: '13px', color: '#7a7590', marginBottom: '16px' }}>
                S&P 500 sector exposure — bars show direction and magnitude of expected impact
            </p>
            <div ref={containerRef} />
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#7a7590' }}>
                <span><span style={{ color: '#34d399' }}>●</span> High confidence</span>
                <span><span style={{ color: '#fbbf24' }}>○</span> Medium confidence</span>
                <span><span style={{ color: '#7a7590' }}>◌</span> Low confidence</span>
            </div>
        </div>
    )
}
