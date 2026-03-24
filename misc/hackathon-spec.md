# Hackathon Project Spec — Generative Model Sandbox

> **Event:** Anthropic Hackathon @ Imperial College London  
> **Date:** 24 March 2026, 4:00 PM – 8:00 PM  
> **Location:** CAGB 500, Imperial College London  
> **Team:** Robin (ACSE MSc, Imperial) + Claude Code  
> **Build time:** 4 hours  

---

## 1. What this is

A web application that takes a natural language description of any system, phenomenon, or curiosity — from any domain — and generates an interactive, parameterised model/visualisation the user can explore in real time.

The user does not need to know what model is appropriate. The system reasons about the problem, identifies the right mathematical or conceptual framework, extracts and configures parameters, asks clarifying questions when needed, and generates a fully interactive visualisation.

This is not a code generator that blindly outputs simulations from prompts. It is an intelligent model-reasoning system that understands what representation best captures the dynamics of the user's question, then builds it.

### 1.1 Who it serves

- **Curious non-technical people:** "why is the train bellows wavy?" → stress-strain compliance model they can interact with, no jargon required
- **Students:** "show me how option prices change with volatility" → Black-Scholes surface with parameter sliders, builds intuition before the lecture
- **Engineers/researchers:** "quick baseline for heat dissipation in a cylindrical fin" → parameterised model as a starting surrogate, not production-grade but directionally useful

### 1.2 Core principle

The product is the reasoning, not the rendering. The AI must identify the *right* model for a given question — that is the value. The visualisation is the delivery mechanism.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React App (Vite)                  │
│                                                     │
│  ┌───────────┐   ┌──────────────┐   ┌────────────┐ │
│  │  Prompt    │──▶│ Understanding │──▶│ Parameter  │ │
│  │  Input     │   │ Engine       │   │ Resolution │ │
│  │  (user)    │   │ (API call 1) │   │ (optional  │ │
│  └───────────┘   └──────────────┘   │  follow-up) │ │
│                                     └──────┬─────┘ │
│                                            │       │
│                                            ▼       │
│                  ┌──────────────┐   ┌────────────┐ │
│                  │ Visualisation│◀──│ Generation  │ │
│                  │ Container    │   │ Engine      │ │
│                  │ (Plotly /    │   │ (API call 2)│ │
│                  │  Three.js)   │   └────────────┘ │
│                  └──────────────┘                   │
│                         │                           │
│                         ▼                           │
│                  ┌──────────────┐                   │
│                  │ Interactive  │                   │
│                  │ Controls     │                   │
│                  │ (generated   │                   │
│                  │  sliders,    │                   │
│                  │  toggles)    │                   │
│                  └──────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### 2.1 The two-call pipeline

**Call 1 — Understanding Engine (the brain)**
- Input: raw user prompt
- Output: structured JSON describing the model, domain, parameters, reasoning
- Purpose: semantic extraction, model identification, parameter mapping, ambiguity detection

**Call 2 — Generation Engine (the hands)**
- Input: structured JSON from Call 1 (with any user-provided parameter values)
- Output: self-contained JavaScript code that renders an interactive visualisation
- Purpose: produce eval-able, parameterised Plotly.js / Three.js code

**Optional — Error Recovery**
- If generated code fails to execute, send error + code back to Claude for a fix attempt
- Maximum 2 retries before graceful fallback to model description display

---

## 3. System prompts

These are the core intellectual property of the product. They should be treated with the same care as source code.

### 3.1 Understanding Engine system prompt

