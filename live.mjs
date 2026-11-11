import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
// github.io は tom3games.com へ転送されるので、転送の1行だけ外して Pages の中身を確かめる
import { chromium, webkit } from 'playwright'
import { execSync } from 'node:child_process'
const OWNER = (() => { try { return execSync('gh api user -q .login', { encoding: 'utf8' }).trim().toLowerCase() } catch { return '' } })()
const URL0 = process.env.URL0 || 'https://tom3games.github.io/odd-hires/'
const out = []
for (const [name, bt, opts] of [['chromium', chromium, {}], ['webkit', webkit, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const b = await bt.launch(bt === chromium ? MUTE_LAUNCH : {}), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  const p = await ctx.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errs.push('fail ' + r.url()) })
  const path = new URL(URL0).pathname
  await p.route(u => u.href.startsWith(URL0) && u.pathname === path, async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/<script id="ghMove">[^<]*<\/script>/, '') }) })
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__ohReady && !document.querySelector('#loading'), null, { timeout: 20000 })
  const touch = name === 'webkit', tap = async s => { const r = await p.evaluate(s => oh.xy(s), s); if (touch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y) }
  await p.evaluate(() => oh.dbg.noTut()); await tap('#bStart')
  for (let i = 0; i < 3; i++) { await p.waitForFunction(() => oh.canDecide(), null, { timeout: 15000 }); const c = await p.evaluate(() => oh.cur()); await tap(c.ok ? '#bHire' : '#bNo'); await p.waitForFunction(n => oh.score === n, i + 1) }
  for (let i = 0; i < 2; i++) { await p.waitForFunction(() => oh.canDecide(), null, { timeout: 15000 }); const c = await p.evaluate(() => oh.cur()); await tap(c.ok ? '#bNo' : '#bHire'); await p.waitForFunction(n => oh.miss >= n, i + 1) }
  await p.waitForFunction(() => oh.state === 'result', null, { timeout: 15000 })
  await p.screenshot({ path: `shots/live-${name}.png` })
  const og = await p.evaluate(async () => { const r = await fetch('og.png'); return r.status + ' ' + r.headers.get('content-type') })
  out.push(`${name}: score=${await p.evaluate(() => oh.score)} og=${og} mute=${await p.evaluate(() => window.__muteOk())} errors=${errs.length ? errs.join(' | ') : 'none'}`)
  await b.close()
}
if (process.env.SKIPGH) { console.log(out.join('\n')); process.exit(0) }
const b = await chromium.launch(MUTE_LAUNCH), p = await b.newPage()
for (const u of ['https://github.com/tom3games/odd-hires', 'https://github.com/tom3games/odd-hires/commits/main']) {
  const res = await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  out.push(`${u} status=${res.status()} owner=${OWNER && (await p.content()).toLowerCase().includes(OWNER) ? 'FOUND' : 'none'}`)
}
await b.close()
console.log(out.join('\n'))
