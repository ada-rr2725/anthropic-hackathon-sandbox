// src/prompts/recovery.js

export const RECOVERY_PROMPT = `The following JavaScript code was generated to render an interactive visualisation but threw an error when executed. Fix the code so it runs correctly.

RULES:
1. Return ONLY the fixed code, same format — a self-contained IIFE taking a containerId argument.
2. Do not change the visual design, structure, or model logic unless the error requires it.
3. Do not add markdown fences, explanations, or any text before or after the code.
4. Common issues to check: undefined variables, missing semicolons, Plotly/THREE not available as globals, DOM element not found, division by zero, infinite loops.
5. If the error is in the Plotly configuration, ensure all trace arrays have matching lengths.
6. Ensure the code uses window.Plotly and window.THREE, not import statements.

ERROR MESSAGE:
{error_message}

ORIGINAL CODE:
{original_code}`;
