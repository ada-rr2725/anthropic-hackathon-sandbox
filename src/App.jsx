import { useState, useEffect } from 'react'
import { streamMessage } from './services/anthropic'
import { parsePolicyAnalysis } from './services/modelParser'
import { POLICY_ANALYSIS_PROMPT } from './prompts/understanding'
import WorldMap from './components/WorldMap'
import BackgroundMap from './components/BackgroundMap'
import CascadeGraph from './components/CascadeGraph'
import MarketsChart from './components/MarketsChart'
import PeopleChart from './components/PeopleChart'
import VotersChart from './components/VotersChart'
import TimelineView from './components/TimelineView'
import ApiKeyGate from './components/ApiKeyGate'

const EXAMPLES = [
  'The US imposes a 25% blanket tariff on all Chinese imports',
  'The UK raises the national minimum wage to £15 per hour',
  'Cannabis is legalised federally in the United States',
  'The US passes a federal Medicare for All healthcare bill',
  'Universal Basic Income of £1,000/month is introduced in the UK',
  'The US eliminates capital gains tax for investments held over 5 years',
]

const CHART_TABS = [
  { id: 'markets',  label: 'Markets'  },
  { id: 'people',   label: 'People'   },
  { id: 'voters',   label: 'Voters'   },
  { id: 'timeline', label: 'Timeline' },
]

const ANIM = `
  @keyframes csc-spin    { to { transform: rotate(360deg); } }
  @keyframes csc-pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes csc-fadein  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  @keyframes csc-flow    { to { stroke-dashoffset: -40; } }
  @keyframes csc-pop     { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes csc-glow-o  { 0%,100%{filter:drop-shadow(0 0 4px #f9731660)} 50%{filter:drop-shadow(0 0 14px #f97316cc)} }
  @keyframes csc-glow-t  { 0%,100%{filter:drop-shadow(0 0 4px #0d948860)} 50%{filter:drop-shadow(0 0 14px #0d9488cc)} }
  .pill-btn:hover  { background:#fff0e8 !important; border-color:#f97316 !important; color:#f97316 !important; }
  .submit-btn:hover { box-shadow: 0 6px 28px rgba(249,115,22,0.45) !important; transform: translateY(-1px); }
  .submit-btn:active { transform: scale(0.98) !important; }
  .chart-tab:hover { color: #1a1612 !important; }
  .panel-scroll::-webkit-scrollbar { width: 4px; }
  .panel-scroll::-webkit-scrollbar-track { background: transparent; }
  .panel-scroll::-webkit-scrollbar-thumb { background: #e8e4dc; border-radius: 2px; }
  .examples-pills { display:flex; flex-wrap:wrap; gap:8px; }
  .mobile-stats   { display:flex; align-items:stretch; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .mobile-stats::-webkit-scrollbar { display:none; }
  @media (max-width:767px) {
    .examples-pills { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; scrollbar-width:none; }
    .examples-pills::-webkit-scrollbar { display:none; }
  }
`

// which spokes are active based on status message
function spokesFromStatus(msg)
{
  if (msg.includes('geographic') || msg.includes('ripple'))   return ['geo']
  if (msg.includes('market'))                                  return ['geo', 'markets']
  if (msg.includes('demographic') || msg.includes('people'))  return ['geo', 'markets', 'people']
  if (msg.includes('electoral') || msg.includes('voting'))    return ['geo', 'markets', 'people', 'voters']
  return []
}

const GLASS = {
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.75)',
  borderRadius: '20px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
}

// resolve api key: env var takes priority, then localstorage
function resolveInitialKey()
{
  const env = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (env && env !== 'your-key-here') return env
  return localStorage.getItem('cascade_api_key') || ''
}

