import { useState, useEffect } from 'react'
import { streamMessage } from './services/anthropic'
import { parsePolicyAnalysis } from './services/modelParser'
import { POLICY_ANALYSIS_PROMPT } from './prompts/understanding'
import WorldMap from './components/WorldMap'
import BackgroundMap from './components/BackgroundMap'
import MarketsChart from './components/MarketsChart'
import PeopleChart from './components/PeopleChart'
import VotersChart from './components/VotersChart'
import TimelineView from './components/TimelineView'

const EXAMPLES = [
  'The US imposes a 25% blanket tariff on all Chinese imports',
  'The UK raises the national minimum wage to £15 per hour',
  'Cannabis is legalised federally in the United States',
  'The US passes a federal Medicare for All healthcare bill',
  'Universal Basic Income of £1,000/month is introduced in the UK',
  'The US eliminates capital gains tax for investments held over 5 years',
]

const TABS = [
  { id: 'map',      label: '🌍 World Map' },
  { id: 'markets',  label: 'Markets' },
  { id: 'people',   label: 'People' },
  { id: 'voters',   label: 'Voters' },
  { id: 'timeline', label: 'Timeline' },
]

const ANIM = `
  @keyframes csc-spin { to { transform: rotate(360deg); } }
  @keyframes csc-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .pill-btn:hover { background:#fff0e8 !important; border-color:#f97316 !important; color:#f97316 !important; }
  .submit-btn:hover { box-shadow: 0 6px 28px rgba(249,115,22,0.45) !important; transform: translateY(-1px); }
  .submit-btn:active { transform: scale(0.98) !important; }
  .tab-btn:hover { color: #1a1612 !important; }
`