```
You are the Understanding Engine of a generative model sandbox. Your job is to take a user's natural language description of any system, phenomenon, question, or curiosity and determine the best mathematical or conceptual model to represent it interactively.

You must reason carefully about what the user is actually asking. Many prompts will be informal, imprecise, or from non-technical users. Extract high-signal words and phrases to identify:
1. The domain (physics, finance, biology, game mechanics, manufacturing, economics, etc.)
2. The core relationships or dynamics the user is curious about
3. What type of model best captures those dynamics

IMPORTANT BEHAVIOURS:
- If the question maps to a known model (e.g. Black-Scholes, Lotka-Volterra, SIR, heat equation), name it and explain in one sentence why it's appropriate.
- If the question does NOT map to a standard model, reason about the underlying relationships and propose a custom model structure. Describe what variables interact and how.
- If the prompt is ambiguous, generate exactly ONE high-signal follow-up question that maximally reduces uncertainty. The question should act as a filter — it should disambiguate between two or more plausible model interpretations.
- Never ask more than one follow-up question at a time.
- Always propose a model even if you need follow-up — mark it as "provisional" so the user sees your thinking.

SIGNAL EXTRACTION PROCESS:
1. Identify high-signal tokens (nouns: "minions", "kills", "water bottle"; verbs: "shaped", "connecting"; adjectives: "wavy")
2. Map tokens to potential variables, relationships, and domains
3. Hypothesise 1-3 candidate model types
4. Select the best candidate and justify in one sentence
5. Define parameters with sensible defaults where possible
6. Flag parameters that require user input (no sensible default exists)

OUTPUT FORMAT — respond with ONLY this JSON, no markdown fences, no preamble:
{
  "status": "ready" | "needs_clarification",
  "extracted_signals": ["list", "of", "high-signal", "tokens"],
  "domain": "string — the identified domain",
  "reasoning": "2-3 sentences explaining why this model was chosen, written for the user to read",
  "model": {
    "name": "string — formal name if known, descriptive name if custom",
    "type": "string — e.g. ODE system, statistical regression, surface plot, geometric, stochastic process, agent-based, etc.",
    "description": "1-2 sentences describing what the model captures, written accessibly",
    "equations_or_logic": "brief mathematical or logical description of the model structure — LaTeX-style notation is fine"
  },
  "parameters": [
    {
      "name": "string — human-readable parameter name",
      "symbol": "string — mathematical symbol if applicable",
      "default": number | null,
      "min": number | null,
      "max": number | null,
      "unit": "string | null",
      "description": "string — what this parameter controls, one sentence",
      "user_must_provide": boolean
    }
  ],
  "visualisation": {
    "recommended_type": "2d_plot" | "3d_surface" | "3d_geometry" | "animation" | "phase_portrait" | "heatmap" | "scatter" | "network" | "custom",
    "axes": {
      "x": "string — what the x-axis represents",
      "y": "string — what the y-axis represents",
      "z": "string | null — what the z-axis represents, if 3D"
    },
    "interactive_elements": ["list of suggested interactive controls — sliders, toggles, draggable points, etc."]
  },
  "follow_up_question": "string | null — exactly one clarifying question if status is needs_clarification"
}
```

### 3.2 Generation Engine system prompt

```
You are the Generation Engine of a generative model sandbox. You receive a structured model specification (JSON) and produce self-contained JavaScript code that renders an interactive visualisation.

CRITICAL REQUIREMENTS:
1. Output ONLY executable JavaScript code. No markdown fences. No explanations. No comments except inline where essential for parameter labelling.
2. The code must be a single self-contained function that takes a DOM container ID as its argument.
3. Use Plotly.js for all 2D plots, 3D surfaces, scatter plots, heatmaps, animations, and phase portraits.
4. Use Three.js ONLY when the visualisation requires custom 3D geometry (e.g. manufacturing shapes, mechanical components, spatial structures). For mathematical 3D surfaces, prefer Plotly.
5. All parameters from the specification must be exposed as interactive Plotly sliders (using Plotly's updatemenus/sliders) or as HTML range inputs positioned below the plot.
6. The visualisation must update in real-time when parameters change — NO additional API calls for parameter tweaks.
7. The function must be safely eval-able. Do not use import statements — Plotly and Three are available as globals (window.Plotly, window.THREE).
8. Handle edge cases: division by zero, NaN propagation, parameter ranges that would break the model.
9. Use clear, descriptive axis labels and a title that reflects the model name.
10. For animations, use requestAnimationFrame with a play/pause toggle.

OUTPUT FORMAT:
(function(containerId) {
  // ... all code here
  // Plotly.newPlot(containerId, data, layout, config);
  // Parameter controls appended to container or as Plotly sliders
})

STYLE GUIDELINES:
- Use a clean, modern colour palette. Prefer viridis, plasma, or custom palettes over default Plotly colours.
- 3D surfaces should have good default camera angles that show the interesting features.
- Include hover tooltips showing parameter values at each point.
- Responsive sizing: use the container's width, not hardcoded pixel values.
- For 2D plots with time evolution, default to showing the solution and providing a time slider.

MATHEMATICAL ACCURACY:
- Use appropriate numerical methods. For ODEs, implement RK4 (do not use forward Euler for anything beyond illustrative purposes).
- For PDEs, use method of lines or finite differences with appropriate stability conditions.
- For stochastic models, use proper random number generation and show ensemble averages where appropriate.
- Parameter defaults from the specification should produce a visually interesting and physically meaningful result.
```

