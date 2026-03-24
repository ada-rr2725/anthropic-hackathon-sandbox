# CLAUDE.md — Project Instructions for Claude Code

## Project overview

This is a generative model sandbox — a web app that takes natural language descriptions of any system/phenomenon and generates interactive, parameterised visualisations. The user does not need to know what model is appropriate; the system reasons about the problem and builds the right model.

Read `hackathon-spec.md` for the full specification before doing any work.

## Critical rules

1. **Follow the implementation stages in hackathon-spec.md in order.** Do not skip ahead. Each stage has an exit criterion — verify it is met before proceeding.
2. **Do not modify the system prompts** in `src/prompts/` without explicit instruction. They are carefully crafted and tested.
3. **No npm packages beyond Vite + React + Tailwind.** Plotly.js and Three.js are loaded via CDN in `index.html` and available as `window.Plotly` and `window.THREE`.
4. **All components are functional components with hooks.** No class components.
5. **Use Tailwind utility classes for all styling.** No separate CSS modules. Only `globals.css` for base Tailwind config and CSS custom properties.
6. **API key is read from `VITE_ANTHROPIC_API_KEY` environment variable.** Never hardcode it.
7. **The visualisation container must have a stable DOM ID** (`model-viz-container`) that persists across React re-renders. Use a ref, not a key that changes.

## Architecture

Two-call pipeline:
- **Call 1 (Understanding Engine):** user prompt → structured JSON (model spec, parameters, reasoning)
- **Call 2 (Generation Engine):** model spec JSON → self-contained JavaScript function that renders interactive Plotly/Three.js visualisation

Both system prompts live in `src/prompts/`. The JSON output from Call 1 is the contract between the understanding and generation engines.

## Code style

- Lowercase comments
- Allman-style braces for any non-JSX code (utility functions, service files)
- British English in user-facing copy (e.g. "visualisation" not "visualization")
- Direct, slightly informal tone in UI copy
- No em dashes in UI text

## File structure

```
src/
├── App.jsx
├── components/
│   ├── PromptInput.jsx
│   ├── ThinkingStream.jsx
│   ├── ParameterForm.jsx
│   ├── ModelCard.jsx
│   ├── VisualisationContainer.jsx
│   ├── ControlPanel.jsx
│   ├── ErrorState.jsx
│   └── Header.jsx
├── services/
│   ├── anthropic.js
│   ├── codeExecutor.js
│   └── modelParser.js
├── prompts/
│   ├── understanding.js
│   ├── generation.js
│   └── recovery.js
├── styles/
│   └── globals.css
└── main.jsx
```

## Testing approach

- After implementing each component, verify it renders correctly with mock data before wiring to real API calls
- After Stage 3, run these smoke test prompts end-to-end:
  1. "how does compound interest grow over 30 years"
  2. "show me how option prices change with volatility and time to expiry"
  3. "simulate a predator-prey ecosystem"
- If any smoke test fails, fix it before moving to Stage 4

## When uncertain

- If a design decision is ambiguous, prefer the simpler option
- If a component's props are unclear, check `hackathon-spec.md` section 5 and the data flow described in section 8
- If generated visualisation code fails, check the error recovery flow in section 8.2 of the spec
- Do not introduce new dependencies or patterns not described in the spec without asking first
