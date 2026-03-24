# PolicyLens — Full Project Specification

> **Event:** Anthropic Hackathon @ Imperial College London
> **Date:** 24 March 2026, 4:00 PM – 8:00 PM
> **Track:** Track 4 — Governance & Collaboration
> **Build time:** ~2.5 hours (core) + 30 min polish

---

## 1. What this is

PolicyLens takes a plain-English description of any law, policy, regulation, or geopolitical event and generates a rich, multi-panel visualisation of its real-world impacts. The user does not need domain expertise. The system reasons about the policy, identifies who and what is affected, and renders an interactive world map with layered impact overlays, a knock-on effects flowchart, demographic breakdown charts, and social impact summaries — all driven by a single natural language input.

**Example inputs:**
- "The EU bans single-use plastics from 2027"
- "The US raises the federal minimum wage to $20 per hour"
- "China places a 35% tariff on Australian iron ore"
- "The UK introduces a sugar tax on all beverages above 8g/100ml"
- "Russia restricts natural gas exports to Western Europe"

### 1.1 Who it serves

- **Citizens:** Understand how a bill in the news actually affects their life, their job, their household costs
- **Journalists and policy researchers:** Rapid structured overview of a policy's cascading effects across sectors and geographies
- **Students:** See the interconnected real-world consequences of economic and political decisions
- **Judges at this hackathon:** A clear demonstration that AI can make governance more legible and accessible

### 1.2 Core principle

Policy impacts are invisible to most people because the causal chains are long, jargon-heavy, and buried in reports nobody reads. PolicyLens makes those chains visible, interactive, and immediately comprehensible. The AI does the reasoning; the visualisations deliver it.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        React App (Vite)                       │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐    │
│  │ PolicyInput │───▶│  Understanding Engine (Call 1)    │    │
│  │  (textarea) │    │  policy text → ImpactSpec JSON    │    │
│  └─────────────┘    └──────────────┬───────────────────┘    │
│                                    │ ImpactSpec               │
│                          ┌─────────▼──────────┐             │
│                          │  Visualisation Layer │             │
│                          │  (fixed components,  │             │
│                          │   data-driven)       │             │
│                          └──────────┬───────────┘            │
│          ┌───────────────┬──────────┴──────────┬──────────┐  │
│          ▼               ▼                     ▼          ▼  │
│    ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌────────┐│
│    │ WorldMap │  │ KnockOn Graph│  │ Demo Charts│  │ Social ││
│    │ (D3.js)  │  │ (D3 force)   │  │ (Plotly)   │  │ Cards  ││
│    └──────────┘  └──────────────┘  └────────────┘  └────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Key architectural decision:** Unlike the companion Generative Model Sandbox (which generates arbitrary visualisation code via a second Claude call), PolicyLens uses a **single Claude call** to produce a structured `ImpactSpec` JSON, which is then rendered by fixed, purpose-built React/D3/Plotly components. This is more reliable under time pressure and ensures the map + flowchart + charts are always populated correctly.

---

## 3. The ImpactSpec JSON contract

This is the single output of the Understanding Engine. Every visualisation component consumes this object. Claude must produce valid JSON matching this schema exactly.

