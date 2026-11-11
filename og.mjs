import './mute-auto.mjs'
// SNS 用画像 og.png（1200x630）。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = import.meta.dirname, PORT = 5793
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__ohReady && !document.querySelector('#loading'))
await p.evaluate(() => { oh.dbg.seed(3); oh.dbg.noTut() }); await p.click('#bStart')
await p.waitForFunction(() => oh.canDecide())
// 一番笑える場面: 「目が3つ」の募集に、ただの箱が来て、写真もただの箱
await p.evaluate(() => {
  oh.dbg.setConds([{ k: 'eyes', v: 3, neg: false }, { k: 'hat', v: true }])
  const G = oh.dbg.G; G.hires.push({ shape: 'mame', color: 'green', eyes: 2, arms: true, hat: null, eyeStyle: 'dot' }, { shape: 'maru', color: 'pink', eyes: 3, arms: true, hat: 'cone', eyeStyle: 'ring' })
  oh.dbg.setApp({ shape: 'box', color: 'card', eyes: 0, arms: false, hat: 'top', eyeStyle: 'dot' }, null, '目は3つです（気持ちは）')
  document.querySelector('#vName').textContent = '箱 です'; document.querySelector('#vSkill').textContent = '中身はひみつ'
  oh.dbg.pause()
})
await p.waitForTimeout(300); await p.evaluate(() => oh.dbg.step(1))
const shot = await p.screenshot({ clip: { x: 0, y: 0, width: 390, height: 700 } })
const ctx2 = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }), page2 = await ctx2.newPage()
const boss = readFileSync(ROOT + '/img/boss.webp').toString('base64')
await page2.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=swap" rel="stylesheet"><style>
body{margin:0;width:1200px;height:630px;background:#FBF5E9;font-family:"M PLUS Rounded 1c",sans-serif;color:#2B2B2B;position:relative;overflow:hidden}
.sc{position:absolute;left:64px;top:-40px;width:390px;transform:rotate(-2.5deg);border:4px solid #2B2B2B;border-radius:6px;box-shadow:10px 12px 0 rgba(43,43,43,.15)}
h1{position:absolute;left:530px;top:150px;margin:0;font-size:88px;line-height:1.12;font-weight:800}
h1 span{display:block}h1 .mk{background:linear-gradient(transparent 58%,#FFD34D 58%,#FFD34D 90%,transparent 90%)}
p{position:absolute;left:534px;top:385px;margin:0;font-size:32px;font-weight:800}
.seal{position:absolute;left:1015px;top:95px;width:120px;height:120px;border-radius:50%;border:7px solid #D23B2C;color:#D23B2C;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;transform:rotate(14deg);opacity:.88}
.boss{position:absolute;left:1010px;top:430px;width:150px}
</style></head><body><img class="sc" src="data:image/png;base64,${shot.toString('base64')}">
<h1><span>へんな子、</span><span class="mk">面接にくる</span></h1><p>求人票どおりに、ハンコを押すだけ。</p><div class="seal">採用</div><img class="boss" src="data:image/webp;base64,${boss}"></body></html>`)
await page2.evaluate(() => document.fonts.ready); await page2.waitForTimeout(600)
writeFileSync(ROOT + '/og.png', await page2.screenshot())
await b.close(); server.kill(); console.log('og.png')
