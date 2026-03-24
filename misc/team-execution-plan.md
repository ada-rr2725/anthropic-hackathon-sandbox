# Team Execution Plan — Hackathon Day

> 3 people, 4 hours, 1 product.

---

## Team roles

| Person | Owns | Files they touch | Does NOT touch |
|--------|------|-------------------|----------------|
| **Robin** (lead) | API layer, system prompts, state orchestration, App.jsx, integration | `services/`, `prompts/`, `App.jsx` | `components/` internals |
| **Person B** (frontend) | All UI components, layout, styling, animations | `components/`, `styles/`, `index.html` (Tailwind config) | `services/`, `prompts/` |
| **Person C** (executor) | Code execution, visualisation rendering, error recovery | `services/codeExecutor.js`, `components/VisualisationContainer.jsx`, `components/ErrorState.jsx` | `prompts/`, other `components/` |

---

## Data contracts (agree on these BEFORE coding)

These are the interfaces that allow all three workstreams to develop independently. Each person builds to these contracts and integration just works.

### Contract 1: Understanding Engine output

This is what `App.jsx` passes to ModelCard and ParameterForm:

```typescript
interface UnderstandingResult {
  status: "ready" | "needs_clarification";
  extracted_signals: string[];
  domain: string;
  reasoning: string;
  model: {
    name: string;
    type: string;
    description: string;
    equations_or_logic: string;
  };
  parameters: Array<{
    name: string;
    symbol: string;
    default: number | null;
    min: number | null;
    max: number | null;
    unit: string | null;
    description: string;
    user_must_provide: boolean;
  }>;
  visualisation: {
    recommended_type: string;
    axes: { x: string; y: string; z: string | null };
    interactive_elements: string[];
  };
  follow_up_question: string | null;
}
```

### Contract 2: Generation Engine output

This is a raw string of JavaScript code. The executor receives it as-is:

```typescript
type GeneratedCode = string;
// Shape: "(function(containerId) { ... Plotly.newPlot(...) ... })"
```

### Contract 3: App state

```typescript
type AppState =
  | { phase: "idle" }
  | { phase: "thinking"; streamedText: string }
  | { phase: "needs_clarification"; model: UnderstandingResult; question: string }
  | { phase: "generating"; model: UnderstandingResult }
  | { phase: "visualising"; model: UnderstandingResult; code: string }
  | { phase: "error"; model: UnderstandingResult | null; errorMessage: string }
```

### Mock data for Person B

Person B should develop all UI components using this mock data:

```javascript
export const MOCK_UNDERSTANDING = {
  status: "ready",
  extracted_signals: ["compound interest", "growth", "30 years", "simple interest"],
  domain: "Finance / Mathematics",
  reasoning: "This is a comparison between exponential growth (compound interest) and linear growth (simple interest). The compound interest formula A = P(1+r)^t produces exponential growth, while simple interest A = P(1+rt) produces linear growth. Comparing them visually over a 30-year horizon clearly illustrates the power of compounding.",
  model: {
    name: "Compound vs Simple Interest Growth",
    type: "Analytical comparison",
    description: "Side-by-side growth curves showing how compound interest accelerates ahead of simple interest over time.",
    equations_or_logic: "Compound: A = P(1 + r/n)^{nt}, Simple: A = P(1 + rt)"
  },
  parameters: [
    { name: "Principal", symbol: "P", default: 1000, min: 100, max: 100000, unit: "£", description: "Initial investment amount", user_must_provide: false },
    { name: "Annual rate", symbol: "r", default: 0.07, min: 0.01, max: 0.20, unit: null, description: "Annual interest rate as a decimal", user_must_provide: false },
    { name: "Compounding frequency", symbol: "n", default: 12, min: 1, max: 365, unit: "times/year", description: "How often interest is compounded per year", user_must_provide: false },
    { name: "Time horizon", symbol: "t", default: 30, min: 1, max: 50, unit: "years", description: "Number of years to project", user_must_provide: false }
  ],
  visualisation: {
    recommended_type: "2d_plot",
    axes: { x: "Time (years)", y: "Balance (£)", z: null },
    interactive_elements: ["rate slider", "principal slider", "time horizon slider"]
  },
  follow_up_question: null
};

export const MOCK_CLARIFICATION = {
  status: "needs_clarification",
  extracted_signals: ["minions", "kills", "League of Legends"],
  domain: "Game mechanics / Statistics",
  reasoning: "This appears to be about the relationship between farming (killing minions for gold) and combat effectiveness (getting kills) in League of Legends. There are multiple possible models depending on the exact relationship of interest.",
  model: {
    name: "Gold-to-Combat-Effectiveness Regression (provisional)",
    type: "Statistical regression with game-theoretic thresholds",
    description: "A model showing how gold income from minion farming correlates with kill potential, accounting for item breakpoints and power spikes.",
    equations_or_logic: "kill_probability ~ sigmoid(gold_advantage / threshold)"
  },
  parameters: [
    { name: "Gold per minion", symbol: null, default: 21, min: 14, max: 90, unit: "gold", description: "Average gold earned per minion kill", user_must_provide: false },
    { name: "Item breakpoint cost", symbol: null, default: 3000, min: 1000, max: 6000, unit: "gold", description: "Gold cost at which a major power spike occurs", user_must_provide: false }
  ],
  visualisation: {
    recommended_type: "2d_plot",
    axes: { x: "Minions killed (CS)", y: "Estimated kill probability", z: null },
    interactive_elements: ["gold per minion slider", "item breakpoint slider"]
  },
  follow_up_question: "Are you interested in how farming affects your chances in a single game over time, or the statistical trend across many games — like whether players with higher CS averages tend to get more kills overall?"
};
```

### Mock code for Person C

Person C should develop the executor using this hardcoded test code:

```javascript
export const MOCK_GENERATED_CODE = `(function(containerId) {
  var P = 1000, r = 0.07, n = 12, tMax = 30;
  var years = [];
  var compound = [];
  var simple = [];
  for (var t = 0; t <= tMax; t += 0.5) {
    years.push(t);
    compound.push(P * Math.pow(1 + r/n, n*t));
    simple.push(P * (1 + r*t));
  }
  var trace1 = { x: years, y: compound, name: "Compound Interest", type: "scatter", line: { color: "#6366f1", width: 3 } };
  var trace2 = { x: years, y: simple, name: "Simple Interest", type: "scatter", line: { color: "#f59e0b", width: 3, dash: "dash" } };
  var layout = {
    title: "Compound vs Simple Interest",
    xaxis: { title: "Time (years)" },
    yaxis: { title: "Balance (£)" },
    template: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#e2e8f0" },
    sliders: [{
      active: 6,
      steps: [0.01,0.03,0.05,0.07,0.10,0.15,0.20].map(function(rate) {
        var c = [], s = [];
        for (var t = 0; t <= tMax; t += 0.5) {
          c.push(P * Math.pow(1 + rate/n, n*t));
          s.push(P * (1 + rate*t));
        }
        return { method: "restyle", args: [{ y: [c, s] }], label: (rate*100).toFixed(0) + "%" };
      }),
      currentvalue: { prefix: "Rate: " },
      pad: { t: 50 }
    }]
  };
  Plotly.newPlot(containerId, [trace1, trace2], layout, { responsive: true });
})`;
```

---

## Hour-by-hour plan

### Hour 1 (4:00 – 5:00) — Parallel setup + core build

**All three** (first 10 min):
- Clone repo, verify scaffold runs (`npm run dev`)
- Confirm Plotly loads (open console, type `window.Plotly` — should be an object)
- Confirm API key works (Robin tests a quick fetch)
- Review data contracts above together. Everyone agrees on the interfaces.