```json
{
  "policy_title": "string — short name for the policy",
  "policy_summary": "string — 1-2 sentences of plain-English description",
  "policy_type": "regulation | tax | trade | sanctions | subsidy | ban | reform | conflict",
  "confidence": "high | medium | low",
  "primary_region": {
    "name": "string",
    "lat": "number",
    "lon": "number"
  },
  "affected_regions": [
    {
      "name": "string",
      "country_code": "ISO 3166-1 alpha-3",
      "lat": "number",
      "lon": "number",
      "impact_score": "number 0–100 (100 = most impacted)",
      "impact_direction": "positive | negative | mixed",
      "impact_summary": "string — one sentence"
    }
  ],
  "trade_routes": [
    {
      "from_name": "string",
      "from_lat": "number",
      "from_lon": "number",
      "to_name": "string",
      "to_lat": "number",
      "to_lon": "number",
      "route_type": "disrupted | redirected | new | strengthened",
      "commodity": "string",
      "magnitude": "number 0–100"
    }
  ],
  "demographics": [
    {
      "group": "string — e.g. 'Low-income households', 'Manufacturing workers'",
      "impact_score": "number -100 to +100 (negative = harmed, positive = benefits)",
      "primary_regions": ["string"],
      "key_effect": "string — one sentence"
    }
  ],
  "timeline": [
    {
      "period": "string — e.g. '0–3 months', '1–2 years'",
      "label": "string — what happens in this period",
      "severity": "number 0–100"
    }
  ],
  "knockon_graph": {
    "nodes": [
      {
        "id": "string",
        "label": "string",
        "type": "trigger | economic | social | political | environmental | outcome",
        "sentiment": "positive | negative | neutral | mixed"
      }
    ],
    "edges": [
      {
        "source": "string — node id",
        "target": "string — node id",
        "label": "string — mechanism (optional)",
        "strength": "number 0–1"
      }
    ]
  },
  "social_impacts": [
    {
      "group": "string",
      "sentiment": "positive | negative | mixed",
      "headline": "string — punchy 6-word summary",
      "detail": "string — 2–3 sentences explaining the impact on this group's daily life",
      "magnitude": "low | medium | high | critical"
    }
  ],
  "kpis": {
    "countries_affected": "number",
    "people_affected": "string — e.g. '1.2B'",
    "gdp_impact_usd": "string — e.g. '+$340B' or '-$85B'",
    "timeline_to_peak": "string — e.g. '6–18 months'",
    "reversibility": "easy | moderate | difficult | irreversible"
  },
  "ethical_notes": [
    "string — notable ethical considerations or caveats about this analysis"
  ]
}
```

---

## 4. System prompt — Understanding Engine

The understanding prompt lives in `src/prompts/policyUnderstanding.js` and is exported as `POLICY_UNDERSTANDING_PROMPT`.

### Prompt design principles

1. **No speculation presented as fact** — all impacts are framed as estimates and modelled effects, not certainties
2. **Population-level, not individual** — the tool makes generalisations about groups, never individuals
3. **Balanced framing** — for every negative impact, consider whether any group benefits; policies rarely have purely one-sided effects
4. **Geographically grounded** — lat/lon coordinates must be real and accurate; use capital cities or major economic centres as proxies
5. **Calibrated confidence** — flag `confidence: "low"` if the policy is highly domain-specific, unprecedented, or geographically ambiguous

### Prompt structure

```
You are PolicyLens, an AI policy impact analyst. Your role is to take a plain-English description of
a law, policy, regulation, trade action, or geopolitical event and produce a structured JSON analysis
of its real-world impacts.

Your analysis must be:
- Grounded in real-world economic, social, and geopolitical knowledge
- Balanced — show both who benefits and who is harmed
- Specific — name real countries, demographic groups, sectors, and companies where relevant
- Honest about uncertainty — use confidence levels and ethical_notes to flag limitations
- Accessible — write summaries and labels a non-expert can understand

You must output ONLY valid JSON matching the ImpactSpec schema provided below. No preamble, no
explanation, no markdown fences. Just the JSON object.

[ImpactSpec schema is embedded here at runtime]

Populate ALL fields. For knockon_graph, produce between 6 and 12 nodes showing the causal chain
from the policy trigger to 2nd and 3rd order effects. For social_impacts, cover at least 4
distinct demographic groups. For affected_regions, include at minimum 6 countries.

If the input is ambiguous, make the most reasonable interpretation and note it in ethical_notes.
If the input describes something clearly harmful or illegal, decline and return:
{"error": "cannot_analyse", "reason": "string"}
```

---

## 5. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Vite + React 18 | Existing project scaffold |
| World map | D3.js v7 + TopoJSON v3 | CDN — already proven in simulator-3.html reference design |
| Network/flowchart | D3.js force simulation | Same library, no extra dep |
| Charts | Plotly.js 2.35.0 | CDN — already in index.html |
| Styling | Tailwind CSS | Existing project setup |
| AI | Anthropic API — claude-sonnet-4-20250514 | Streaming optional for loading state |
| Fonts | JetBrains Mono + Outfit | Google Fonts CDN — same as reference design |

### index.html additions required

