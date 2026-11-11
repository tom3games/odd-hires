import './mute-auto.mjs'
// 確認用のスクショ。node shot.mjs [幅] [高さ]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname; mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5791, W = +(process.argv[2] || 390), H = +(process.argv[3] || 844)
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(), ctx = await b.newContext({ locale: process.env.EN ? 'en-US' : 'ja-JP', viewport: { width: W, height: H }, deviceScaleFactor: 2 })
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__ohReady, null, { timeout: 8000 }).catch(async e => { console.log("NOTREADY", errs, await p.evaluate(() => [window.__jsUp, document.title, location.href])); process.exit(1) })
await p.waitForTimeout(600)
const tag = `${W}x${H}`
await p.screenshot({ path: `shots/s-${tag}-title.png` })
await p.evaluate(() => oh.dbg.seed(7))
await p.click('#bStart'); await p.waitForFunction(() => oh.cur() && oh.cur().ph === 'wait', null, { timeout: 8000 })
await p.evaluate(() => oh.dbg.pause()); await p.screenshot({ path: `shots/s-${tag}-play1.png` }); await p.evaluate(() => oh.dbg.pause(false))
// 何人かさばく（正解を押す）
for (let i = 0; i < 9; i++) {
  await p.waitForFunction(() => oh.canDecide(), null, { timeout: 10000 })
  const ok = await p.evaluate(() => oh.cur().ok)
  await p.click(ok ? '#bHire' : '#bNo')
}
await p.waitForFunction(() => oh.canDecide(), null, { timeout: 10000 })
await p.evaluate(() => { oh.dbg.spawnPest() }); await p.waitForTimeout(500)
await p.evaluate(() => oh.dbg.pause()); await p.screenshot({ path: `shots/s-${tag}-pest.png` }); await p.evaluate(() => oh.dbg.pause(false))
const ok = await p.evaluate(() => oh.cur().ok); await p.click(ok ? '#bNo' : '#bHire'); await p.waitForTimeout(1300)
await p.evaluate(() => oh.dbg.pause()); await p.screenshot({ path: `shots/s-${tag}-mad.png` }); await p.evaluate(() => oh.dbg.pause(false))
for (let i = 0; i < 6 && await p.evaluate(() => oh.state === 'play'); i++) {
  await p.waitForFunction(() => oh.canDecide() || oh.state !== 'play', null, { timeout: 10000 })
  if (await p.evaluate(() => oh.state !== 'play')) break
  const ok = await p.evaluate(() => oh.cur().ok); await p.click(ok ? '#bNo' : '#bHire')
}
await p.waitForFunction(() => oh.state === 'result', null, { timeout: 10000 }); await p.waitForTimeout(800)
await p.screenshot({ path: `shots/s-${tag}-result.png` })
console.log('errors:', errs.length ? errs.join(' | ') : 'none')
await b.close(); server.kill()