**Robin (remaining 50 min):**
- Implement `src/prompts/understanding.js` and `src/prompts/generation.js` (copy from spec)
- Implement `src/services/anthropic.js` — streaming fetch for understanding engine, standard fetch for generation engine
- Implement `src/services/modelParser.js` — JSON.parse with fallback error handling
- Test: submit a prompt via console, get structured JSON back
- **Claude Code prompt to start:**

```
Read CLAUDE.md and hackathon-spec.md. Implement Stage 1: the API service layer.

Create src/prompts/understanding.js and src/prompts/generation.js — export the system prompts as string constants. Copy them exactly from hackathon-spec.md section 3.

Create src/services/anthropic.js with two exported functions:
1. streamUnderstanding(userPrompt, onChunk) — uses streaming API, calls onChunk with each text delta, returns parsed JSON when complete
2. callGeneration(modelSpec) — standard (non-streaming) API call, returns the generated code as a string

Create src/services/modelParser.js with a parseUnderstandingResponse(text) function that safely parses JSON from the API response, handling edge cases like markdown fences around JSON.

API key comes from import.meta.env.VITE_ANTHROPIC_API_KEY. Model is claude-sonnet-4-20250514. Max tokens 2048 for understanding, 4096 for generation.

Do not build any UI components yet. After implementation, show me how to test it from the browser console.
```

**Person B (remaining 50 min):**
- Import mock data (from above)
- Build `Header.jsx` — product name placeholder + one-line tagline
- Build `PromptInput.jsx` — centred search bar, placeholder text "What are you curious about?", submit on Enter
- Build `ThinkingStream.jsx` — receives `streamedText` as prop, renders it character by character with a subtle animation
- Build `ModelCard.jsx` — receives `UnderstandingResult`, displays model name, domain tag, description, reasoning, parameter list
- Build `ParameterForm.jsx` — receives follow-up question, renders it with a text input for the user's answer
- All components use mock data. No API calls.
- **Claude Code prompt:**

```
Read CLAUDE.md and hackathon-spec.md (especially sections 5 and 6 for component structure and UI design).

Build the following React components using Tailwind CSS. Use the mock data I'll paste below for development — no API calls yet. Each component should render correctly in isolation.

Design system:
- Dark background: bg-slate-950 or bg-zinc-950
- Text: text-slate-200 for body, text-white for headings
- Accent: indigo-500 for interactive elements
- Cards: bg-slate-900/50 with subtle border border-slate-800
- Typography: use the system sans-serif stack, clean and minimal
- Smooth transitions between states

Components to build:
1. Header.jsx — minimal. Product name as text (use "[name TBD]" as placeholder), tagline below it.
2. PromptInput.jsx — large centred input bar. Placeholder: "What are you curious about?". Submit on Enter key press. Props: onSubmit(text), disabled (boolean).
3. ThinkingStream.jsx — displays streaming text. Props: text (string), isComplete (boolean). Show a subtle blinking cursor while incomplete.
4. ModelCard.jsx — displays model info. Props: model (UnderstandingResult object). Show: model name as heading, domain as a small tag/chip, description, reasoning in slightly muted text, parameters as a clean list with names, defaults, and units.
5. ParameterForm.jsx — for follow-up questions. Props: question (string), onSubmit(answer). Render the question prominently with a text input below it.

[PASTE MOCK DATA HERE]

Build all components, then update App.jsx to show them in a layout matching section 6.2 of the spec. Use a hardcoded state to show the ModelCard and a mock ThinkingStream so I can see the visual design.
```

**Person C (remaining 50 min):**
- Build `src/services/codeExecutor.js` — the safe eval wrapper
- Build `VisualisationContainer.jsx` — a React component with a ref-based div that the executor renders into
- Build `ErrorState.jsx` — displays error message with "Retry" button
- Test with mock generated code (from above) — verify Plotly renders in the container
- Test with deliberately broken code — verify error is caught gracefully
- **Claude Code prompt:**