export default function App()
{
  const [apiKey, setApiKey]       = useState(resolveInitialKey)
  const [phase, setPhase]         = useState('idle')
  const [policy, setPolicy]       = useState('')
  const [analysis, setAnalysis]   = useState(null)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab]       = useState('markets')
  const [statusMsg, setStatusMsg]       = useState('')
  const [leftOpen, setLeftOpen]         = useState(true)
  const [rightOpen, setRightOpen]       = useState(true)
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < 768)
  const [mobileTab, setMobileTab]       = useState('analysis')

  useEffect(() =>
  {
    const s = document.createElement('style')
    s.textContent = ANIM
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  useEffect(() =>
  {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  async function handleSubmit()
  {
    const trimmed = policy.trim()
    if (!trimmed || phase === 'analyzing') return

    setPhase('analyzing')
    setAnalysis(null)
    setError(null)
    setActiveTab('markets')
    setStatusMsg('Identifying policy mechanisms...')

    try
    {
      const text = await streamMessage({
        system: POLICY_ANALYSIS_PROMPT,
        userMessage: trimmed,
        apiKey,
        onChunk: (_, full) =>
        {
          if (full.includes('"voting_demographics"'))      setStatusMsg('Mapping electoral implications...')
          else if (full.includes('"demographic_impacts"')) setStatusMsg('Assessing demographic effects...')
          else if (full.includes('"market_impacts"'))      setStatusMsg('Mapping market exposure...')
          else if (full.includes('"geographic_impacts"'))  setStatusMsg('Tracing geographic ripple effects...')
        },
      })

      setAnalysis(parsePolicyAnalysis(text))
      setPhase('done')
    }
    catch (err)
    {
      setError(err.message)
      setPhase('error')
    }
  }

  function handleReset()
  {
    setPhase('idle'); setPolicy(''); setAnalysis(null); setError(null); setActiveTab('markets')
  }

  const uncertaintyColor =
    analysis?.uncertainty_level === 'high'   ? '#dc2626' :
    analysis?.uncertainty_level === 'medium' ? '#d97706' : '#0d9488'

  return (
    <div style={{ minHeight: '100svh', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a1612', display: 'flex', flexDirection: 'column' }}>

      {/* ── api key gate ── */}
      {!apiKey && <ApiKeyGate onKeySubmit={setApiKey} />}

      {apiKey && <>

      {/* ── sticky header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px', height: '60px',
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e4dc',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', cursor: 'pointer' }} onClick={handleReset}>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.05em', color: '#1a1612' }}>
            Cas<span style={{ color: '#f97316' }}>ca</span>de
          </span>
          {!isMobile && (
            <span style={{ fontSize: '12px', color: '#a09890', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
              Policy Impact Analysis
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {phase === 'done' && (
            <button
              onClick={handleReset}
              style={{ background: 'none', border: '1px solid #e8e4dc', borderRadius: '8px', padding: '7px 18px', fontSize: '13px', color: '#7a7268', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← New policy
            </button>
          )}
          <button
            onClick={() => { localStorage.removeItem('cascade_api_key'); setApiKey('') }}
            title="Change API key"
            style={{ background: 'none', border: '1px solid #e8e4dc', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', color: '#c8c2b8', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            API key
          </button>
        </div>
      </header>

      {/* ── idle / error ── */}
      {(phase === 'idle' || phase === 'error') && (
        <div style={{ flex: 1, position: 'relative', background: '#f5f5f0' }}>
          <BackgroundMap />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto', padding: isMobile ? '36px 20px 60px' : '72px 36px 80px' }}>

            {/* hero */}
            <div style={{ marginBottom: isMobile ? '28px' : '44px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#f97316', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', animation: 'csc-pulse 2s infinite', flexShrink: 0 }} />
                Powered by Claude AI
              </div>
              <h1 style={{ fontSize: isMobile ? '34px' : '52px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '12px', color: '#1a1612' }}>
                What policy do you<br />
                <span style={{ color: '#f97316' }}>want to analyse?</span>
              </h1>
              {!isMobile && (
                <p style={{ fontSize: '17px', color: '#7a7268', lineHeight: 1.65, maxWidth: '520px' }}>
                  Describe any law, regulation, or social action. Cascade traces ripple effects across global markets, demographics, and voting blocs — instantly.
                </p>
              )}
              {isMobile && (
                <p style={{ fontSize: '15px', color: '#7a7268', lineHeight: 1.55, margin: 0 }}>
                  Describe any law or regulation. Cascade traces the ripple effects instantly.
                </p>
              )}
            </div>

            {/* input card */}
            <div style={{ ...GLASS, padding: isMobile ? '20px' : '28px', marginBottom: '20px' }}>
              <textarea
                value={policy}
                onChange={e => setPolicy(e.target.value)}
                placeholder="e.g. The US imposes a 25% blanket tariff on all Chinese imports…"
                rows={3}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
                style={{
                  width: '100%', background: '#fafaf8', border: '1.5px solid #e8e4dc',
                  borderRadius: '12px', color: '#1a1612', fontSize: '16px',
                  lineHeight: 1.6, padding: '14px 18px', resize: 'vertical',
                  minHeight: '90px', marginBottom: '14px', transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                {!isMobile && <span style={{ fontSize: '12px', color: '#c8c2b8' }}>⌘ + Enter to submit</span>}
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!policy.trim()}
                  style={{
                    background: policy.trim() ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e8e4dc',
                    color: policy.trim() ? '#fff' : '#a09890',
                    border: 'none', borderRadius: '12px',
                    padding: isMobile ? '15px' : '13px 32px',
                    width: isMobile ? '100%' : 'auto',
                    fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em',
                    cursor: policy.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: policy.trim() ? '0 4px 20px rgba(249,115,22,0.35)' : 'none',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  Analyse Policy →
                </button>
              </div>
            </div>

            {/* examples */}
            <div>
              <p style={{ fontSize: '11px', color: '#c8c2b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '10px' }}>Try an example</p>
              <div className="examples-pills">
                {EXAMPLES.map(ex => (
                  <button key={ex} className="pill-btn" onClick={() => setPolicy(ex)} style={{
                    background: 'rgba(255,255,255,0.85)', border: '1px solid #e8e4dc', borderRadius: '100px',
                    color: '#7a7268', fontSize: '13px', padding: '7px 16px', cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit', backdropFilter: 'blur(8px)',
                    flexShrink: 0,
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {phase === 'error' && error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', color: '#dc2626', fontSize: '14px', marginTop: '20px' }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── analyzing ── */}
      {phase === 'analyzing' && (() => {
        const active = spokesFromStatus(statusMsg)
        const cx = 200, cy = 200, r = 120
        const svgSize = isMobile ? Math.min(300, window.innerWidth - 48) : 400
        const spokes = [
          { id: 'geo',     label: 'Geography',  angle: -90,  icon: '🌍', col: '#0d9488' },
          { id: 'markets', label: 'Markets',     angle: 0,    icon: '📈', col: '#f97316' },
          { id: 'people',  label: 'People',      angle: 90,   icon: '👥', col: '#0d9488' },
          { id: 'voters',  label: 'Voters',      angle: 180,  icon: '🗳', col: '#f97316' },
        ]
        return (
          <div style={{ flex: 1, background: '#f5f5f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '20px' : '32px', padding: isMobile ? '24px 16px' : '40px' }}>

            {/* radial diagram */}
            <svg width={svgSize} height={svgSize} viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
              <defs>
                <radialGradient id="centreGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff7ed" />
                  <stop offset="100%" stopColor="#ffedd5" />
                </radialGradient>
                <marker id="arrowO" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" opacity="0.7" />
                </marker>
                <marker id="arrowT" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#0d9488" opacity="0.7" />
                </marker>
              </defs>

              {/* spoke lines */}
              {spokes.map(({ id, angle, col }) => {
                const rad  = angle * Math.PI / 180
                const x1   = cx + 44 * Math.cos(rad)
                const y1   = cy + 44 * Math.sin(rad)
                const x2   = cx + (r - 32) * Math.cos(rad)
                const y2   = cy + (r - 32) * Math.sin(rad)
                const on   = active.includes(id)
                const mark = col === '#f97316' ? 'url(#arrowO)' : 'url(#arrowT)'
                return (
                  <line key={id}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={col} strokeWidth={on ? 2 : 1.5}
                    strokeDasharray={on ? '8 6' : '4 8'}
                    strokeOpacity={on ? 0.9 : 0.25}
                    markerEnd={on ? mark : undefined}
                    style={on ? { animation: 'csc-flow 0.8s linear infinite' } : {}}
                  />
                )
              })}

              {/* outer nodes */}
              {spokes.map(({ id, label, angle, icon, col }) => {
                const rad = angle * Math.PI / 180
                const nx  = cx + r * Math.cos(rad)
                const ny  = cy + r * Math.sin(rad)
                const on  = active.includes(id)
                return (
                  <g key={id} style={on ? { animation: 'csc-pop 0.4s ease-out both' } : {}}>
                    <circle cx={nx} cy={ny} r={30}
                      fill={on ? col + '18' : '#f5f5f0'}
                      stroke={col} strokeWidth={on ? 2 : 1}
                      strokeOpacity={on ? 1 : 0.3}
                      style={on ? { animation: col === '#f97316' ? 'csc-glow-o 2s ease-in-out infinite' : 'csc-glow-t 2s ease-in-out infinite' } : {}}
                    />
                    <text x={nx} y={ny - 4} textAnchor="middle" fontSize="16">{icon}</text>
                    <text x={nx} y={ny + 13} textAnchor="middle" fontSize="9.5"
                      fontFamily="'DM Sans', sans-serif" fontWeight={on ? 700 : 400}
                      fill={on ? col : '#c8c2b8'}>
                      {label}
                    </text>
                  </g>
                )
              })}

              {/* centre node */}
              <circle cx={cx} cy={cy} r={44} fill="url(#centreGrad)"
                stroke="#f97316" strokeWidth={2}
                style={{ animation: 'csc-glow-o 1.8s ease-in-out infinite' }}
              />
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22">⚡</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11"
                fontFamily="'DM Sans', sans-serif" fontWeight={700} fill="#f97316">
                Cascade
              </text>
              <text x={cx} y={cy + 24} textAnchor="middle" fontSize="9"
                fontFamily="'DM Sans', sans-serif" fill="#a09890">
                analysing
              </text>
            </svg>

            {/* status + policy label */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a1612', margin: '0 0 6px' }}>{statusMsg}</p>
              <p style={{ fontSize: '13px', color: '#a09890', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>"{policy}"</p>
            </div>

            {/* progress pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {spokes.map(({ id, label, col }) => {
                const on = active.includes(id)
                return (
                  <div key={id} style={{
                    padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                    background: on ? col + '18' : '#f0ece8',
                    color: on ? col : '#c8c2b8',
                    border: `1px solid ${on ? col + '44' : '#e8e4dc'}`,
                    transition: 'all 0.3s',
                  }}>
                    {on ? '✓ ' : ''}{label}
                  </div>
                )
              })}
            </div>

          </div>
        )
      })()}

      {/* ── results: mobile stacked layout ── */}
      {phase === 'done' && analysis && isMobile && (() => {
        const geo     = analysis.geographic_impacts || []
        const markets = analysis.market_impacts     || []
        const pos     = markets.filter(m => m.direction === 'positive').length
        const neg     = markets.filter(m => m.direction === 'negative').length
        const topHit  = [...markets].sort((a, b) => (b.magnitude||0) - (a.magnitude||0))[0]
        const ucColor = analysis.uncertainty_level === 'high' ? '#dc2626' : analysis.uncertainty_level === 'medium' ? '#d97706' : '#0d9488'
        const mStats = [
          { label: 'Countries',  value: geo.length,                        color: '#f97316' },
          { label: '↑ Markets',  value: pos,                               color: '#0d9488' },
          { label: '↓ Markets',  value: neg,                               color: '#dc2626' },
          { label: 'Top sector', value: topHit?.sector ?? '—',             color: '#f97316' },
          { label: 'Confidence', value: analysis.uncertainty_level ?? '—', color: ucColor   },
        ]
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f0', overflow: 'hidden' }}>

            {/* map strip */}
            <div style={{ height: '38vh', flexShrink: 0, position: 'relative', overflow: 'hidden', borderBottom: '1px solid #e8e4dc' }}>
              <WorldMap data={analysis.geographic_impacts} background />
            </div>

            {/* stats strip */}
            <div className="mobile-stats" style={{ flexShrink: 0, background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e8e4dc', padding: '0 4px' }}>
              {mStats.map(({ label, value, color }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center', padding: '10px 14px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color, lineHeight: 1.1 }}>{value}</div>
                    <div style={{ fontSize: '9px', color: '#a09890', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
                  </div>
                  {i < mStats.length - 1 && <div style={{ width: '1px', background: '#f0ece6', alignSelf: 'stretch', margin: '8px 0', flexShrink: 0 }} />}
                </div>
              ))}
            </div>

            {/* main tab bar */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e8e4dc', flexShrink: 0 }}>
              {[{ id: 'analysis', label: 'Analysis' }, { id: 'charts', label: 'Charts' }].map(t => (
                <button key={t.id} onClick={() => setMobileTab(t.id)} style={{
                  flex: 1, padding: '13px', fontSize: '14px', fontWeight: 700,
                  background: 'none', border: 'none', borderBottom: mobileTab === t.id ? '2.5px solid #f97316' : '2.5px solid transparent',
                  color: mobileTab === t.id ? '#f97316' : '#a09890',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* content area */}
            <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', background: '#fafaf8' }}>

              {/* analysis tab */}
              {mobileTab === 'analysis' && (
                <div style={{ padding: '0 0 32px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '6px' }}>Policy</div>
                    <div style={{ fontSize: '13px', color: '#3a3430', lineHeight: 1.5, fontStyle: 'italic' }}>"{policy}"</div>
                  </div>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', background: '#fffcf9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>Key Takeaway</div>
                    <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.45, color: '#1a1612', margin: 0 }}>{analysis.core_insight}</p>
                  </div>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', width: '100%', marginBottom: '4px' }}>Classification</div>
                    {analysis.policy_type && (
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '20px', background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa' }}>
                        {analysis.policy_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {analysis.uncertainty_level && (
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '20px', color: ucColor, border: `1px solid ${ucColor}55`, background: ucColor + '12' }}>
                        {analysis.uncertainty_level === 'high' ? '⚠ High' : analysis.uncertainty_level === 'medium' ? '~ Medium' : '✓ Low'} Uncertainty
                      </span>
                    )}
                  </div>
                  {analysis.summary && (
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>What It Does</div>
                      <p style={{ fontSize: '13px', color: '#4a4440', lineHeight: 1.7, margin: 0 }}>{analysis.summary}</p>
                    </div>
                  )}
                  {analysis.key_tradeoff && (
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>Core Tradeoff</div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚖</span>
                        <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6, margin: 0, background: '#fffbf5', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px' }}>{analysis.key_tradeoff}</p>
                      </div>
                    </div>
                  )}
                  {analysis.historical_analogues?.length > 0 && (
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '10px' }}>Historical Precedents</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.historical_analogues.map((a, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#0d9488', fontWeight: 700, fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>#{i + 1}</span>
                            <span style={{ fontSize: '12.5px', color: '#5a5450', lineHeight: 1.5 }}>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '14px' }}>Impact Cascade</div>
                    <CascadeGraph analysis={analysis} />
                  </div>
                </div>
              )}

              {/* charts tab */}
              {mobileTab === 'charts' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* chart sub-tab bar */}
                  <div style={{ display: 'flex', gap: '2px', padding: '10px 14px 0', borderBottom: '1px solid #f0ece6', background: '#fff', position: 'sticky', top: 0, zIndex: 5, flexShrink: 0 }}>
                    {CHART_TABS.map(t => (
                      <button key={t.id} className="chart-tab" onClick={() => setActiveTab(t.id)} style={{
                        flex: 1, padding: '9px 4px', fontSize: '12px', fontWeight: 600,
                        borderRadius: '8px 8px 0 0', background: activeTab === t.id ? '#fff7ed' : 'transparent',
                        color: activeTab === t.id ? '#f97316' : '#a09890', border: 'none',
                        borderBottom: activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
                        marginBottom: '-1px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '20px' }}>
                    {activeTab === 'markets'  && <MarketsChart data={analysis.market_impacts} />}
                    {activeTab === 'people'   && <PeopleChart  data={analysis.demographic_impacts} />}
                    {activeTab === 'voters'   && <VotersChart  data={analysis.voting_demographics} />}
                    {activeTab === 'timeline' && <TimelineView data={analysis.timeline} />}
                  </div>
                </div>
              )}

            </div>
          </div>
        )
      })()}

      {/* ── results: desktop — map background + floating panels ── */}
      {phase === 'done' && analysis && !isMobile && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 'calc(100svh - 60px)' }}>

          {/* full-screen world map background */}
          <WorldMap data={analysis.geographic_impacts} background />

          {/* ── STATS STRIP (bottom centre) ── */}
          {(() => {
            const geo     = analysis.geographic_impacts || []
            const markets = analysis.market_impacts     || []
            const pos     = markets.filter(m => m.direction === 'positive').length
            const neg     = markets.filter(m => m.direction === 'negative').length
            const topHit  = [...markets].sort((a, b) => (b.magnitude||0) - (a.magnitude||0))[0]
            const ucColor = analysis.uncertainty_level === 'high' ? '#dc2626' : analysis.uncertainty_level === 'medium' ? '#d97706' : '#0d9488'
            const stats = [
              { label: 'Countries',  value: geo.length,                        color: '#f97316' },
              { label: '↑ Sectors',  value: pos,                               color: '#0d9488' },
              { label: '↓ Sectors',  value: neg,                               color: '#dc2626' },
              { label: 'Hardest hit', value: topHit?.sector ?? '—',            color: '#f97316' },
              { label: 'Confidence', value: analysis.uncertainty_level ?? '—', color: ucColor   },
            ]
            return (
              <div style={{
                position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                ...GLASS, padding: '10px 8px',
                display: 'flex', alignItems: 'stretch',
                animation: 'csc-fadein 0.5s 0.4s both', zIndex: 10,
                whiteSpace: 'nowrap',
              }}>
                {stats.map(({ label, value, color }, i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: '10px', color: '#a09890', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
                    </div>
                    {i < stats.length - 1 && <div style={{ width: '1px', background: '#f0ece6', alignSelf: 'stretch', margin: '4px 0' }} />}
                  </div>
                ))}
                <div style={{ width: '1px', background: '#f0ece6', alignSelf: 'stretch', margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 16px', fontSize: '12px', color: '#7a7268' }}>
                  <span><span style={{ color: '#0d9488' }}>●</span> Positive</span>
                  <span><span style={{ color: '#dc2626' }}>●</span> Negative</span>
                  <span style={{ color: '#c8c2b8', fontSize: '11px' }}>scroll to zoom</span>
                </div>
              </div>
            )
          })()}

          {/* ── LEFT PANEL: cascade graph + summary ── */}
          <div
            style={{
              ...GLASS,
              position: 'absolute',
              left: '24px',
              top: '24px',
              width: '340px',
              maxHeight: 'calc(100svh - 108px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'csc-fadein 0.5s 0.1s both',
            }}
          >
            {/* panel header with collapse toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: leftOpen ? '1px solid #f0ece6' : 'none', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a09890' }}>Analysis</span>
              <button onClick={() => setLeftOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#c8c2b8', lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}>
                {leftOpen ? '−' : '+'}
              </button>
            </div>

            {leftOpen && (
            <div className="panel-scroll" style={{ overflowY: 'auto', padding: '0 0 8px' }}>

              {/* ── SECTION: Policy Query ── */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '6px' }}>Policy Query</div>
                <div style={{ fontSize: '13px', color: '#3a3430', lineHeight: 1.5, fontStyle: 'italic' }}>"{policy}"</div>
              </div>

              {/* ── SECTION: Core Insight ── */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', background: '#fffcf9' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>Key Takeaway</div>
                <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.4, color: '#1a1612', margin: 0 }}>
                  {analysis.core_insight}
                </p>
              </div>

              {/* ── SECTION: Classification ── */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', width: '100%', marginBottom: '4px' }}>Classification</div>
                {analysis.policy_type && (
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '20px', background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa' }}>
                    {analysis.policy_type.replace(/_/g, ' ')}
                  </span>
                )}
                {analysis.uncertainty_level && (
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '20px', color: uncertaintyColor, border: `1px solid ${uncertaintyColor}55`, background: uncertaintyColor + '12' }}>
                    {analysis.uncertainty_level === 'high' ? '⚠ High' : analysis.uncertainty_level === 'medium' ? '~ Medium' : '✓ Low'} Uncertainty
                  </span>
                )}
              </div>

              {/* ── SECTION: Summary ── */}
              {analysis.summary && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>What It Does</div>
                  <p style={{ fontSize: '13px', color: '#4a4440', lineHeight: 1.7, margin: 0 }}>
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* ── SECTION: Key Tradeoff ── */}
              {analysis.key_tradeoff && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '8px' }}>Core Tradeoff</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚖</span>
                    <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6, margin: 0, background: '#fffbf5', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px' }}>
                      {analysis.key_tradeoff}
                    </p>
                  </div>
                </div>
              )}

              {/* ── SECTION: Historical Analogues ── */}
              {analysis.historical_analogues?.length > 0 && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '10px' }}>Historical Precedents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysis.historical_analogues.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#0d9488', fontWeight: 700, fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>#{i + 1}</span>
                        <span style={{ fontSize: '12.5px', color: '#5a5450', lineHeight: 1.5 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION: Impact Cascade ── */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '14px' }}>
                  Impact Cascade
                  <span style={{ marginLeft: '6px', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px', color: '#d4cfc5' }}>— how effects ripple outward</span>
                </div>
                <CascadeGraph analysis={analysis} />
              </div>

              {/* ── SECTION: Actions (placeholders) ── */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c8c2b8', marginBottom: '12px' }}>Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { icon: '📄', label: 'Export PDF',      tag: 'Soon' },
                    { icon: '🔗', label: 'Share Link',      tag: 'Soon' },
                    { icon: '⚖',  label: 'Compare Policies', tag: 'Soon' },
                    { icon: '📊', label: 'Economic Model',  tag: 'Soon' },
                    { icon: '🗺', label: 'Detailed Map',    tag: 'Soon' },
                    { icon: '🔔', label: 'Set Alert',       tag: 'Soon' },
                  ].map(({ icon, label, tag }) => (
                    <button
                      key={label}
                      disabled
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        background: '#fafaf8', border: '1px solid #e8e4dc',
                        borderRadius: '10px', padding: '9px 12px',
                        fontSize: '12px', color: '#a09890', cursor: 'not-allowed',
                        fontFamily: 'inherit', textAlign: 'left', opacity: 0.85,
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{icon}</span>
                      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f0ece6', color: '#c8c2b8', borderRadius: '4px', padding: '2px 5px' }}>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
            )}
          </div>

          {/* ── RIGHT PANEL: charts ── */}
          <div
            style={{
              ...GLASS,
              position: 'absolute',
              right: '24px',
              top: '24px',
              width: '420px',
              maxHeight: 'calc(100svh - 108px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'csc-fadein 0.5s 0.2s both',
            }}
          >
            {/* right panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a09890' }}>Impact Charts</span>
              <button onClick={() => setRightOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#c8c2b8', lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}>
                {rightOpen ? '−' : '+'}
              </button>
            </div>

            {/* sticky tab bar */}
            {rightOpen && <div style={{
              display: 'flex',
              gap: '2px',
              padding: '10px 14px 0',
              borderBottom: '1px solid #f0ece6',
              flexShrink: 0,
            }}>
              {CHART_TABS.map(t => (
                <button
                  key={t.id}
                  className="chart-tab"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px 8px 0 0',
                    background: activeTab === t.id ? '#fff7ed' : 'transparent',
                    color: activeTab === t.id ? '#f97316' : '#a09890',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>}

            {/* chart content area */}
            {rightOpen && (
            <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {activeTab === 'markets'  && <MarketsChart data={analysis.market_impacts} />}
              {activeTab === 'people'   && <PeopleChart  data={analysis.demographic_impacts} />}
              {activeTab === 'voters'   && <VotersChart  data={analysis.voting_demographics} />}
              {activeTab === 'timeline' && <TimelineView data={analysis.timeline} />}
            </div>
            )}
          </div>


        </div>
      )}

      </>}
    </div>
  )
}