```html
<!-- Add these alongside existing Plotly/Three.js CDN scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## 6. Component structure

```
src/
├── App.jsx                           # State machine, orchestration
├── components/
│   ├── PolicyInput.jsx               # Textarea + submit button, left panel
│   ├── AnalysisHeader.jsx            # Policy title, type badge, confidence, KPIs strip
│   ├── WorldMapPanel.jsx             # D3 world map — affected regions, trade routes
│   ├── KnockOnGraph.jsx              # D3 force graph — causal chain flowchart
│   ├── DemographicsChart.jsx         # Plotly horizontal bar — impact by group
│   ├── TimelineChart.jsx             # Plotly line/area — severity over time periods
│   ├── SocialImpactCards.jsx         # Text cards — one per social_impacts entry
│   ├── ThinkingIndicator.jsx         # Animated "analysing policy..." overlay
│   └── ErrorState.jsx                # Error display with retry
├── services/
│   ├── anthropic.js                  # API call wrapper
│   └── impactParser.js               # JSON parse with fallback + validation
├── prompts/
│   └── policyUnderstanding.js        # POLICY_UNDERSTANDING_PROMPT constant
└── styles/
    └── globals.css                   # Tailwind base + CSS custom properties
```

### App state machine

```
idle
  → analysing    (user submits policy text, Call 1 in flight)
  → ready        (ImpactSpec received and parsed successfully)
  → error        (API error or JSON parse failure)
ready
  → analysing    (user submits new policy)
```

---

## 7. UI layout

Three-panel layout, full-viewport, dark theme. Reference: `simulator-3.html` in the project root.

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR: PolicyLens  /  Policy Impact Visualiser          [status]   │
├────────────────┬────────────────────────────────┬───────────────────┤
│  LEFT (300px)  │       CENTRE (flex-1)          │  RIGHT (360px)    │
│                │                                │                   │
│  [textarea]    │  [tab: Map | Flowchart |       │  KPI strip        │
│  "Describe a   │   Demographics | Timeline]     │                   │
│  policy..."    │                                │  Social impact    │
│                │  [active visualisation panel]  │  cards            │
│  [Analyse]     │                                │  (one per group)  │
│                │                                │                   │
│  ── ── ── ──   │                                │  Ethical notes    │
│                │                                │                   │
│  [previous     │                                │                   │
│   analyses     │                                │                   │
│   history,     │                                │                   │
│   optional]    │                                │                   │
└────────────────┴────────────────────────────────┴───────────────────┘
```

### Colour system (from reference design, adapted)

```css
:root {
  --bg-0: #06090f;
  --bg-1: #0b1018;
  --bg-2: #101722;
  --text-0: #eaf0f6;
  --text-1: #a0b4c8;
  --text-2: #5e7a96;
  --red: #ff3355;       /* negative impact / disrupted routes */
  --orange: #ff8a3a;    /* high severity */
  --yellow: #ffc83a;    /* moderate severity */
  --green: #30d98c;     /* positive impact */
  --blue: #3a9eff;      /* neutral / informational */
  --cyan: #22d3ee;      /* chokepoints / highlights */
  --purple: #a78bfa;    /* social / demographic */
}
```

---

## 8. Visualisation panel specifications

### 8.1 World Map (D3.js — Natural Earth projection)

**Data source:** `affected_regions`, `trade_routes`, `primary_region`