### 3.3 Error Recovery prompt

```
The following JavaScript code was generated to render an interactive visualisation but threw an error when executed. Fix the code so it runs correctly. Return ONLY the fixed code, same format as before — a self-contained function taking a containerId argument.

ERROR MESSAGE:
{error_message}

ORIGINAL CODE:
{original_code}
```

---

## 4. Tech stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Vite + React 18 | Fast HMR, minimal config, instant scaffold |
| Rendering (primary) | Plotly.js (CDN) | 2D, 3D surfaces, animations, built-in sliders, hover |
| Rendering (geometric) | Three.js (CDN) | Only for spatial/geometric models, loaded conditionally |
| AI | Anthropic API (direct client-side calls) | Claude Sonnet 4 for speed; no backend needed at hackathon |
| Styling | Tailwind CSS | Rapid UI development, utility-first |
| State | React useState/useReducer | No external state library needed for MVP |
| Deployment | localhost / Vercel (if time permits) | Demo runs locally; Vercel deploy is a nice-to-have |

### 4.1 CDN dependencies (loaded in index.html)

```html
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

### 4.2 API configuration

```javascript
const ANTHROPIC_CONFIG = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  // api key provided via environment variable or hackathon credits
};
```

Note: at the hackathon, API keys will likely be provided as credits. The key is injected at runtime, never hardcoded.

---

## 5. Component structure

```
src/
├── App.jsx                    # root layout, state orchestration
├── components/
│   ├── PromptInput.jsx        # main search/prompt bar
│   ├── ThinkingStream.jsx     # displays understanding engine output as it streams
│   ├── ParameterForm.jsx      # follow-up questions and missing parameter inputs
│   ├── ModelCard.jsx          # displays model name, description, reasoning
│   ├── VisualisationContainer.jsx  # renders generated code into a div
│   ├── ControlPanel.jsx       # parameter sliders (fallback if not in Plotly)
│   ├── ErrorState.jsx         # graceful error display with retry option
│   └── Header.jsx             # minimal branding, tagline
├── services/
│   ├── anthropic.js           # API call wrapper with streaming support
│   ├── codeExecutor.js        # safe eval of generated code with error catching
│   └── modelParser.js         # JSON parsing and validation of understanding output
├── prompts/
│   ├── understanding.js       # understanding engine system prompt (exported as string)
│   ├── generation.js          # generation engine system prompt (exported as string)
│   └── recovery.js            # error recovery prompt template
├── styles/
│   └── globals.css            # tailwind base + custom theme variables
└── main.jsx                   # vite entry point
```

---

## 6. UI/UX design principles

### 6.1 Philosophy

The interface must communicate two things simultaneously:
1. **Accessibility:** "anyone can use this, just type what you're curious about"
2. **Depth:** "this is doing something genuinely intelligent under the hood"

The balance is achieved through progressive disclosure. The entry point is as simple as a search bar. Complexity reveals itself naturally as the pipeline progresses.

### 6.2 Layout

```
┌─────────────────────────────────────────────┐
│  [minimal header — product name + tagline]  │
├─────────────────────────────────────────────┤
│                                             │
│     ┌─────────────────────────────────┐     │
│     │  What are you curious about?    │     │
│     │  [_______________________________]│     │
│     └─────────────────────────────────┘     │
│                                             │
│  ┌──────────────────┐ ┌──────────────────┐  │
│  │  MODEL CARD       │ │  VISUALISATION   │  │
│  │                   │ │                  │  │
│  │  name             │ │  [plotly/three   │  │
│  │  description      │ │   renders here]  │  │
│  │  reasoning        │ │                  │  │
│  │  domain           │ │                  │  │
│  │                   │ │                  │  │
│  │  PARAMETERS       │ │                  │  │
│  │  [slider] param1  │ │                  │  │
│  │  [slider] param2  │ │                  │  │
│  │  [slider] param3  │ │                  │  │
│  └──────────────────┘ └──────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

