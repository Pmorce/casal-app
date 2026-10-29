// Manual-verification helper: drives the dev app (emulators + `npm run dev`) in a phone-sized
// headless Edge as Ana and Rui side by side, runs a named scenario and saves screenshots.
// Usage: node scripts/ui-check.mjs <scenario> [outDir]
import { chromium } from 'playwright-core'

const [scenario = 'shell', outDir = '.'] = process.argv.slice(2)
const URL = process.env.APP_URL ?? 'http://localhost:5173/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const browser = await chromium.launch({ executablePath: EDGE })
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' }

async function login(who, fakeNow) {
  const ctx = await browser.newContext(phone)
  const page = await ctx.newPage()
  if (fakeNow) await page.clock.install({ time: new Date(fakeNow) })
  page.on('pageerror', e => console.log(`[${who} pageerror]`, e.message))
  await page.goto(URL)
  await page.getByPlaceholder('Email').fill(`${who}@casa.test`)
  await page.getByPlaceholder('Palavra-passe').fill('casa1234')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('Olá').first().waitFor({ timeout: 15000 })
  return { ctx, page }
}

const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
const expectText = async (page, text, label) => {
  await page.getByText(text).first().waitFor({ timeout: 8000 })
  console.log(`ok: ${label}`)
}

const scenarios = (await import('./ui-scenarios.mjs')).default
const run = scenarios[scenario]
if (!run) throw new Error(`unknown scenario ${scenario}`)
try {
  await run({ login, shot, expectText })
  console.log('SCENARIO PASS')
} catch (e) {
  console.log('SCENARIO FAIL', e.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