**What it renders:**
- Base world map — dark fill (#111c2e), subtle border lines
- Global shipping lanes — faint dashed lines (always visible, from reference design data)
- **Affected region colouring** — choropleth-style fill on country paths, coloured by `impact_direction` (red gradient for negative, green for positive, purple for mixed), opacity scaled by `impact_score`
- **Primary region marker** — pulsing red circle at the policy origin with concentric ring animation
- **Trade route arcs** — quadratic bezier curves, colour by `route_type` (orange = disrupted, green = new/strengthened, blue = redirected), line weight by `magnitude`
- **Region labels** — small monospace labels on hover with `impact_summary` tooltip
- Zoom + pan via d3.zoom, consistent with reference design

**Implementation notes:**
- Load world topology from `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`
- Match country names from `affected_regions` to TopoJSON features by ISO code where possible, fallback to coordinate-based dot markers
- Trade route arcs should animate in one at a time (staggered with delay) after map loads

### 8.2 Knock-On Graph (D3.js force simulation)

**Data source:** `knockon_graph.nodes`, `knockon_graph.edges`

**What it renders:**
- Directed graph with force-directed layout
- Nodes coloured by `type`: trigger (orange-red), economic (blue), social (purple), political (cyan), environmental (green), outcome (yellow)
- Node size scaled by number of incoming edges (more connections = larger)
- Edges drawn as curved paths with arrowhead markers, opacity by `strength`
- Node labels always visible (small monospace font below node)
- Edge labels shown on hover only

**Layout hint:** Pin the trigger node to the left, outcomes to the right, so the graph reads left-to-right causally. Use `fx` on the trigger node.

**Interaction:** Drag nodes to rearrange, hover shows full label + edge mechanism text.

### 8.3 Demographics Chart (Plotly)

**Data source:** `demographics`

**What it renders:**
- Horizontal bar chart
- X-axis: impact score (-100 to +100), centre at 0
- Bars coloured red for negative scores, green for positive, amber for small effects
- Each bar = one demographic group
- Axis label: "Impact Score — negative (harmed) ← 0 → positive (benefits)"
- Plotly config: transparent background, no modebar, custom colour scale matching design system

### 8.4 Timeline Chart (Plotly)

**Data source:** `timeline`

**What it renders:**
- Area chart — x-axis = time periods (discrete), y-axis = severity (0–100)
- Area fill with gradient (yellow → orange → red at high severity)
- Labelled data points with period descriptions on hover
- Vertical reference line at "peak" (highest severity point)

### 8.5 Social Impact Cards (React — right panel)

**Data source:** `social_impacts`

**What it renders:**
- One card per entry, stacked vertically in the right panel
- Card header: group name + sentiment badge (coloured dot + "HARMED" / "BENEFITS" / "MIXED")
- Headline in larger weight
- Detail text in smaller body copy
- Magnitude indicator: thin left border, colour-coded (red = critical, orange = high, yellow = medium, green = low)
- Scroll within the right panel

---

## 9. Service layer

### 9.1 anthropic.js

```javascript
// export
async function analysePolicy(policyText, onStatus)
// - calls claude-sonnet-4-20250514
// - system prompt: POLICY_UNDERSTANDING_PROMPT with ImpactSpec schema injected
// - user message: policyText
// - max_tokens: 4096 (ImpactSpec JSON can be large)
// - calls onStatus("Contacting Claude...") / onStatus("Parsing response...")
// - returns raw text (JSON string)
```

### 9.2 impactParser.js

```javascript
// export
function parseImpactSpec(rawText)
// - strips any accidental markdown fences (```json ... ```)
// - JSON.parse
// - validates required top-level fields exist
// - if parse fails, throws ParseError with original text for debugging
// - does NOT retry — caller handles error state
```

---

## 10. Implementation stages

### Stage 1 — Scaffold & data layer (30 min)

- [ ] Add D3, TopoJSON, Google Fonts CDN to `index.html`
- [ ] Write `POLICY_UNDERSTANDING_PROMPT` in `src/prompts/policyUnderstanding.js`
  - Embed ImpactSpec schema inline in prompt
- [ ] Implement `analysePolicy()` in `anthropic.js`
- [ ] Implement `parseImpactSpec()` in `impactParser.js`
- [ ] Test with a single policy input via browser console — verify valid JSON output

**Exit criterion:** `analysePolicy("UK sugar tax on drinks")` returns parseable ImpactSpec JSON in the console.

### Stage 2 — World map (35 min)

- [ ] Implement `WorldMapPanel.jsx` with D3 Natural Earth projection
- [ ] Load world atlas TopoJSON, render base countries
- [ ] Draw shipping lanes (use data from reference `simulator-3.html`)
- [ ] Accept `ImpactSpec` prop — render affected region fills, trade route arcs, primary region pulse
- [ ] Zoom/pan working
- [ ] Test with hardcoded mock ImpactSpec

**Exit criterion:** Mock ImpactSpec renders 6+ countries coloured, 3+ trade route arcs visible.

### Stage 3 — Knock-on graph + charts (35 min)

- [ ] Implement `KnockOnGraph.jsx` with D3 force simulation
  - Trigger node pinned left, directed edges with arrows
- [ ] Implement `DemographicsChart.jsx` with Plotly horizontal diverging bar
- [ ] Implement `TimelineChart.jsx` with Plotly area chart
- [ ] Centre panel tabs: Map / Flowchart / Demographics / Timeline
- [ ] Test all panels with mock ImpactSpec

**Exit criterion:** All four centre panel tabs render correctly with mock data.

### Stage 4 — Right panel + App wiring (25 min)

- [ ] Implement `SocialImpactCards.jsx`
- [ ] Implement `AnalysisHeader.jsx` (KPI strip)
- [ ] Implement `PolicyInput.jsx` (textarea + submit)
- [ ] Implement `ThinkingIndicator.jsx` (animated overlay)
- [ ] Wire full App state machine: idle → analysing → ready → error
- [ ] Connect `analysePolicy()` → `parseImpactSpec()` → all visualisation components

**Exit criterion:** End-to-end flow works: type policy → analysing state → all panels populate.

### Stage 5 — Polish (20 min)

- [ ] Staggered animation for trade route arcs
- [ ] Map zoom-to-origin on new result
- [ ] Error state with retry button
- [ ] Topbar status badge (IDLE / ANALYSING / LIVE)
- [ ] Mobile: single-column fallback if needed

---

## 11. Demo script

**Demo duration:** ~3 minutes

1. **Warm-up (familiar territory):** "China restricts rare earth exports to the US"
   - Shows trade routes immediately; judges with finance/quant background recognise the scenario
   - Highlight the knock-on graph: mining → battery → EV → inflation → political response

2. **Social angle:** "UK introduces Universal Basic Income of £800/month"
   - Shows mixed demographics — some groups positive, some negative (taxpayer burden)
   - Highlight the social impact cards in the right panel — this is the "human" story

3. **Live wildcard from judges:** Take a suggestion from the room
   - The tool handles any policy in any domain — this is the demo wow moment

**Talking points for each:**
- "The AI doesn't just give you bullet points — it reasons about the causal structure"
- "You can see who benefits and who is harmed, which is what policy debate is usually missing"
- "All of this from a single sentence in plain English, no domain knowledge required"

---

## 12. Judging criteria alignment

| Criterion | How PolicyLens scores |
|---|---|
| **Impact Potential (25)** | Policy opacity is a genuine global problem. Tool serves citizens, journalists, students. Scales to any country, any policy domain |
| **Technical Execution (30)** | Working AI pipeline + D3 world map + force graph + Plotly charts. Multiple integrated systems, all functional |
| **Ethical Alignment (25)** | Balanced framing (benefits and harms). Clear "modelled estimate" framing, not presented as fact. `ethical_notes` field in output. No auto-fetching = no hallucinated live data. Empowers understanding, does not make decisions for users |
| **Presentation (20)** | Visually striking. Live demo with audience-suggested policy. Clear narrative: "type a policy, understand the world" |

---

## 13. Ethical considerations

These must be addressed in the demo pitch, not just in code:

1. **Epistemic humility** — Claude's analysis is a structured estimate, not ground truth. The UI should clearly label outputs as "AI-modelled impacts" not "predicted outcomes". The `confidence` field and `ethical_notes` surface this.

2. **Framing bias** — the system could implicitly favour certain political framings of policies. The prompt explicitly requires showing both beneficiaries and those harmed. Demo should illustrate this with a policy that has mixed effects.

3. **Who it could harm** — a bad actor could use this tool to identify which groups a policy harms and target those groups. Mitigation: tool is descriptive (existing policy), not prescriptive (designing harm).

4. **Data grounding** — Claude's training data has a cutoff. For very recent policies, the tool may not reflect latest developments. This is noted in `ethical_notes` when `confidence: "low"`.

5. **Access** — the tool is in English, web-only, requires internet. These access barriers are acknowledged but unavoidable at hackathon scale.

---

## 14. What NOT to build (scope constraints)

- No real-time data fetching (Reuters, government APIs, etc.) — too fragile, too slow
- No user accounts or history persistence — not needed for demo
- No comparison mode (two policies side by side) — Stage 5 stretch goal only
- No export to PDF/share link — Stage 5 stretch goal only
- No second Claude call for visualisation code generation — fixed components are faster and more reliable
- No chatbot interface — single-shot analysis, not multi-turn conversation

---

## 15. Pre-hackathon checklist

- [ ] `VITE_ANTHROPIC_API_KEY` in `.env` file, confirmed working
- [ ] D3 + TopoJSON CDN URLs confirmed loading
- [ ] Mock ImpactSpec JSON created for all three demo scenarios (for offline fallback)
- [ ] Reference `simulator-3.html` open in a browser tab for visual reference during build
- [ ] Devpost submission page open and team registered

---

## 16. Mock ImpactSpec — UK Sugar Tax (for offline testing)

```json
{
  "policy_title": "UK Sugar Tax on Beverages",
  "policy_summary": "The UK imposes a levy on soft drinks containing more than 5g of sugar per 100ml, charged to producers and importers.",
  "policy_type": "tax",
  "confidence": "high",
  "primary_region": { "name": "United Kingdom", "lat": 51.5, "lon": -0.1 },
  "affected_regions": [
    { "name": "United Kingdom", "country_code": "GBR", "lat": 51.5, "lon": -0.1, "impact_score": 85, "impact_direction": "mixed", "impact_summary": "Domestic producers reformulate products; NHS benefits from reduced sugar intake long-term." },
    { "name": "United States", "country_code": "USA", "lat": 37.1, "lon": -95.7, "impact_score": 45, "impact_direction": "negative", "impact_summary": "US beverage exporters face reduced UK market access and reformulation costs." },
    { "name": "Mexico", "country_code": "MEX", "lat": 23.6, "lon": -102.6, "impact_score": 30, "impact_direction": "negative", "impact_summary": "Sugar cane exporters see reduced demand from UK beverage manufacturers." },
    { "name": "Brazil", "country_code": "BRA", "lat": -14.2, "lon": -51.9, "impact_score": 25, "impact_direction": "negative", "impact_summary": "Second-order reduction in sugar export volumes to UK-linked supply chains." },
    { "name": "Ireland", "country_code": "IRL", "lat": 53.1, "lon": -8.2, "impact_score": 40, "impact_direction": "mixed", "impact_summary": "Closely integrated UK food supply chain faces pass-through reformulation costs." },
    { "name": "Australia", "country_code": "AUS", "lat": -25.3, "lon": 133.8, "impact_score": 20, "impact_direction": "positive", "impact_summary": "Stevia and natural sweetener producers see increased export demand." }
  ],
  "trade_routes": [
    { "from_name": "Mexico", "from_lat": 23.6, "from_lon": -102.6, "to_name": "United Kingdom", "to_lat": 51.5, "to_lon": -0.1, "route_type": "disrupted", "commodity": "Raw Sugar", "magnitude": 40 },
    { "from_name": "United States", "from_lat": 37.1, "from_lon": -95.7, "to_name": "United Kingdom", "to_lat": 51.5, "to_lon": -0.1, "route_type": "disrupted", "commodity": "Beverage Exports", "magnitude": 45 },
    { "from_name": "Australia", "from_lat": -25.3, "from_lon": 133.8, "to_name": "United Kingdom", "to_lat": 51.5, "to_lon": -0.1, "route_type": "new", "commodity": "Natural Sweeteners", "magnitude": 30 }
  ],
  "demographics": [
    { "group": "Low-income households", "impact_score": -35, "primary_regions": ["GBR"], "key_effect": "Disproportionate price increase on affordable soft drinks as a share of household income." },
    { "group": "Children and young people", "impact_score": 60, "primary_regions": ["GBR"], "key_effect": "Reduced sugar consumption linked to lower obesity and dental health costs long-term." },
    { "group": "Beverage industry workers", "impact_score": -25, "primary_regions": ["GBR", "USA"], "key_effect": "Reformulation investments may cause short-term job losses in high-sugar product lines." },
    { "group": "NHS and healthcare system", "impact_score": 70, "primary_regions": ["GBR"], "key_effect": "Projected £300M–£500M annual saving in diabetes and obesity treatment over 10 years." },
    { "group": "Stevia/sweetener producers", "impact_score": 55, "primary_regions": ["AUS", "CHN"], "key_effect": "Demand for sugar alternatives rises sharply as manufacturers reformulate." }
  ],
  "timeline": [
    { "period": "0–3 months", "label": "Producers announce reformulation plans; initial price rises in shops", "severity": 40 },
    { "period": "3–12 months", "label": "Peak price impact on consumers; some smaller producers exit market", "severity": 70 },
    { "period": "1–3 years", "label": "Reformulation largely complete; sugar content in beverages falls industry-wide", "severity": 45 },
    { "period": "3–10 years", "label": "Public health benefits materialise; NHS cost savings become measurable", "severity": 20 },
    { "period": "10+ years", "label": "Policy considered success; other countries consider similar legislation", "severity": 10 }
  ],
  "knockon_graph": {
    "nodes": [
      { "id": "trigger", "label": "UK Sugar Tax Introduced", "type": "trigger", "sentiment": "neutral" },
      { "id": "price_rise", "label": "Beverage Prices Rise", "type": "economic", "sentiment": "negative" },
      { "id": "reformulation", "label": "Manufacturers Reformulate", "type": "economic", "sentiment": "neutral" },
      { "id": "sugar_demand", "label": "Sugar Import Demand Falls", "type": "economic", "sentiment": "negative" },
      { "id": "sweetener_demand", "label": "Sweetener Demand Rises", "type": "economic", "sentiment": "positive" },
      { "id": "consumption_drop", "label": "Consumer Sugar Intake Drops", "type": "social", "sentiment": "positive" },
      { "id": "health_benefit", "label": "Obesity/Diabetes Rates Fall", "type": "outcome", "sentiment": "positive" },
      { "id": "nhs_saving", "label": "NHS Cost Savings", "type": "outcome", "sentiment": "positive" },
      { "id": "regressive_impact", "label": "Disproportionate Burden on Low-Income", "type": "social", "sentiment": "negative" },
      { "id": "policy_diffusion", "label": "Other Countries Adopt Similar Laws", "type": "political", "sentiment": "positive" }
    ],
    "edges": [
      { "source": "trigger", "target": "price_rise", "label": "levy passed to consumer", "strength": 0.9 },
      { "source": "trigger", "target": "reformulation", "label": "tax avoidance incentive", "strength": 0.85 },
      { "source": "reformulation", "target": "sugar_demand", "label": "less sugar needed", "strength": 0.7 },
      { "source": "reformulation", "target": "sweetener_demand", "label": "substitution", "strength": 0.65 },
      { "source": "price_rise", "target": "consumption_drop", "label": "price elasticity", "strength": 0.6 },
      { "source": "reformulation", "target": "consumption_drop", "label": "lower sugar content", "strength": 0.75 },
      { "source": "consumption_drop", "target": "health_benefit", "label": "reduced intake over years", "strength": 0.7 },
      { "source": "health_benefit", "target": "nhs_saving", "label": "fewer treatments needed", "strength": 0.8 },
      { "source": "price_rise", "target": "regressive_impact", "label": "% of low income spent on drinks", "strength": 0.65 },
      { "source": "nhs_saving", "target": "policy_diffusion", "label": "evidence base for other govts", "strength": 0.5 }
    ]
  },
  "social_impacts": [
    { "group": "Low-income families", "sentiment": "negative", "headline": "Cheap treats get quietly more expensive", "detail": "Soft drinks represent a higher share of spending for lower-income households. A 20% price rise on a 50p can hits harder proportionally than on a £4 smoothie. The tax is not means-tested and there is no offsetting rebate.", "magnitude": "high" },
    { "group": "Children", "sentiment": "positive", "headline": "Less sugar in the school canteen fridge", "detail": "Manufacturers reformulate flagship products to avoid the levy, meaning the same brands children already consume simply contain less sugar. This requires no behaviour change — the food environment changes around them.", "magnitude": "high" },
    { "group": "Beverage industry workers", "sentiment": "mixed", "headline": "Factory lines shift to lower-sugar production", "detail": "Short-term disruption as production lines are adapted. Some high-sugar specialist products are discontinued. However the overall industry does not shrink — it reformulates, maintaining most employment.", "magnitude": "medium" },
    { "group": "Dentists and GPs", "sentiment": "positive", "headline": "Fewer cavities, fewer referrals over time", "detail": "Sugar is a primary driver of tooth decay and type 2 diabetes. Modelling by PHE suggests a sustained reduction in dental procedures and diabetes prescriptions within a decade, reducing professional workload in these areas.", "magnitude": "medium" }
  ],
  "kpis": {
    "countries_affected": 6,
    "people_affected": "67M directly, 200M+ via trade",
    "gdp_impact_usd": "-$1.2B (short term) / +$4B (10yr health savings)",
    "timeline_to_peak": "3–12 months",
    "reversibility": "moderate"
  },
  "ethical_notes": [
    "This analysis treats manufacturer reformulation as likely based on UK experience post-2018. Actual reformulation pace varies significantly by company size.",
    "The regressive impact on low-income households is real and documented — any pitch of this tool should acknowledge this trade-off rather than presenting the tax as purely beneficial.",
    "Long-term health projections carry significant uncertainty — they depend on sustained dietary behaviour change which is difficult to model."
  ]
}
```