```
Read CLAUDE.md and hackathon-spec.md (especially sections 8.2 and 5).

Build the code execution system:

1. src/services/codeExecutor.js
   - Export function executeGeneratedCode(codeString, containerId)
   - Clear the container's innerHTML first
   - Use new Function() to safely eval the code string
   - The code string will be in the format: "(function(containerId) { ... })"
   - Wrap in try/catch. Return { success: true } or { success: false, error: errorMessage, code: codeString }
   - Handle edge cases: null code, empty string, code that takes too long (add a 10-second timeout)

2. src/components/VisualisationContainer.jsx
   - Uses a React ref to maintain a stable DOM element
   - The container div must have id "model-viz-container"
   - Accepts props: code (string | null), onError(errorInfo)
   - When code prop changes and is non-null, call executeGeneratedCode
   - If execution fails, call onError with the error info
   - Container should fill available width, min-height 400px, bg-slate-900 rounded

3. src/components/ErrorState.jsx
   - Props: errorMessage (string), onRetry (function)
   - Clean error display with a "Try again" button

Test the executor by hardcoding this mock generated code and verifying Plotly renders:
[PASTE MOCK_GENERATED_CODE HERE]

Then test with this deliberately broken code to verify error handling:
"(function(containerId) { undefinedVariable.method(); })"
```

---

### Hour 2 (5:00 – 6:00) — Integration + pipeline completion

**All three** (first 15 min):
- Person B and Person C push their branches
- Robin merges all three branches into main
- Fix any merge conflicts (should be minimal given file separation)
- Verify everything renders together

**Robin (remaining 45 min):**
- Wire `App.jsx` state machine: connect PromptInput → API call → ThinkingStream → ModelCard → Generation → VisualisationContainer
- Implement the clarification loop (follow-up question → re-call understanding)
- Implement error recovery: if code execution fails, call recovery prompt, retry up to 2x
- **Test the full pipeline end-to-end with:** "how does compound interest grow over 30 years"

**Person B (remaining 45 min):**
- Build state-dependent layout in `App.jsx` (work with Robin on this)
- Add transitions between states (idle → thinking → model card → visualisation)
- Style the parameter sliders that appear alongside the visualisation
- Add "New prompt" button to reset to idle
- Mobile/responsive adjustments