export default function App()
{
  const [phase, setPhase]       = useState('idle')
  const [policy, setPolicy]     = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState('map')
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() =>
  {
    const s = document.createElement('style')
    s.textContent = ANIM
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  async function handleSubmit()
  {
    const trimmed = policy.trim()
    if (!trimmed || phase === 'analyzing') return

    setPhase('analyzing')
    setAnalysis(null)
    setError(null)
    setActiveTab('map')
    setStatusMsg('Identifying policy mechanisms...')

    try
    {
      const text = await streamMessage({
        system: POLICY_ANALYSIS_PROMPT,
        userMessage: trimmed,
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
    setPhase('idle'); setPolicy(''); setAnalysis(null); setError(null); setActiveTab('map')
  }

  const uncertaintyColor =
    analysis?.uncertainty_level === 'high'   ? '#dc2626' :
    analysis?.uncertainty_level === 'medium' ? '#d97706' : '#0d9488'

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f0', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a1612', display: 'flex', flexDirection: 'column' }}>

      {/* ── header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px', height: '60px',
        background: '#fff', borderBottom: '1px solid #e8e4dc',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.05em', color: '#1a1612' }}>
            Cas<span style={{ color: '#f97316' }}>ca</span>de
          </span>
          <span style={{ fontSize: '12px', color: '#a09890', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
            Policy Impact Analysis
          </span>
        </div>
        {phase !== 'idle' && (
          <button
            onClick={handleReset}
            style={{ background: 'none', border: '1px solid #e8e4dc', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', color: '#7a7268', cursor: 'pointer' }}
          >
            ← New policy
          </button>
        )}
      </header>

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '56px 36px 80px' }}>

        {/* ── idle / error ── */}
        {(phase === 'idle' || phase === 'error') && (
          <div style={{ position: 'relative' }}>
            <BackgroundMap />
            <div style={{ position: 'relative', zIndex: 1 }}>
            {/* hero */}
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#f97316', fontWeight: 600, marginBottom: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', animation: 'csc-pulse 2s infinite', flexShrink: 0 }} />
                Powered by Claude AI
              </div>
              <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px', color: '#1a1612' }}>
                What policy do you<br />
                <span style={{ color: '#f97316' }}>want to analyse?</span>
              </h1>
              <p style={{ fontSize: '17px', color: '#7a7268', lineHeight: 1.65, maxWidth: '540px' }}>
                Describe any law, regulation, or social action. Cascade traces ripple effects across global markets, demographics, and voting blocs — instantly.
              </p>
            </div>

            {/* input card */}
            <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: '20px', padding: '28px', marginBottom: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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
                  minHeight: '90px', marginBottom: '16px', transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#c8c2b8' }}>⌘ + Enter to submit</span>
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!policy.trim()}
                  style={{
                    background: policy.trim() ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e8e4dc',
                    color: policy.trim() ? '#fff' : '#a09890',
                    border: 'none', borderRadius: '12px', padding: '13px 32px',
                    fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em',
                    cursor: policy.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: policy.trim() ? '0 4px 20px rgba(249,115,22,0.35)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Analyse Policy →
                </button>
              </div>
            </div>

            {/* examples */}
            <div>
              <p style={{ fontSize: '11px', color: '#c8c2b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '12px' }}>Try an example</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} className="pill-btn" onClick={() => setPolicy(ex)} style={{
                    background: '#fff', border: '1px solid #e8e4dc', borderRadius: '100px',
                    color: '#7a7268', fontSize: '13px', padding: '7px 16px', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {phase === 'error' && error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', color: '#dc2626', fontSize: '14px', marginTop: '24px' }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── analyzing ── */}
        {phase === 'analyzing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px', textAlign: 'center' }}>
            <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: '16px', padding: '10px 20px', fontSize: '14px', color: '#7a7268', marginBottom: '40px', maxWidth: '600px' }}>
              {policy}
            </div>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: '3px solid #fed7aa', borderTopColor: '#f97316', animation: 'csc-spin 0.65s linear infinite', marginBottom: '24px' }} />
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#1a1612', marginBottom: '6px' }}>{statusMsg}</p>
            <p style={{ fontSize: '14px', color: '#a09890' }}>Cascade is building a full impact analysis across markets, people, and voters.</p>
          </div>
        )}

        {/* ── results ── */}
        {phase === 'done' && analysis && (
          <>
            {/* result header card */}
            <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: '20px', padding: '32px', marginBottom: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '12px', color: '#a09890', marginBottom: '8px', fontWeight: 500 }}>{policy}</div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '12px', color: '#1a1612' }}>
                {analysis.core_insight}
              </h2>
              <p style={{ fontSize: '15px', color: '#7a7268', lineHeight: 1.75, marginBottom: '20px' }}>
                {analysis.summary}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: analysis.historical_analogues?.length ? '16px' : '0' }}>
                {analysis.policy_type && (
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 12px', borderRadius: '6px', background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa' }}>
                    {analysis.policy_type.replace(/_/g, ' ')}
                  </span>
                )}
                {analysis.uncertainty_level && (
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 12px', borderRadius: '6px', background: '#f8fafc', color: uncertaintyColor, border: `1px solid ${uncertaintyColor}33` }}>
                    {analysis.uncertainty_level} uncertainty
                  </span>
                )}
                {analysis.key_tradeoff && (
                  <span style={{ fontSize: '13px', color: '#7a7268', fontStyle: 'italic' }}>⚖ {analysis.key_tradeoff}</span>
                )}
              </div>
              {analysis.historical_analogues?.length > 0 && (
                <p style={{ fontSize: '13px', color: '#a09890' }}>
                  <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#c8c2b8', fontWeight: 600 }}>Historical analogues </strong>
                  {analysis.historical_analogues.join(' · ')}
                </p>
              )}
            </div>

            {/* tab bar */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e8e4dc', marginBottom: '28px' }}>
              {TABS.map(t => (
                <button key={t.id} className="tab-btn"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '10px 20px', fontSize: '14px', fontWeight: 600,
                    borderRadius: '8px 8px 0 0', background: activeTab === t.id ? '#fff' : 'transparent',
                    color: activeTab === t.id ? '#f97316' : '#a09890',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
                    marginBottom: '-2px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* chart panels — wrapped in a white card */}
            <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              {activeTab === 'map'      && <WorldMap    data={analysis.geographic_impacts} />}
              {activeTab === 'markets'  && <MarketsChart data={analysis.market_impacts} />}
              {activeTab === 'people'   && <PeopleChart  data={analysis.demographic_impacts} />}
              {activeTab === 'voters'   && <VotersChart  data={analysis.voting_demographics} />}
              {activeTab === 'timeline' && <TimelineView data={analysis.timeline} />}
            </div>
          </>
        )}

      </main>
    </div>
  )
}
