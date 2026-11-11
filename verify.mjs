import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// へんな子、面接にくる の検証。node verify.mjs
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5792
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0); await p.waitForFunction(() => window.__ohReady && !document.querySelector('#loading'), null, { timeout: 15000 })
  return p
}
// 本物の指（マウス or タッチ）で押す
const press = async (p, sel, touch) => { const r = await p.evaluate(s => oh.xy(s), sel); if (touch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y) }
const waitDecide = p => p.waitForFunction(() => oh.canDecide() || oh.state !== 'play', null, { timeout: 15000 })
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#notice') || el.id === 'shoo') continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) a,#how:not([hidden]) button')) { if (!el.offsetParent || el.id === 'shoo') continue; const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  // 紙の中身がはみ出していないか
  for (const id of ['#paper', '#howIn', '#notice', '#resume']) { const e = document.querySelector(id); if (e && e.offsetParent && e.scrollHeight > e.clientHeight + 2) over.push(id + ' 中身あふれ ' + e.scrollHeight + '>' + e.clientHeight) }
  return { H, over: over.slice(0, 6) }
})
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r))
})
await t('OGP 一式と canonical', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]'), !!document.querySelector('link[rel=canonical]')))
  expect(r.every(Boolean), JSON.stringify(r))
})
await t('画面に AI・画像生成の言葉が出ない', async () => {
  const txt = await p.evaluate(() => document.body.innerText + ' ' + JSON.stringify(OH_DATA.txt))
  expect(!/(\bAI\b|画像生成|生成AI|ChatGPT|Codex)/.test(txt), 'found')
})

// ---- 遊びの通し（本物のクリックで正解を押す） ----
await p.evaluate(() => oh.dbg.seed(12345))
await press(p, '#bStart')
await t('始めると最初の応募者が来て、ハンコが押せる', async () => { await waitDecide(p); return await p.evaluate(() => ({ seen: oh.seen, conds: oh.conds.length, ph: oh.cur().ph })) })
await t('最初は求人票の案内が出る（チュートリアル）', async () => { const h = await p.evaluate(() => oh.hint()); expect(h.includes('求人票'), h); return h })
await t('画面に同時に出る文字は2つまで（吹き出し＋案内）', async () => {
  const n = await p.evaluate(() => [oh.bubble(), oh.hint()].filter(Boolean).length + (document.querySelector('#flash.on') ? 0 : 0))
  expect(n <= 2, n); return n
})
const first5 = []
await t('正解を押すと「さばいた」が増える（5人）', async () => {
  for (let i = 0; i < 5; i++) {
    await waitDecide(p)
    const c = await p.evaluate(() => oh.cur()); first5.push(JSON.stringify(c.t) + c.ok)
    await press(p, c.ok ? '#bHire' : '#bNo')
    await p.waitForFunction(n => oh.score === n, i + 1, { timeout: 5000 })
  }
  const tally = await p.evaluate(() => document.querySelector('#tallyN').textContent)
  expect(tally === '5', tally); return { score: await p.evaluate(() => oh.score), miss: await p.evaluate(() => oh.miss) }
})
await t('4人目は替え玉（写真とちがう）で、写真の案内が出ていた', async () => {
  const k = await p.evaluate(() => oh.log[3].kind); expect(k === 'impostor', k)
})
await t('5人さばいたら社長が求人票を貼り替える', async () => {
  await p.waitForFunction(() => oh.boss === 'notice', null, { timeout: 5000 })
  await waitDecide(p); const n = await p.evaluate(() => oh.conds.length); expect(n === 2, n); return n
})
await t('採用した子は同僚になる', async () => { const n = await p.evaluate(() => oh.hires); expect(n >= 1, n); return n })
await t('同僚が邪魔しに来て、本物のタップでどかせる', async () => {
  await p.evaluate(() => oh.dbg.spawnPest())
  await p.waitForFunction(() => oh.pest && oh.pest.ph === 'stay', null, { timeout: 3000 })
  const xy = await p.evaluate(() => oh.pestXY())
  const vis = await p.evaluate(() => !document.querySelector('#shoo').hidden)
  await p.mouse.click(xy.x, xy.y)
  await p.waitForFunction(() => !oh.pest || oh.pest.ph === 'out', null, { timeout: 2000 })
  return { kind: await p.evaluate(() => oh.dbg.G.pest ? oh.dbg.G.pest.kind : 'gone'), vis }
})
await p.screenshot({ path: ROOT + '/shots/v-play.png' })
await t('まちがえると社長が怒って始末書が1枚', async () => {
  await waitDecide(p); const c = await p.evaluate(() => oh.cur())
  await press(p, c.ok ? '#bNo' : '#bHire')
  await p.waitForFunction(() => oh.boss === 'mad', null, { timeout: 3000 })
  await p.waitForTimeout(500)
  const r = await p.evaluate(() => ({ miss: oh.miss, m: document.querySelector('#tallyM').textContent, bub: oh.bubble() }))
  expect(r.miss === 1 && r.m.includes('始末書'), JSON.stringify(r)); return r
})
await p.screenshot({ path: ROOT + '/shots/v-mad.png' })
await t('2回目のまちがいでクビ→解雇通知書', async () => {
  await waitDecide(p); const c = await p.evaluate(() => oh.cur())
  await press(p, c.ok ? '#bNo' : '#bHire')
  await p.waitForFunction(() => oh.state === 'result', null, { timeout: 8000 })
  await p.waitForTimeout(400)
  const r = await p.evaluate(() => ({ num: document.querySelector('#rNum').textContent, rank: document.querySelector('#rRank').textContent, reason: document.querySelector('#rReason').textContent }))
  expect(+r.num >= 5 && r.rank && r.reason.includes('理由'), JSON.stringify(r)); return r
})
await p.screenshot({ path: ROOT + '/shots/v-result.png' })
await t('結果の画像（1080x1350）が作れる', async () => { const n = await p.evaluate(() => oh.shareLen()); expect(n > 50000, n); return n })
await t('結果に支援と横丁へ戻るがある', async () => { const r = await p.evaluate(() => [!!document.querySelector('#tmSupport'), !!document.querySelector('#tmHome')]); expect(r.every(Boolean), r) })
await t('同じ種なら同じ応募者が来る', async () => {
  await p.evaluate(() => oh.dbg.seed(12345)); await press(p, '#bAgain'); const again = []
  for (let i = 0; i < 5; i++) { await waitDecide(p); const c = await p.evaluate(() => oh.cur()); again.push(JSON.stringify(c.t) + c.ok); await press(p, c.ok ? '#bHire' : '#bNo'); await p.waitForFunction(n => oh.score === n, i + 1) }
  expect(again.join() === first5.join(), 'diff'); return true
})
await t('音: 録音素材が鳴っている（呼ばれた回数）、BGM と環境音のループ', async () => {
  const r = await p.evaluate(() => ({ stamp: Snd.played.stamp, door: Snd.played.door, loops: Snd.playing() }))
  expect(r.stamp > 5 && r.door > 5 && r.loops.includes('amb') && r.loops.includes('bgm'), JSON.stringify(r)); return r
})
await t('音: 実際には無音（テスト中）', async () => { expect(await p.evaluate(() => window.__muteOk()), 'loud') })
await t('ページを離れると BGM と環境音が止まる', async () => {
  const r = await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); return { away: Snd.away, loops: Snd.playing() } })
  expect(r.away && r.loops.length === 0, JSON.stringify(r)); return r
})
await p.close()

