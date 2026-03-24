import { useState, useEffect } from 'react'
import { streamMessage } from './services/anthropic'
import { parsePolicyAnalysis } from './services/modelParser'
import { POLICY_ANALYSIS_PROMPT } from './prompts/understanding'
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
  { id: 'markets', label: 'Markets' },
  { id: 'people', label: 'People' },
  { id: 'voters', label: 'Voters' },
  { id: 'timeline', label: 'Timeline' },
]

const S = {
  app: {
    minHeight: '100svh',
    background: '#08080f',
    color: '#e2ddd8',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #1e1e30',
    background: '#0f0f1a',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: '#e2ddd8',
  },
  logoAccent: {
    color: '#22d3ee',
  },
  logoTagline: {
    fontSize: '13px',
    color: '#7a7590',
    letterSpacing: '0.02em',
  },
  newBtn: {
    background: 'transparent',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    color: '#7a7590',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    padding: '48px 32px',
  },

  // — idle state —
  headline: {
    fontSize: '36px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
    marginBottom: '12px',
    color: '#e2ddd8',
  },
  subheadline: {
    fontSize: '16px',
    color: '#7a7590',
    lineHeight: 1.6,
    marginBottom: '32px',
    maxWidth: '580px',
  },
  textarea: {
    width: '100%',
    background: '#0f0f1a',
    border: '1px solid #2a2a3e',
    borderRadius: '12px',
    color: '#e2ddd8',
    fontSize: '16px',
    lineHeight: 1.6,
    padding: '16px 20px',
    resize: 'vertical',
    minHeight: '100px',
    marginBottom: '16px',
    transition: 'border-color 0.15s',
  },
  examplesLabel: {
    fontSize: '12px',
    color: '#7a7590',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '10px',
  },
  examples: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '24px',
  },
  pill: {
    background: '#0f0f1a',
    border: '1px solid #1e1e30',
    borderRadius: '100px',
    color: '#7a7590',
    fontSize: '13px',
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  submitBtn: {
    background: '#22d3ee',
    color: '#08080f',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 28px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
  },

  // — loading state —
  policyPill: {
    display: 'inline-block',
    background: '#161625',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#7a7590',
    marginBottom: '32px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#e2ddd8',
  },
  loadingHint: {
    fontSize: '14px',
    color: '#7a7590',
    lineHeight: 1.6,
  },

  // — analysis header —
  coreInsight: {
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    marginBottom: '12px',
    color: '#e2ddd8',
  },
  summary: {
    fontSize: '15px',
    color: '#7a7590',
    lineHeight: 1.7,
    marginBottom: '16px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '32px',
  },
  badge: {
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#161625',
    border: '1px solid #2a2a3e',
  },
  tradeoff: {
    fontSize: '13px',
    color: '#7a7590',
    fontStyle: 'italic',
  },
  divider: {
    height: '1px',
    background: '#1e1e30',
    margin: '32px 0',
  },

  // — tabs —
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid #1e1e30',
    marginBottom: '24px',
  },
  tab: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px 8px 0 0',
    background: 'transparent',
    color: '#7a7590',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#22d3ee',
    borderBottomColor: '#22d3ee',
    background: '#161625',
  },

  // — error —
  errorBox: {
    background: '#1a0f0f',
    border: '1px solid #3a1e1e',
    borderRadius: '10px',
    padding: '16px 20px',
    color: '#f87171',
    fontSize: '14px',
    marginTop: '16px',
  },
}

