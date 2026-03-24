I'm testing a product concept. I need you to follow these instructions precisely.

STEP 1 — UNDERSTANDING
Take my prompt at the bottom and reason about it. Output:
- Extracted high-signal words
- Domain
- Complexity level: "beginner" (informal/curious), "intermediate" (some domain knowledge), or "advanced" (technical language)
- Core insight: ONE plain-language sentence a 14-year-old could understand. This becomes the headline.
- The model you'd use and why (2 sentences max)
- Parameters, each tagged as:
  - "primary" (1-2 params that most affect the core insight — user MUST interact with these)
  - "secondary" (enriches understanding, shown in expandable section)
  - "hidden" (model calibration — set a good default, never show to user)

STEP 2 — GENERATION
Create a React artifact that visualises this model. Follow these rules STRICTLY:

PROGRESSIVE DISCLOSURE (mandatory structure):
1. HEADLINE: The core insight as large text. Not a model name. Not an equation. Below it, ONE sentence of context (max 15 words).
2. PRIMARY VISUALISATION: Exactly ONE plot. Maximum 2 data series. 1-2 primary sliders directly below it. This must communicate the core insight within 5 seconds of looking at it.
3. EXPLORE DEEPER: A collapsible section (collapsed by default for beginner complexity). Contains additional plots and secondary parameter sliders.
4. TECHNICAL DETAILS: A collapsible section (collapsed by default for beginner/intermediate). Contains equations, assumptions, model description.

WHAT YOU MUST NOT DO:
- NO dashboard layouts with stat cards across the top
- NO equations visible in the primary view for beginner/intermediate audiences
- NO more than 2 traces on the primary plot
- NO faint dotted reference lines in the background — they add noise
- NO model calibration parameters as visible sliders
- NO axis tick suffixes like "g" or "%" for beginner audiences — use the axis title instead
- NO more than 3 sliders visible by default total

AUDIENCE ADAPTATION:
- If complexity_level is "beginner": only headline + primary plot + primary sliders visible by default. Everything else collapsed. Plain language everywhere. No jargon, no units unless essential.
- If "intermediate": headline + primary plot + explore deeper visible. Technical details collapsed.
- If "advanced": everything visible.

VISUAL DESIGN (use these exact values, do NOT use default Plotly or GitHub-dark colours):
- Background: #111116
- Surface/cards: #1a1a22
- Border: #2a2a35
- Text primary: #e8e4df
- Text secondary: #9a9590
- Accent primary: #c8a2ff (soft violet)
- Accent secondary: #64dfdf (teal)
- Positive: #7ae6a0
- Negative: #f07178
- Highlight: #ffd580
- Grid lines: #1f1f28
- Font: 'DM Sans', system-ui, sans-serif (load from Google Fonts CDN in the artifact)
- Monospace values: 'DM Mono', monospace
- Border radius: 16px cards, 8px buttons
- Plotly: paper_bgcolor and plot_bgcolor both "rgba(0,0,0,0)", displayModeBar: false

SLIDER STYLE:
- HTML range inputs, not Plotly sliders
- Label in plain language on the left, current value on the right
- Accent colour on the slider track
- On change, recompute data and call Plotly.react()

COLLAPSIBLE SECTIONS:
- Clickable header with ▸/▾ toggle
- Use React state for expand/collapse
- Subtle border-top to separate from primary content

The overall vibe: this is an interactive explanation, not a dashboard. It should feel like a smart friend showing you something cool, not a Bloomberg terminal.

My prompt: "Why are train bellows curvy?"