On smaller screens, stack vertically: prompt → model card → visualisation.

### 6.3 The "thinking" experience

When the understanding engine is processing, the UI streams the response in real-time. The user sees:
- Extracted signals appearing as tags/chips
- The domain being identified
- The model being proposed
- Parameters populating

This transforms a wait into the most impressive part of the demo. The audience watches the system think.

### 6.4 Visual identity

- **Colour palette:** dark background (not pure black — something like slate-900 or zinc-900), with bright accent colours for interactive elements. The visualisations should be the visual focal point, not the UI chrome.
- **Typography:** clean sans-serif. One weight for headings, one for body. Nothing decorative — the content (the models) is decorative enough.
- **Tone:** confident but not academic. Copy should be direct. "What are you curious about?" not "Enter your simulation parameters."
- **Micro-interactions:** smooth transitions between states (prompt → thinking → model card → visualisation). No jarring page changes. Everything animates in-place.

### 6.5 State machine

```
IDLE → THINKING → [NEEDS_CLARIFICATION → THINKING →] GENERATING → VISUALISING → INTERACTIVE
                                                                                     │
                                                                          (new prompt)│
                                                                                     ▼
                                                                                   IDLE
```

Each state has a distinct visual treatment. The user always knows where they are in the pipeline.

---

## 7. Implementation stages (time-boxed)

These stages are ordered for the 4-hour hackathon window. Each stage produces a working increment.

### Stage 1 — Scaffold and API wiring (45 min)

**Goal:** Vite + React app running, API calls working, basic prompt → JSON → console.log pipeline.

Tasks:
1. `npm create vite@latest` with React template
2. Install tailwind, configure
3. Load Plotly.js and Three.js via CDN in index.html
4. Create `anthropic.js` service with streaming support
5. Create `PromptInput` component — a styled input bar with submit
6. Wire up understanding engine: user submits prompt → API call → structured JSON logged to console
7. Verify the understanding engine returns well-formed JSON for 3 test prompts

**Exit criterion:** type a prompt, see structured model JSON in console.

### Stage 2 — Understanding display and parameter resolution (45 min)

**Goal:** the "thinking" stream is visible, model card displays, follow-up questions work.

Tasks:
1. Build `ThinkingStream` component — shows streamed tokens from understanding call
2. Build `ModelCard` component — displays model name, description, reasoning, domain tag
3. Build `ParameterForm` component — for follow-up questions and missing parameters
4. Implement the clarification loop: if status is "needs_clarification", show follow-up question, user responds, re-run understanding with appended context
5. Display extracted signals as visual chips/tags

**Exit criterion:** prompt → watch thinking stream → see model card → answer follow-up if needed → see updated model card with all parameters resolved.

### Stage 3 — Code generation and execution (60 min)

**Goal:** the generation engine produces code, the code executes and renders a visualisation.

Tasks:
1. Build `VisualisationContainer` component — a div that receives and executes generated code
2. Build `codeExecutor.js` — wraps generated code in try/catch, injects container ID, evals safely
3. Wire up generation engine: take resolved model JSON → API call 2 → receive code → execute
4. Implement error recovery loop: if eval fails, send error back to Claude, retry (max 2)
5. Build `ErrorState` component for graceful failure display
6. Test with 3 different prompts across domains

**Exit criterion:** full pipeline works end-to-end. Prompt → thinking → model card → interactive visualisation with working parameter controls.

### Stage 4 — Polish and demo prep (60 min)

**Goal:** the product looks and feels good. Demo examples are rehearsed.

Tasks:
1. Apply visual design: dark theme, colour palette, typography, spacing
2. Smooth state transitions (fade/slide animations between pipeline states)
3. Add loading states with appropriate micro-copy
4. Ensure responsive layout (model card + visualisation side by side on wide screens)
5. Add "New prompt" button to reset to IDLE state
6. Test and rehearse 4 demo examples (see section 9)
7. Fix any visual bugs or layout issues