function Spinner()
{
  return (
    <span style={{
      display: 'inline-block',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      border: '2px solid #2a2a3e',
      borderTopColor: '#22d3ee',
      animation: 'cascade-spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export default function App()
{
  const [phase, setPhase] = useState('idle')   // idle | analyzing | done | error
  const [policy, setPolicy] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('markets')
  const [statusMsg, setStatusMsg] = useState('')

  // inject keyframe animation once
  useEffect(() =>
  {
    const style = document.createElement('style')
    style.textContent = `@keyframes cascade-spin { to { transform: rotate(360deg); } }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
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
      const analysisText = await streamMessage({
        system: POLICY_ANALYSIS_PROMPT,
        userMessage: trimmed,
        onChunk: (_, full) =>
        {
          if (full.includes('"voting_demographics"')) setStatusMsg('Mapping electoral implications...')
          else if (full.includes('"demographic_impacts"')) setStatusMsg('Assessing demographic effects...')
          else if (full.includes('"market_impacts"')) setStatusMsg('Mapping market sector exposure...')
        },
      })

      const parsed = parsePolicyAnalysis(analysisText)
      setAnalysis(parsed)
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
    setPhase('idle')
    setPolicy('')
    setAnalysis(null)
    setError(null)
    setActiveTab('markets')
  }

  const uncertaintyColor =
    analysis?.uncertainty_level === 'high' ? '#f87171' :
    analysis?.uncertainty_level === 'medium' ? '#fbbf24' : '#34d399'

  return (
    <div style={S.app}>
      {/* ── header ── */}
      <header style={S.header}>
        <div style={S.logoRow}>
          <span style={S.logoText}>
            Cas<span style={S.logoAccent}>ca</span>de
          </span>
          <span style={S.logoTagline}>Policy Impact Analysis</span>
        </div>
        {phase !== 'idle' && (
          <button style={S.newBtn} onClick={handleReset}>
            ← New policy
          </button>
        )}
      </header>

      <main style={S.main}>

        {/* ── idle / error: input form ── */}
        {(phase === 'idle' || phase === 'error') && (
          <>
            <h1 style={S.headline}>What policy do you want to analyse?</h1>
            <p style={S.subheadline}>
              Describe any law, regulation, or social action. Cascade will trace its effects
              across financial markets, demographics, and voting blocs.
            </p>

            <textarea
              style={S.textarea}
              value={policy}
              onChange={e => setPolicy(e.target.value)}
              placeholder="e.g. The US imposes a 25% blanket tariff on all Chinese imports"
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
            />

            <p style={S.examplesLabel}>Try an example</p>
            <div style={S.examples}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  style={S.pill}
                  onClick={() => setPolicy(ex)}
                  onMouseEnter={e => { e.target.style.borderColor = '#2a2a3e'; e.target.style.color = '#e2ddd8' }}
                  onMouseLeave={e => { e.target.style.borderColor = '#1e1e30'; e.target.style.color = '#7a7590' }}
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              style={{ ...S.submitBtn, opacity: policy.trim() ? 1 : 0.4, cursor: policy.trim() ? 'pointer' : 'not-allowed' }}
              onClick={handleSubmit}
              disabled={!policy.trim()}
            >
              Analyse Policy →
            </button>

            {phase === 'error' && error && (
              <div style={S.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </>
        )}

        {/* ── analyzing ── */}
        {phase === 'analyzing' && (
          <>
            <div style={S.policyPill}>{policy}</div>
            <div style={S.loadingRow}>
              <Spinner />
              <span>{statusMsg}</span>
            </div>
          </>
        )}

        {/* ── results ── */}
        {phase === 'done' && analysis && (
          <>
            <div style={S.policyPill}>{policy}</div>

            <h2 style={S.coreInsight}>{analysis.core_insight}</h2>
            <p style={S.summary}>{analysis.summary}</p>

            <div style={S.metaRow}>
              {analysis.policy_type && (
                <span style={{ ...S.badge, color: '#22d3ee', borderColor: '#1a3a42' }}>
                  {analysis.policy_type.replace(/_/g, ' ')}
                </span>
              )}
              {analysis.uncertainty_level && (
                <span style={{ ...S.badge, color: uncertaintyColor }}>
                  {analysis.uncertainty_level} uncertainty
                </span>
              )}
              {analysis.key_tradeoff && (
                <span style={S.tradeoff}>⚖ {analysis.key_tradeoff}</span>
              )}
            </div>

            {analysis.historical_analogues?.length > 0 && (
              <p style={{ fontSize: '13px', color: '#7a7590', marginBottom: '24px' }}>
                <strong style={{ color: '#3a3a52', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Historical analogues </strong>
                {analysis.historical_analogues.join(' · ')}
              </p>
            )}

            <div style={S.divider} />

            {/* ── tab bar ── */}
            <div style={S.tabBar}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  style={{
                    ...S.tab,
                    ...(activeTab === t.id ? S.tabActive : {}),
                  }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── tab panels ── */}
            {activeTab === 'markets' && <MarketsChart data={analysis.market_impacts} />}
            {activeTab === 'people' && <PeopleChart data={analysis.demographic_impacts} />}
            {activeTab === 'voters' && <VotersChart data={analysis.voting_demographics} />}
            {activeTab === 'timeline' && <TimelineView data={analysis.timeline} />}
          </>
        )}

      </main>
    </div>
  )
}
