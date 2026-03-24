const PERIODS = [
    { key: 'immediate', label: 'Immediate', sublabel: 'Days to weeks' },
    { key: 'short_term', label: '1-2 Years', sublabel: 'Short term' },
    { key: 'medium_term', label: '3-5 Years', sublabel: 'Medium term' },
    { key: 'long_term', label: '5+ Years', sublabel: 'Long term' },
]

const S = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
    },
    card: {
        background: '#fafaf8',
        border: '1px solid #e8e4dc',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
    },
    label: {
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#f97316',
        marginBottom: '4px',
    },
    sublabel: {
        fontSize: '11px',
        color: '#c8c2b8',
        marginBottom: '10px',
    },
    body: {
        fontSize: '14px',
        color: '#1a1612',
        lineHeight: 1.55,
    },
    connector: {
        position: 'absolute',
        top: '50%',
        right: '-8px',
        width: '8px',
        height: '2px',
        background: '#e8e4dc',
    },
}

export default function TimelineView({ data })
{
    if (!data) return null

    return (
        <div>
            <p style={{ fontSize: '13px', color: '#a09890', marginBottom: '16px' }}>
                How this policy unfolds over time
            </p>
            <div style={S.grid}>
                {PERIODS.map((p, i) => (
                    <div key={p.key} style={S.card}>
                        <div style={S.label}>{p.label}</div>
                        <div style={S.sublabel}>{p.sublabel}</div>
                        <div style={S.body}>{data[p.key] || 'No data'}</div>
                        {i < PERIODS.length - 1 && <div style={S.connector} />}
                    </div>
                ))}
            </div>
        </div>
    )
}
