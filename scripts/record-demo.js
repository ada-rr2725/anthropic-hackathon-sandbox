/**
 * Cascade demo recorder
 *
 * Automates a full demo walkthrough of the app and saves a .webm video.
 * You then convert the video to a GIF for the README.
 *
 * ── setup (one-time) ──────────────────────────────────────────────
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * ── run ───────────────────────────────────────────────────────────
 *   # make sure `npm run dev` is running in another terminal first
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/record-demo.js
 *
 * ── convert to GIF ────────────────────────────────────────────────
 *   # online (easiest): drop the .webm into https://ezgif.com/video-to-gif
 *   # or with ffmpeg locally:
 *   ffmpeg -i demo/cascade-demo.webm \
 *     -vf "fps=20,scale=1280:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
 *     docs/demo.gif
 */

import { chromium } from 'playwright'

const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OUT_DIR = 'demo'
const POLICY  = 'The US imposes a 25% blanket tariff on all Chinese imports'

// milliseconds — tune to your machine speed
const DELAYS = {
  afterLoad:   1200,
  afterKeySet:  800,
  afterType:    600,
  afterSubmit:  500,
  perTab:      3000,
  finalPause:  2000,
}

const wait = ms => new Promise(r => setTimeout(r, ms))

if (!API_KEY)
{
  console.error('Error: set ANTHROPIC_API_KEY environment variable before running.')
  process.exit(1)
}

const browser = await chromium.launch({
  headless: false,
  args: ['--window-size=1280,800'],
})

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: {
    dir: OUT_DIR,
    size: { width: 1280, height: 800 },
  },
})

const page = await context.newPage()

console.log('→ opening app...')
await page.goto(APP_URL)
await wait(DELAYS.afterLoad)

// inject api key into localstorage and reload so the gate is bypassed
console.log('→ setting api key...')
await page.evaluate(key => { localStorage.setItem('cascade_api_key', key) }, API_KEY)
await page.reload({ waitUntil: 'networkidle' })
await wait(DELAYS.afterKeySet)

// type the policy into the textarea character by character for a natural feel
console.log('→ typing policy...')
const textarea = page.locator('textarea').first()
await textarea.click()
for (const char of POLICY)
{
  await textarea.type(char)
  await wait(30 + Math.random() * 40)
}
await wait(DELAYS.afterType)

// submit
console.log('→ submitting...')
await page.locator('button:has-text("Analyse Policy")').click()
await wait(DELAYS.afterSubmit)

// wait for analysis to finish (up to 90 seconds)
console.log('→ waiting for results...')
await page.waitForSelector('button:has-text("← New policy")', { timeout: 90_000 })
console.log('→ results loaded.')
await wait(1500)

// cycle through chart tabs
for (const tab of ['Markets', 'People', 'Voters', 'Timeline'])
{
  console.log(`→ tab: ${tab}`)
  await page.locator(`button:has-text("${tab}")`).last().click()
  await wait(DELAYS.perTab)
}

await wait(DELAYS.finalPause)

console.log('→ done. closing browser...')
await context.close()
await browser.close()

console.log(`\nVideo saved to: ${OUT_DIR}/`)
console.log('Convert to GIF using ezgif.com or ffmpeg (see script header).')