**Exit criterion:** product is demo-ready. All 4 rehearsed examples work reliably.

### Stage 5 — Stretch goals (if time remains, ~30 min)

Only attempt these after stages 1-4 are complete and solid:
- **Share link:** encode the model JSON as a URL parameter so generated models can be shared
- **Example prompts:** display 3-4 clickable example prompts on the IDLE screen to guide first-time users
- **Model history:** store generated models in local component state so users can flip between previous generations in the current session
- **Pitch slide:** a single-page summary (can be a static route in the app) showing the problem, solution, differentiator, and future vision

---

## 8. Key implementation details

### 8.1 Streaming the understanding call

Use the Anthropic streaming API so the user sees the thinking happen in real-time:

```javascript
// in anthropic.js
export async function streamUnderstanding(userPrompt, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      stream: true,
      system: UNDERSTANDING_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // parse SSE events, extract text deltas
    // call onChunk(delta) for each text fragment
    fullText += delta;
  }

  return JSON.parse(fullText);
}
```

### 8.2 Safe code execution

```javascript
// in codeExecutor.js
export function executeGeneratedCode(code, containerId) {
  try {
    // clear previous visualisation
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    // wrap and execute
    const fn = new Function("containerId", `
      "use strict";
      return (${code})(containerId);
    `);
    fn(containerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code };
  }
}
```

### 8.3 Follow-up question handling