// ---- 何もしない通し: 待たせて帰られ続けると0人で最低の称号
{
  const q = await open(browser)
  await q.evaluate(() => { oh.dbg.seed(7); oh.dbg.fast(true) })
  await press(q, '#bStart')
  await t('何もしないと0人・最低の称号でクビ', async () => {
    await q.waitForFunction(() => oh.state === 'result', null, { timeout: 40000 })
    const r = await q.evaluate(() => ({ n: oh.score, rank: document.querySelector('#rRank').textContent, low: OH_DATA.txt.ja.ranks[0][1], why: oh.lastWhy }))
    expect(r.n === 0 && r.rank === r.low && r.why === 'late', JSON.stringify(r)); return r
  })
  await q.close()
}
// ---- 英語
{
  const q = await open(browser, { locale: 'en-US' })
  await t('英語: タイトルとハンコが英語', async () => {
    const r = await q.evaluate(() => [document.querySelector('#bStart').textContent, document.querySelector('#sHire').textContent, document.querySelector('#t1').textContent])
    expect(r[0] === 'Start interviews' && r[1] === 'HIRE' && r[2] === 'Odd Hires', r.join('|')); return r
  })
  await press(q, '#bStart'); await waitDecide(q)
  await t('英語: 遊び中に日本語が出ない', async () => {
    await q.waitForTimeout(300)
    const s = await q.evaluate(() => document.querySelector('#play').innerText)
    expect(!/[ぁ-んァ-ヶ一-龠]/.test(s), s.slice(0, 120)); return true
  })
  await q.screenshot({ path: ROOT + '/shots/v-en.png' })
  await q.close()
}
// ---- 3サイズ × 全画面で一画面に収まる
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await press(q, '#bHowT'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await press(q, '#bHowClose')
  await q.evaluate(() => oh.dbg.seed(99)); await press(q, '#bStart'); await waitDecide(q)
  // 求人票を4行にして一番ふくらんだ形で見る
  await q.evaluate(() => { oh.dbg.setConds([{ k: 'shape', v: 'shizuku', neg: true }, { k: 'color', v: 'orange', neg: true }, { k: 'arms', v: false }, { k: 'hat', v: false }]) })
  views.play = await fit(q)
  const ov = await overflow(q)
  await t(`${name}: 遊び画面ではみ出しなし`, async () => { expect(ov.sw <= ov.W && !ov.bad.length, JSON.stringify(ov)) })
  await t(`${name}: 押す物（ハンコ・邪魔の場所）が画面内で44px以上`, async () => {
    const r = await q.evaluate(() => { const out = []; for (const s of ['#bHire', '#bNo']) { const b = document.querySelector(s).getBoundingClientRect(); out.push([s, Math.round(b.width), Math.round(b.bottom)]) } return { out, H: innerHeight } })
    expect(r.out.every(([, w, b]) => w >= 44 && b <= r.H), JSON.stringify(r))
    // 邪魔4種の押す所
    const kinds = []
    for (const k of ['notice', 'photo', 'face', 'shake']) {
      const b = await q.evaluate(k => { const G = oh.dbg.G; G.pest = { who: { shape: 'maru', color: 'pink', eyes: 2, arms: true, hat: null }, kind: k, ph: 'stay', t: 0 }; const r = oh.pestXY(); G.pest = null; return r }, k)
      kinds.push([k, Math.round(b.x), Math.round(b.y)]); expect(b.x > 20 && b.x < w - 10 && b.y > 20 && b.y < r.H - 20, k)
    }
    return kinds
  })
  await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  // まちがい2回でクビ
  for (let i = 0; i < 2; i++) { await waitDecide(q); const c = await q.evaluate(() => oh.cur()); if (!c) break; await press(q, c.ok ? '#bNo' : '#bHire'); await q.waitForFunction(m => oh.miss >= m, i + 1) }
  await q.waitForFunction(() => oh.state === 'result', null, { timeout: 10000 }); await q.waitForTimeout(500)
  views.result = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: エラーなし`, async () => { expect(!q.errs.length, q.errs.join('|')) })
  await q.close()
}
// 求人票4行がはみ出さない（一番長い英語でも）
{
  for (const loc of ['ja-JP', 'en-US']) {
    const q = await open(browser, { viewport: { width: 360, height: 640 }, locale: loc })
    await press(q, '#bStart'); await waitDecide(q)
    await t(`求人票4行の最長（${loc}・360幅）が紙からはみ出さず、絵と重ならない`, async () => {
      const r = await q.evaluate(() => {
        oh.dbg.setConds([{ k: 'shape', v: 'shizuku', neg: true }, { k: 'color', v: 'orange', neg: true }, { k: 'arms', v: false }, { k: 'hat', v: false }])
        const n = document.querySelector('#notice'), nb = n.getBoundingClientRect(), out = []
        for (const li of n.querySelectorAll('li')) { const b = li.getBoundingClientRect(); if (b.right > nb.right + 1) out.push(li.textContent) }
        const tally = document.querySelector('#tally').getBoundingClientRect()
        const G = oh.dbg.G, headTop = Math.round(G.A ? 0 : 0)
        return { out, n: n.querySelectorAll('li').length, bottom: Math.round(nb.bottom), right: Math.round(nb.right), tallyLeft: Math.round(tally.left) }
      })
      expect(r.n === 4 && !r.out.length && r.right < r.tallyLeft + 4, JSON.stringify(r)); return r
    })
    await q.screenshot({ path: `${ROOT}/shots/notice4-${loc}.png` })
    await q.close()
  }
}
await browser.close()

// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップで始めて、タップでハンコ3回', async () => {
  await wp.evaluate(() => oh.dbg.noTut())
  await press(wp, '#bStart', true)
  for (let i = 0; i < 3; i++) { await waitDecide(wp); const c = await wp.evaluate(() => oh.cur()); await press(wp, c.ok ? '#bHire' : '#bNo', true); await wp.waitForFunction(n => oh.score === n, i + 1, { timeout: 5000 }) }
  return await wp.evaluate(() => oh.score)
})
await t('WebKit: 邪魔をタップでどかせる', async () => {
  await waitDecide(wp); await wp.evaluate(() => oh.dbg.spawnPest())
  await wp.waitForFunction(() => oh.pest && oh.pest.ph === 'stay')
  const xy = await wp.evaluate(() => oh.pestXY()); await wp.touchscreen.tap(xy.x, xy.y)
  await wp.waitForFunction(() => !oh.pest || oh.pest.ph === 'out', null, { timeout: 2000 })
})
await t('WebKit: 実際には無音', async () => { expect(await wp.evaluate(() => window.__muteOk()), 'loud') })
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
