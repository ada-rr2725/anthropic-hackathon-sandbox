import { useState } from 'react'

const GLASS = {
  background: 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.75)',
  borderRadius: '20px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset',
}

// shown when no api key is available via env var or localstorage
export default function ApiKeyGate({ onKeySubmit })
{
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e)
  {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed.startsWith('sk-ant-'))
    {
      setError("That doesn't look right — Anthropic keys start with sk-ant-")
      return
    }
    localStorage.setItem('cascade_api_key', trimmed)
    onKeySubmit(trimmed)
  }

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f0', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '24px',
    }}>
      <div style={{ ...GLASS, width: '100%', maxWidth: '460px', padding: '40px 36px' }}>

        {/* logo */}
        <div style={{ marginBottom: '28px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.05em', color: '#1a1612' }}>
            Cas<span style={{ color: '#f97316' }}>ca</span>de
          </span>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', color: '#1a1612', margin: '0 0 8px' }}>
          Add your API key
        </h2>
        <p style={{ fontSize: '14px', color: '#7a7268', lineHeight: 1.6, margin: '0 0 28px' }}>
          Cascade runs entirely in your browser — your key is stored locally and never leaves your device.
          Get one from{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#f97316', textDecoration: 'none', fontWeight: 500 }}
          >
            console.anthropic.com
          </a>.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            placeholder="sk-ant-..."
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', background: '#fafaf8', border: `1.5px solid ${error ? '#fca5a5' : '#e8e4dc'}`,
              borderRadius: '12px', color: '#1a1612', fontSize: '15px',
              padding: '13px 16px', marginBottom: '8px', boxSizing: 'border-box',
              fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.15s',
            }}
          />
          {error && (
            <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 14px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={!value.trim()}
            style={{
              width: '100%', background: value.trim() ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e8e4dc',
              color: value.trim() ? '#fff' : '#a09890', border: 'none', borderRadius: '12px',
              padding: '13px', fontSize: '15px', fontWeight: 700, cursor: value.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', letterSpacing: '-0.01em', marginTop: error ? '0' : '6px',
              boxShadow: value.trim() ? '0 4px 20px rgba(249,115,22,0.35)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Start analysing →
          </button>
        </form>

        <p style={{ fontSize: '12px', color: '#c8c2b8', margin: '20px 0 0', lineHeight: 1.5 }}>
          Your key is saved in <code style={{ fontFamily: 'monospace', background: '#f0ece8', padding: '1px 5px', borderRadius: '4px' }}>localStorage</code> so you only need to enter it once.
        </p>
      </div>
    </div>
  )
}