When the understanding engine returns `status: "needs_clarification"`, the UI:
1. Displays the provisional model card (greyed out slightly to indicate it's tentative)
2. Shows the follow-up question prominently
3. User types their answer
4. The system re-calls the understanding engine with the original prompt + the follow-up answer appended as context:

```javascript
const augmentedPrompt = `Original question: "${originalPrompt}"
Follow-up answer: "${userAnswer}"

Based on this clarification, refine the model specification.`;
```

### 8.4 Parameter sliders in generated code

The generation engine is instructed to embed Plotly sliders directly in the layout configuration. This keeps everything self-contained:

```javascript
// example of what the generation engine should produce
layout.sliders = [{
  active: 5,
  steps: values.map(v => ({
    method: "restyle",
    args: [/* updated data based on parameter value */],
    label: v.toString()
  })),
  currentvalue: { prefix: "Volatility (σ): " },
  pad: { t: 50 }
}];
```

For parameters that require recomputing the entire model (e.g. changing an ODE coefficient), the generated code should define a `recompute()` function called by slider onChange events.

---

## 9. Demo script

Four examples, ordered from simple to impressive. Each demonstrates a different domain and capability.

### Demo 1 — The warm-up (2D, fast, guaranteed)
**Prompt:** "How does compound interest grow over 30 years compared to simple interest?"
- **Expected model:** exponential vs linear growth comparison
- **Why first:** simple, universally understood, visually clear. Establishes the pipeline.
- **Interactive elements:** rate slider, principal slider, time range

### Demo 2 — The financial showcase (3D surface)
**Prompt:** "Show me how option prices change with volatility and time to expiry"
- **Expected model:** Black-Scholes surface
- **Why second:** domain-specific, visually striking 3D surface, demonstrates depth
- **Interactive elements:** strike price slider, risk-free rate, rotatable 3D view

### Demo 3 — The non-obvious reasoning demo (model identification)
**Prompt:** "Why do the bendy connecting bits between train carriages have to be wavy shaped?"
- **Expected model:** stress-strain compliance / bellows mechanics
- **Why third:** demonstrates the semantic extraction pipeline. The system has to reason from informal language to a materials science model. This is the "wow, it understood that?" moment.
- **Interactive elements:** number of corrugations, material stiffness, displacement range

### Demo 4 — The wildcard (live from audience)
**Prompt:** whatever a judge types in
- **Why last:** proves it's not canned. The system either handles it or asks a good follow-up question. Either way, it demonstrates genuine intelligence.

### Demo timing
- Demos 1-3: ~2 minutes each (including watching the thinking stream)
- Demo 4: ~2-3 minutes
- Total demo: ~9-10 minutes
- Leave ~5 minutes for Q&A / judge questions

---

## 10. Pitch structure (90 seconds)

**Problem (15s):**
"Building intuition about how systems work is hard. Formal tools like MATLAB and COMSOL are powerful but inaccessible. Asking an AI chatbot gets you a text explanation, not something you can interact with."

**Solution (20s):**
"We built a system where you describe what you're curious about in plain language, and it reasons about what model best represents your question, then generates a fully interactive visualisation you can explore. No domain knowledge required."

**Differentiator (15s):**
"This is not a template library — we didn't hard-code a single model. Every visualisation is generated from scratch by Claude reasoning about your specific question. The AI doesn't just write code — it decides what to build."

**Demo (30s):**
Quick flash of 2-3 pre-generated examples showing domain breadth.

**Vision (10s):**
"Every model our users generate becomes a community asset. Over time, this becomes the platform where models live — searchable, forkable, explorable. PhET has 125 hand-built simulations from 22 years. We generate infinite."

---

## 11. Risk mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Generated code doesn't execute | Medium | Error recovery loop (2 retries). Graceful fallback to model description. |
| Understanding engine returns malformed JSON | Low | Strict JSON parsing with fallback regex extraction. Retry once. |
| API latency too high for demo | Medium | Pre-generate demo examples 1-3 before the pitch. Have cached responses ready. |
| 3D visualisations are unstable | Medium | Bias system prompt toward Plotly for everything. Reserve Three.js only for geometric cases. |
| Judge's live prompt produces nonsense | Low-Medium | The follow-up question mechanism buys time and demonstrates intelligence even if the model itself is imperfect. |
| API key / credits run out | Low | Monitor usage. Understanding calls are ~500 tokens in, ~800 out. Generation calls are ~800 in, ~2000 out. Budget for ~50 full generations. |

---

## 12. Pre-work checklist (before 24 March)

These are preparation tasks, not "building the project." Same as any team reviewing their tools and plan before a hackathon.

- [ ] Scaffold Vite + React project, verify it runs
- [ ] Verify Anthropic API access with provided hackathon credits
- [ ] Finalise and test both system prompts against 5+ diverse prompts via Claude.ai
- [ ] Test Plotly.js CDN loading and basic plot rendering
- [ ] Rehearse demo script mentally — know what each prompt will produce
- [ ] Prepare a single-page pitch outline (can be handwritten or in notes)
- [ ] Charge laptop, bring charger, check CAGB 500 has power outlets

---

## 13. Future vision (for pitch, not for MVP)

The hackathon MVP is the generative core. But the product vision is a platform:

- **Community library:** every generated model is saved with metadata, searchable, forkable
- **Model adaptation:** when a new prompt is similar to an existing model, retrieve and adapt parameters client-side (zero API cost)
- **Institutional licensing:** university departments and corporate L&D teams pay per-seat for unlimited generation
- **Model versioning:** users can iterate on generated models, improving accuracy over time
- **Collaborative exploration:** share a model link, explore together in real-time
- **Domain-specific modes:** "finance mode", "biology mode", "engineering mode" that adjust the understanding engine's priors

The cold start requires API calls. The mature platform serves 80%+ of queries from cached community models with zero marginal cost. This is the economic moat — every user makes the platform better and cheaper.

---

## 14. Autonomous build instructions (for Claude Code)

If this spec is handed to Claude Code for implementation, the following instructions apply:

1. Read the entire spec before writing any code.
2. Follow the implementation stages in order. Do not skip ahead.
3. After each stage, verify the exit criterion is met before proceeding.
4. The system prompts in section 3 are exact — do not paraphrase or abbreviate them.
5. Use Tailwind utility classes for all styling. No separate CSS files except globals.css for base configuration.
6. All components should be functional components with hooks. No class components.
7. The API key should be read from an environment variable (VITE_ANTHROPIC_API_KEY).
8. Test the full pipeline with the prompt "how does compound interest grow over 30 years" before moving to Stage 4.
9. The visualisation container must have a unique, stable DOM ID that persists across re-renders.
10. Do not install any npm packages beyond what Vite + React + Tailwind provide. Plotly and Three.js are CDN-loaded globals.
