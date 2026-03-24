# CLAUDE.md — Project Instructions for Claude Code

## Project overview

Cascade is a policy impact analysis tool. The user describes any policy in plain English; the app sends it to Claude, receives a structured JSON analysis, and renders interactive charts across four dimensions: financial markets, demographics, voting blocs, and geography.

Full product specification: [`docs/spec.md`](docs/spec.md).

## Architecture

Single-call pipeline:

1. User submits a policy description
2. `streamMessage` (in `src/services/anthropic.js`) streams the response from `claude-haiku-4-5`
3. `parsePolicyAnalysis` (in `src/services/modelParser.js`) extracts the JSON from the streamed text
4. `App.jsx` distributes the parsed analysis to the chart components

The system prompt lives in `src/prompts/understanding.js`. It enforces a strict JSON schema — do not modify it without explicit instruction; it is carefully calibrated.

## Critical rules

1. **Do not modify `src/prompts/understanding.js`** without explicit instruction.
2. **No npm packages beyond Vite + React + Tailwind.** Plotly.js, D3.js, and TopoJSON are loaded via CDN in `index.html`.
3. **All components are functional components with hooks.** No class components.
4. **Use Tailwind utility classes for styling.** No separate CSS modules. Only `src/index.css` for base styles and CSS custom properties.
5. **API key is read from `VITE_ANTHROPIC_API_KEY`.** Never hardcode it.

## Code style

- Lowercase comments
- Allman-style braces for non-JSX code (utility functions, service files)
- British English in user-facing copy ("visualisation", "analyse", "colour")
- Direct, slightly informal tone in UI copy
- No em dashes in UI text

## File structure

```
src/
├── App.jsx
├── components/
│   ├── BackgroundMap.jsx
│   ├── CascadeGraph.jsx
│   ├── MarketsChart.jsx
│   ├── PeopleChart.jsx
│   ├── VotersChart.jsx
│   ├── TimelineView.jsx
│   └── WorldMap.jsx
├── services/
│   ├── anthropic.js
│   ├── codeExecutor.js
│   └── modelParser.js
├── prompts/
│   └── understanding.js
└── main.jsx
```

## When uncertain

- Prefer the simpler option when a design decision is ambiguous
- Check `docs/spec.md` for the intended data shape and component props
- Do not introduce new dependencies or patterns not described in the spec without asking first