**Person C (remaining 45 min):**
- Integrate real API-generated code (Robin's pipeline now produces real code strings)
- Test with 3-4 diverse prompts, note which ones break
- Tune the executor: handle common failure patterns (missing semicolons, undefined Plotly references, etc.)
- Implement the retry mechanism: if execution fails, format error + code → Robin's recovery API call → re-execute

---

### Hour 3 (6:00 – 7:00) — Testing, fixing, polishing

**Robin:**
- Run all 4 demo prompts end-to-end. Fix any prompt engineering issues.
- Tune the understanding engine: if model identification is weak for any demo, adjust the system prompt
- If demo prompt 3 (train bellows) doesn't work well, swap it for a safer alternative
- Pre-cache responses: if API latency is too high, save successful responses as JSON files that can be loaded as fallbacks

**Person B:**
- Final visual polish: spacing, colour consistency, font sizing
- Ensure the thinking stream animation looks smooth
- Add subtle visual cues for each state transition
- Add example prompt chips on the idle screen (clickable suggestions)

**Person C:**
- Stress-test with unusual prompts: very long prompts, very short prompts, non-English, emoji
- Verify the error state looks correct and the retry flow works
- Ensure the visualisation container resizes correctly when the window changes

---

### Hour 4 (7:00 – 8:00) — Demo prep + submission

**First 30 min — rehearse:**
- Run through the full demo script (spec section 9) with timing
- Robin presents, Person B manages the laptop, Person C takes notes on any issues
- If anything breaks, decide: fix it or replace that demo prompt
- Prepare a mental "if it fails" plan for the live wildcard demo

**Last 30 min — present/submit:**
- Present to judges
- Submit to Devpost or whatever platform is used
- Celebrate regardless of outcome

---

## Git workflow

### Before hackathon
```bash
# Robin creates the repo and scaffold
mkdir project-name && cd project-name
npm create vite@latest . -- --template react
npm install -D tailwindcss @tailwindcss/vite
# set up tailwind, add CDN scripts to index.html
# copy in CLAUDE.md and hackathon-spec.md
git init && git add -A && git commit -m "scaffold"
# push to github, add teammates as collaborators
```

### During hackathon
```bash
# each person at start:
git clone <repo-url>
git checkout -b <name>/<workstream>
npm install && npm run dev

# when ready to integrate (end of hour 1):
git add -A && git commit -m "describe what you built"
git push origin <branch>

# Robin merges:
git checkout main
git merge robin/api-prompts
git merge personB/ui-components
git merge personC/executor
# resolve any conflicts
git push origin main

# everyone pulls:
git checkout main && git pull
```

After the first integration, everyone works on main with frequent small commits. The risk of conflicts drops because you're now editing different parts of connected files rather than entirely separate files.

---

## Claude Code usage guidelines

### General principles

1. **One stage at a time.** Don't paste the entire spec and say "build it." Give Claude Code one focused task.
2. **Review before proceeding.** After each Claude Code output, run the app and verify visually. Don't stack multiple generations without checking.
3. **Paste relevant context.** When asking Claude Code to implement Stage 3, paste the data contracts and the current App.jsx so it knows what it's connecting to.
4. **Be specific about what NOT to change.** If you want Claude Code to add the generation pipeline without touching the UI, say so explicitly.
5. **Use `claude --continue` to maintain context** when you need multiple rounds on the same task.

### When something goes wrong

If Claude Code generates code that doesn't work:
1. Copy the exact error message
2. Tell Claude Code: "This error occurred when running the app: [error]. The file is [file]. Fix only this issue, do not refactor other code."
3. Do NOT ask it to "improve" or "clean up" at the same time — that's how cascading changes happen

### Testing via Claude Code

Claude Code can run your dev server and test things. Use this pattern:

```
Run `npm run dev` and verify the app loads without console errors. Then open the browser console and run:
[paste a test command]

Tell me what you see. If there are errors, fix them.
```

For the API pipeline specifically:

```
Open the browser console and run this to test the understanding engine:

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "[KEY]", "anthropic-version": "2023-06-01" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: "[first 100 chars of understanding prompt]...",
    messages: [{ role: "user", content: "how does compound interest grow" }]
  })
});
const data = await response.json();
console.log(JSON.stringify(data.content[0].text, null, 2));

Verify the output is valid JSON matching the UnderstandingResult interface.
```

---

## Pre-hackathon checklist

### Robin
- [X] Create GitHub repo with scaffold (Vite + React + Tailwind)
- [X] Add CLAUDE.md and hackathon-spec.md to repo
- [ ] Add CDN scripts for Plotly and Three.js to index.html
- [ ] Create empty file stubs for all files in the component structure
- [X] Add .env.example with VITE_ANTHROPIC_API_KEY=your-key-here
- [ ] Test both system prompts via Claude.ai with 5+ diverse prompts
- [ ] Share repo link and data contracts with teammates
- [ ] Brief teammates on their roles and Claude Code prompts

### Person B
- [ ] Clone repo, verify it runs
- [ ] Review data contracts and mock data
- [ ] Familiarise with Tailwind dark theme utilities
- [ ] Have Claude Code ready with the frontend prompt prepared

### Person C
- [ ] Clone repo, verify it runs
- [ ] Verify `window.Plotly` is available in the browser console
- [ ] Review the mock generated code format
- [ ] Understand how new Function() works and its limitations
- [ ] Have Claude Code ready with the executor prompt prepared
