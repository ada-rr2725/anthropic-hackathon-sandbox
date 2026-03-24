# Cascade — Policy Impact Analysis

Describe any policy in plain English. Cascade uses Claude to reason about it and renders interactive visualisations across markets, demographics, voting blocs, and geography — in seconds.

![Cascade demo](docs/screenshot.png)

---

## What it does

Type something like *"the UK raises the minimum wage to £15/hour"* and Cascade:

1. Sends the description to Claude, which reasons about the policy and returns a structured analysis
2. Scores impacts across all 11 S&P market sectors, 15 demographic groups, 10 voting blocs, and up to 10 affected countries
3. Renders the results as interactive charts you can explore immediately

The analysis includes magnitude scores (1–5), direction, confidence levels, historical analogues, and a four-horizon timeline from immediate effects to long-term consequences.

---

## Screenshots

> Add screenshots here once deployed.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Charts | Plotly.js 2.27 (CDN) |
| Maps | D3.js 7.9 + TopoJSON 3 (CDN) |
| LLM | Anthropic Claude (direct browser API) |
| Fonts | DM Sans + DM Mono |

No backend required. The app calls the Anthropic API directly from the browser.

---

## Getting started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/ada-rr2725/anthropic-hackathon-sandbox.git
cd anthropic-hackathon-sandbox
npm install
cp .env.example .env
# Add your Anthropic API key to .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment variables

| Variable | Description |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key |

---

## Project structure

```
src/
├── App.jsx                  # Root component and application state
├── components/
│   ├── BackgroundMap.jsx    # Animated world map backdrop
│   ├── CascadeGraph.jsx     # Radial analysis-progress diagram
│   ├── MarketsChart.jsx     # S&P sector impact bars
│   ├── PeopleChart.jsx      # Demographic impact breakdown
│   ├── VotersChart.jsx      # Voting bloc alignment chart
│   ├── TimelineView.jsx     # Four-horizon timeline
│   └── WorldMap.jsx         # Interactive geographic impact map
├── services/
│   ├── anthropic.js         # Streaming API client
│   ├── modelParser.js       # Safe JSON extraction from LLM output
│   └── codeExecutor.js      # Sandboxed code runner
└── prompts/
    └── understanding.js     # Policy analysis system prompt
```

---

## How the analysis works

The policy text is sent to `claude-haiku-4-5` with a structured system prompt that enforces a JSON output schema. The response streams in and is parsed progressively — the UI updates as each section arrives. On parse failure, the raw response is recovered using bracket-matching as a fallback.

See [`docs/spec.md`](docs/spec.md) for the full product specification.

---

## Development

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # run ESLint
```

---

## Licence

MIT
