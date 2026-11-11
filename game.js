// へんな子、面接にくる 本体
;(() => {
  'use strict'
  window.__jsUp = true
  const D = window.OH_DATA, LG = window.OHL
  const $ = s => document.querySelector(s)
  const INK = '#2B2B2B'
  let lang = 'ja'
  try { lang = localStorage.getItem('oh_lang') || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en') } catch (e) {}
  const T = () => D.txt[lang]
  const DPR = Math.min(2, window.devicePixelRatio || 1)
  const lerp = (a, b, t) => a + (b - a) * t
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
  const rnd = Math.random
  const pickR = a => a[Math.floor(rnd() * a.length)]

  // ---------- 画像 ----------
  const IMG = {}
  const LIST = ['b_maru', 'b_sankaku', 'b_shikaku', 'b_purin', 'b_mame', 'b_shizuku', 'box', 'boss', 'boss_mad', 'h_cone', 'h_top', 'h_knit']
  function loadImages(onOne) {
    return Promise.all(LIST.map(n => new Promise(ok => {
      const im = new Image(); im.onload = () => { IMG[n] = im; onOne(); ok() }; im.onerror = () => { onOne(); ok() }; im.src = 'img/' + n + '.webp?v=1'
    })))
  }
  // 黄色で描いた体を好きな色に塗り替える（線の黒と塗りの間を色で置き換える）
  const TINT = {}
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const colorHex = c => D.colors[c] || (c && c[0] === '#' ? c : '#FFD34D')
  function body(shape, color) {
    const k = shape + ':' + color
    if (TINT[k]) return TINT[k]
    const im = IMG[shape === 'box' ? 'box' : 'b_' + shape]; if (!im) return null
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
    const x = c.getContext('2d'); x.drawImage(im, 0, 0)
    if (shape !== 'box' && color !== 'yellow') {
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data
      const C = [43, 43, 43], Y = [255, 211, 78], dv = [Y[0] - C[0], Y[1] - C[1], Y[2] - C[2]], dd = dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2]
      const W = c.width
      for (let i = 0; i < p.length; i += 4) {
        if (p[i + 3] < 8) continue
        const v0 = p[i] - C[0], v1 = p[i + 1] - C[1], v2 = p[i + 2] - C[2]
        const t = (v0 * dv[0] + v1 * dv[1] + v2 * dv[2]) / dd
        const r0 = v0 - t * dv[0], r1 = v1 - t * dv[1], r2 = v2 - t * dv[2]
        if (r0 * r0 + r1 * r1 + r2 * r2 > 1600) continue   // カラメルなど別の色は残す
        let tc
        if (color === 'niji') { const px = (i / 4) % W, hh = (px / W) * 300; tc = hsl(hh, 0.85, 0.72) } else tc = hex(colorHex(color))
        const tt = clamp(t, 0, 1.1)
        p[i] = C[0] + (tc[0] - C[0]) * tt; p[i + 1] = C[1] + (tc[1] - C[1]) * tt; p[i + 2] = C[2] + (tc[2] - C[2]) * tt
      }
      x.putImageData(d, 0, 0)
    }
    return (TINT[k] = c)
  }
  function hsl(h, s, l) { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) }; return [f(0), f(8), f(4)] }
  const armColor = s => s.color === 'niji' ? '#FFB86B' : s.color === 'card' ? '#D9A86C' : colorHex(s.color)

  // ---------- キャラを描く ----------
  // s: 見た目 / cx: 中心x / by: 足もとy / H: 体の高さ / o: 動き
  function drawChar(ctx, s, cx, by, H, o = {}) {
    const img = body(s.shape, s.color); if (!img) return
    const m = D.body[s.shape]
    const sq = o.squash || 0, bw = H * img.width / img.height * (1 + sq), bh = H * (1 - sq)
    const x0 = cx - bw / 2, y0 = by - bh
    const P = (u, v) => [x0 + u * bw, y0 + v * bh]
    const ol = Math.max(1.3, H * 0.018)
    ctx.save()
    if (o.rot) { ctx.translate(cx, by - bh / 2); ctx.rotate(o.rot); ctx.translate(-cx, -(by - bh / 2)) }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // 腕（体の後ろ）
    if (s.arms) {
      const wv = o.wave || [0, 0]
      for (let side = 0; side < 2; side++) {
        const dir = side ? 1 : -1, S = P(m.sh[side][0], m.sh[side][1])
        const a = lerp(0.42, -1.0, clamp(wv[side], 0, 1)) + (o.t ? Math.sin(o.t * 2 + side) * 0.06 : 0)
        const L = H * 0.27
        const hx = S[0] + dir * Math.cos(a) * L, hy = S[1] + Math.sin(a) * L
        const sx = S[0] - dir * H * 0.06, sy = S[1]
        const qx = S[0] + dir * L * 0.45, qy = S[1] + (a > 0 ? -H * 0.02 : H * 0.05)
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(qx, qy, hx, hy)
        ctx.strokeStyle = INK; ctx.lineWidth = H * 0.06 + ol * 2; ctx.stroke()
        ctx.strokeStyle = armColor(s); ctx.lineWidth = H * 0.06; ctx.stroke()
        ctx.beginPath(); ctx.arc(hx, hy, H * 0.047, 0, Math.PI * 2); ctx.fillStyle = armColor(s); ctx.fill(); ctx.lineWidth = ol; ctx.strokeStyle = INK; ctx.stroke()
      }
    }
    ctx.drawImage(img, x0, y0, bw, bh)
    // 顔
    const F = P(m.face[0], m.face[1]), n = s.eyes || 0
    if (n > 0) {
      const ring = s.eyeStyle === 'ring'
      const rr = H * (ring ? (n === 3 ? 0.058 : 0.072) : 0.031)
      const gap = ring ? rr * 2.45 : H * 0.12
      const look = o.look || [0, 0]
      const closed = o.blink || o.expr === 'sleep'
      for (let i = 0; i < n; i++) {
        const ex = F[0] + (i - (n - 1) / 2) * gap, ey = F[1]
        if (closed) { ctx.beginPath(); ctx.arc(ex, ey - rr * 0.2, rr * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = ol; ctx.stroke(); continue }
        if (ring) {
          ctx.beginPath(); ctx.arc(ex, ey, rr, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = ol * 0.95; ctx.strokeStyle = INK; ctx.stroke()
          ctx.beginPath(); ctx.arc(ex + look[0] * rr * 0.35, ey + look[1] * rr * 0.35, rr * (o.expr === 'shock' ? 0.28 : 0.48), 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill()
        } else {
          ctx.beginPath(); ctx.ellipse(ex + look[0] * 1.5, ey, rr * 0.85, rr * 1.1, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill()
        }
      }
      // 口
      const my = F[1] + (ring ? rr * 1.85 : H * 0.085), mw = H * 0.075
      ctx.strokeStyle = INK; ctx.lineWidth = ol; ctx.fillStyle = INK
      ctx.beginPath()
      const ex = o.expr
      if (s.mustache) {
        ctx.ellipse(F[0] - H * 0.07, my - H * 0.01, H * 0.075, H * 0.03, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath()
        ctx.ellipse(F[0] + H * 0.07, my - H * 0.01, H * 0.075, H * 0.03, -0.25, 0, Math.PI * 2); ctx.fill()
      } else if (ex === 'happy') { ctx.arc(F[0], my - mw * 0.35, mw * 0.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke() }
      else if (ex === 'sad') { ctx.arc(F[0], my + mw * 0.5, mw * 0.55, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke() }
      else if (ex === 'shock' || o.talk) { ctx.ellipse(F[0], my, mw * 0.32, mw * (o.talk ? 0.18 + 0.2 * Math.abs(Math.sin(o.t * 14)) : 0.42), 0, 0, Math.PI * 2); ctx.fill() }
      else if (ex === 'sleep') { ctx.arc(F[0], my, mw * 0.18, 0, Math.PI * 2); ctx.stroke() }
      else { ctx.moveTo(F[0] - mw / 2, my); ctx.lineTo(F[0] + mw / 2, my); ctx.stroke() }
      // 汗
      if (ex === 'sweat' || ex === 'shock') {
        const sx = F[0] + H * 0.3, sy = F[1] - H * 0.2 + ((o.t || 0) * 30 % (H * 0.12))
        ctx.beginPath(); ctx.moveTo(sx, sy - H * 0.06); ctx.quadraticCurveTo(sx + H * 0.04, sy, sx, sy + H * 0.02); ctx.quadraticCurveTo(sx - H * 0.04, sy, sx, sy - H * 0.06)
        ctx.fillStyle = '#BFE6FA'; ctx.fill(); ctx.lineWidth = ol * 0.8; ctx.strokeStyle = INK; ctx.stroke()
      }
    }
    // ぼうし
    if (s.hat && IMG['h_' + s.hat]) {
      const hi = IMG['h_' + s.hat], hm = m.hat, hw = hm[2] * H * (s.hat === 'cone' ? 0.85 : s.hat === 'top' ? 1.15 : 1.05), hh = hw * hi.height / hi.width
      const A = P(hm[0], hm[1])
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(hm[3] + (o.hatTilt || 0)); ctx.drawImage(hi, -hw / 2, -hh * 0.82, hw, hh); ctx.restore()
    }
    ctx.restore()
  }

  // ---------- 状態 ----------
  const G = {
    state: 'loading', seed: 0, r: null, conds: [], seen: 0, score: 0, miss: 0, hires: [], A: null, boss: null, pest: null, run: { bossCame: false },
    lastWhy: null, t: 0, paused: false, fast: 1, tut: true, tutDone: {}, best: 0, confetti: [], log: [],
  }
  try { G.best = +localStorage.getItem('oh_best') || 0; G.tut = !localStorage.getItem('oh_tut') } catch (e) {}

  // ---------- 音 ----------
  const S = n => 'snd/' + n + '.mp3'
  Snd.def({
    door: S('door_open'), close: [S('door_close_01'), S('door_close_03')], paper: [S('paper_01'), S('paper_02'), S('paper_03')],
    stamp: [S('bookPlace1'), S('bookPlace2'), S('bookPlace3')], thud: S('wood_hit_01'), step: [S('squeak1'), S('squeak2'), S('squeak3')],
    pop: [S('pop1'), S('pop2'), S('pop3')], voice: [S('weird_02'), S('weird_04'), S('weird_13'), S('weird_16'), S('weird_23')],
    spring: [S('spring_03'), S('spring_04')], grunt: [S('grunt_01'), S('grunt_02'), S('grunt_03')],
    good: [S('SAX00'), S('SAX04')], bad: S('PIZZA03'), fired: S('PIZZA07'), fanfare: S('SAX07'),
  })
  const sfx = (n, o) => Snd.play(n, o)
  let muted = false
  try { muted = localStorage.getItem('oh_mute') === '1' } catch (e) {}
  Snd.setMute(muted)
  function startAudio() { Snd.init(); Snd.loop('amb', S('Clock_ticking'), 0.16); Snd.loop('bgm', S('acoustic_comedy'), 0.2) }

  // ---------- 配置 ----------
  const stage = $('#stage'), room = $('#room'), fx = $('#fx'), rc = room.getContext('2d'), fc = fx.getContext('2d')
  const L = {}
  function setVh() { document.documentElement.style.setProperty('--vh', innerHeight + 'px') }
  function layout() {
    setVh()
    const W = stage.clientWidth || Math.min(innerWidth, 520), H = stage.clientHeight || innerHeight
    L.W = W; L.H = H
    // X のアプリの中は下の帯（--inapp-bot）の分だけ机の上を詰めて、ハンコを帯より上に置く
    const IB = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--inapp-bot')) || 0, HE = H - IB
    L.deskTop = Math.round(HE * (HE < 700 ? 0.6 : 0.61))
    $('#wall').style.height = L.deskTop + 'px'
    $('#desk').style.top = L.deskTop + 'px'
    for (const c of [room, fx]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); c.style.width = W + 'px'; c.style.height = H + 'px' }
    const nw = Math.min(Math.round(W * 0.5), 230)
    Object.assign($('#notice').style, { left: '14px', top: (H < 700 ? 16 : 22) + 'px', width: nw + 'px' })
    Object.assign($('#tally').style, { right: '16px', top: (H < 700 ? 56 : 62) + 'px' })
    L.bodyH = Math.min(H * 0.27, W * 0.5)
    L.cx = W * 0.52; L.by = L.deskTop + L.bodyH * 0.17
    const deskH = HE - L.deskTop, stW = HE < 700 ? 82 : 94
    Object.assign($('#stamps').style, { right: '12px', top: Math.round((deskH - (HE < 700 ? 166 : 190)) / 2 + 6) + 'px', width: stW + 'px' })
    const rw = W - stW - 12 - 12 - 14
    Object.assign($('#resume').style, { left: '12px', top: Math.round(Math.max(18, deskH * 0.1)) + 'px', width: rw + 'px' })
    const pw = Math.round(rw * 0.4), ph = Math.round(pw * 1.22)
    const pc = $('#photo'); pc.width = pw * DPR; pc.height = ph * DPR; pc.style.width = pw + 'px'; pc.style.height = ph + 'px'
    L.pw = pw; L.ph = ph
    if (G.A) drawPhoto()
    const tc = $('#titleCv'); tc.width = Math.round(W * DPR); tc.height = Math.round(H * DPR)
  }
  addEventListener('resize', layout)
  addEventListener('load', layout) // X の印は support.js（後から読む）が付ける

  // ---------- 文言 ----------
  function condLine(c) {
    const C = T().cond
    let txt, mk = 'o'
    if (c.k === 'color') { txt = C[c.v]; mk = c.neg ? 'x' : 'o' }
    else if (c.k === 'eyes') { txt = C.eyes(c.v); mk = c.neg ? 'x' : 'o' }
    else if (c.k === 'shape') { txt = C[c.v]; mk = c.neg ? 'x' : 'o' }
    else if (c.k === 'arms') txt = c.v ? C.armsT : C.armsF
    else if (c.k === 'hat') txt = c.v ? C.hatT : C.hatF
    return { txt, mk }
  }
  function renderNotice(slap) {
    const ul = $('#noticeUl'); ul.innerHTML = ''
    for (const c of G.conds) {
      const { txt, mk } = condLine(c)
      const li = document.createElement('li'); const m = document.createElement('span'); m.className = 'mk ' + mk
      const cv = document.createElement('canvas'), sz = 26; cv.width = sz * DPR; cv.height = sz * DPR; cv.style.width = sz + 'px'; cv.style.height = sz + 'px'
      const x = cv.getContext('2d'); x.scale(DPR, DPR); drawIcon(x, c, sz)
      const sp = document.createElement('span'); sp.textContent = txt
      li.append(m, cv, sp); ul.append(li)
    }
    $('#noticeH').textContent = T().notice
    if (slap) { const n = $('#notice'); n.classList.remove('slap'); void n.offsetWidth; n.classList.add('slap') }
  }
  // 求人票の小さい絵
  function drawIcon(x, c, sz) {
    const base = { shape: 'maru', color: '#D9D2C4', eyes: 0, arms: false, hat: null, eyeStyle: 'ring' }
    if (c.k === 'color') drawChar(x, { ...base, color: c.v }, sz / 2, sz - 2, sz * 0.8)
    else if (c.k === 'shape') drawChar(x, { ...base, shape: c.v }, sz / 2, sz - 2, sz * 0.8)
    else if (c.k === 'eyes') {
      const n = c.v, r = n === 3 ? 4 : 5
      for (let i = 0; i < n; i++) { const ex = sz / 2 + (i - (n - 1) / 2) * r * 2.3; x.beginPath(); x.arc(ex, sz / 2, r, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1.6; x.strokeStyle = INK; x.stroke(); x.beginPath(); x.arc(ex, sz / 2, r * 0.48, 0, Math.PI * 2); x.fillStyle = INK; x.fill() }
    } else if (c.k === 'arms') drawChar(x, { ...base, arms: c.v }, sz / 2, sz - 2, sz * (c.v ? 0.62 : 0.8), { wave: [0.9, 0.9] })
    else if (c.k === 'hat') { const hi = IMG.h_top; if (hi) { const hw = sz * 0.95, hh = hw * hi.height / hi.width; x.drawImage(hi, (sz - hw) / 2, (sz - hh) / 2, hw, hh) } if (!c.v) { x.strokeStyle = '#2F55A4'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(4, sz - 4); x.lineTo(sz - 4, 4); x.stroke() } }
  }
  function nameOf(t, seed) {
    const N = D.names[lang]; if (t.shape === 'box') return N.box
    return N.head[t.shape] + N.tail[seed % N.tail.length]
  }
  function applyLang() {
    const t = T()
    document.documentElement.lang = lang
    $('#t1').textContent = t.title1; $('#t2').textContent = t.title2; $('#t2').hidden = !t.title2; $('#tCatch').textContent = t.catch; $('#tSeal').textContent = t.hire
    $('#bStart').textContent = t.start; $('#bHowT').textContent = t.how
    $('#bestT').textContent = G.best ? `${t.best} ${G.best}${t.persons}` : ''
    $('#bLang').textContent = lang === 'ja' ? 'EN' : 'JA'
    $('#howH').textContent = t.howH; $('#howOl').innerHTML = t.howBody.map(x => `<li>${x}</li>`).join(''); $('#howCr').textContent = t.credit; $('#bHowClose').textContent = t.close
    $('#resH').textContent = t.resume; $('#fName').textContent = t.fName; $('#fSkill').textContent = t.fSkill
    $('#sHire').textContent = t.hire; $('#sNo').textContent = t.reject; $('#tallyL').textContent = t.tally
    $('#loadTxt').textContent = t.loading
    $('#bSave').textContent = t.save; $('#bPost').textContent = t.post; $('#bAgain').textContent = t.again; $('#bTitle').textContent = t.toTitle
    if (G.conds.length) renderNotice(false)
    if (G.A) fillResume()
    updTally()
    if (G.state === 'result') fillResult()
  }

  // ---------- 吹き出し・ヒント ----------
  const bub = $('#bubble'); let bubT = 0
  function say(text, x, y, o = {}) {
    bub.textContent = text; bub.className = 'on' + (o.boss ? ' boss' : '')
    const w = bub.offsetWidth, h = bub.offsetHeight
    let left = clamp(x - 22, 8, L.W - w - 8), top = y - h - 12
    if (top < 8) { top = y + 14; bub.classList.add('down') }
    bub.style.left = left + 'px'; bub.style.top = top + 'px'; bub.style.setProperty('--tx', clamp(x - left - 7, 12, w - 26) + 'px')
    bubT = o.dur || (0.9 + text.length * 0.09)
    if (!o.quiet) sfx('voice', { vol: 0.35, rate: o.boss ? 0.8 : 1 + (o.pitch || 0), jitter: 0.12 })
  }
  function hush() { bub.className = ''; bubT = 0 }
  const hintEl = $('#hint')
  function hint(key, x, y, up) {
    if (!G.tut || G.tutDone[key]) return; G.tutDone[key] = 1
    $('#hintT').textContent = T()[key]; hintEl.hidden = false
    hintEl.style.flexDirection = up ? 'column-reverse' : 'column'; hintEl.querySelector('svg').style.transform = up ? 'rotate(180deg)' : ''
    const w = hintEl.offsetWidth, h = hintEl.offsetHeight
    hintEl.style.left = clamp(x - w / 2, 6, L.W - w - 6) + 'px'; hintEl.style.top = (up ? y + 4 : y - h - 4) + 'px'
    G.hintT = 2.6
  }
  function unhint() { hintEl.hidden = true; G.hintT = 0 }

  // ---------- 1回の流れ ----------
  function newRun() {
    G.seed = G.forceSeed != null ? G.forceSeed : (Date.now() ^ (rnd() * 1e9)) >>> 0
    G.r = LG.rng(G.seed); G.seen = 0; G.score = 0; G.miss = 0; G.hires = []; G.A = null; G.boss = null; G.pest = null; G.run = { bossCame: false }
    G.lastWhy = null; G.confetti = []; G.log = []; G.tutDone = {}
    G.conds = LG.makeConds(0, G.r, null); renderNotice(true); updTally()
    $('#resume').style.visibility = 'hidden'
  }
  function updTally() {
    $('#tallyN').textContent = G.score
    $('#tallyM').textContent = G.miss ? `${T().shimatsu} ${G.miss}` : ''
  }
  function slapTally() { const e = $('#tally'); e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit') }
  function spawn() {
    const app = LG.makeApplicant(G.seen, G.conds, G.r, G.run)
    const r = G.r
    app.name = nameOf(app.t, Math.floor(r() * 1000))
    app.skill = pickR(D.skills[lang]); app.skillI = D.skills[lang].indexOf(app.skill)
    // 自己PR: 外れている所をごまかす嘘を混ぜる（信じると負ける）
    const w = LG.why(app, G.conds), tx = T()
    let pr = pickR(tx.pr)
    if (app.rare === 'box') pr = tx.boxPr
    else if (app.rare === 'niji') pr = tx.nijiPr
    else if (app.rare === 'boss') pr = tx.bossPr
    else if (w && r() < 0.5) {
      if (w.k === 'photo') pr = tx.liePhoto
      else if (w.c.k === 'arms' && w.c.v) pr = tx.lieArms
      else if (w.c.k === 'hat' && w.c.v) pr = tx.lieHat
      else if (w.c.k === 'eyes' && !w.c.neg && w.c.v === 3) pr = tx.lieEyes
      else if (w.c.k === 'color' && !w.c.neg) pr = tx.lieColor
    }
    app.pr = pr
    const pestP = G.seen < 6 || !G.hires.length ? 0 : G.seen < 15 ? 0.3 : 0.45
    G.A = { app, ph: 'in', t: 0, wait: 0, x: L.W * 0.75, said: false, expr: 'normal', blinkT: 1 + rnd() * 2, blink: 0, ano: false, sleep: 0, slept: false,
      pestAt: r() < pestP ? 0.5 + r() * 1.1 : -1, decided: null }
    G.seen++
    fillResume(); drawPhoto()
    const rs = $('#resume'); rs.style.visibility = 'visible'; rs.querySelectorAll('.seal').forEach(e => e.remove()); rs.classList.remove('in'); void rs.offsetWidth; rs.classList.add('in')
    sfx('door', { vol: 0.5 }); sfx('paper', { vol: 0.6, delay: 0.15 })
    setStamps(false)
  }
  function fillResume() { const a = G.A.app; $('#vName').textContent = a.name; $('#vSkill').textContent = D.skills[lang][a.skillI] || a.skill }
  function drawPhoto() {
    const c = $('#photo'), x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, L.pw, L.ph)
    x.fillStyle = '#EAF3F8'; x.fillRect(0, 0, L.pw, L.ph)
    const p = G.A.app.photo, hgt = L.ph * (p.hat ? 0.62 : 0.7)
    drawChar(x, p, L.pw / 2, L.ph * 1.02, hgt, { wave: [0, 0] })
  }
  function setStamps(on) { $('#bHire').disabled = !on; $('#bNo').disabled = !on }
  const canDecide = () => G.state === 'play' && G.A && G.A.ph === 'wait' && !G.boss && !G.A.decided
  function decide(hire) {
    if (!canDecide()) return false
    const A = G.A; A.decided = hire ? 'hire' : 'no'; A.ph = 'stamp'; A.t = 0
    setStamps(false); unhint()
    const btn = hire ? $('#bHire') : $('#bNo'); btn.classList.add('press'); setTimeout(() => btn.classList.remove('press'), 160)
    const seal = document.createElement('div'); seal.className = 'seal pop'; seal.textContent = hire ? T().hire : T().reject
    seal.style.color = hire ? 'var(--red)' : 'var(--indigo)'; seal.style.setProperty('--r', (rnd() * 30 - 15).toFixed(1) + 'deg'); seal.style.transform = `rotate(var(--r))`
    $('#resume').append(seal)
    sfx('stamp', { vol: 0.9 }); sfx('thud', { vol: 0.5 })
    if (G.pest && G.pest.ph !== 'out') shooPest(true)
    return true
  }
  function judge() {
    const A = G.A, app = A.app, hire = A.decided === 'hire', ok = hire === app.ok, tx = T()
    G.log.push({ n: app.n, kind: app.kind, rare: app.rare, ok: app.ok, hire, right: ok })
    if (ok) {
      G.score++; updTally()
      sfx(hire ? 'good' : 'pop', { vol: hire ? 0.55 : 0.5 })
      A.expr = hire ? 'happy' : 'sad'
      let line = hire ? pickR(tx.hired) : app.kind === 'impostor' ? pickR(tx.caught) : pickR(tx.rejected)
      if (app.rare === 'boss') line = hire ? tx.bossRevealHire : tx.bossRevealReject
      sayApp(line)
      if (hire) confetti(L.cx, L.by - L.bodyH * 0.8, 14)
    } else {
      G.miss++; updTally(); slapTally()
      const w = LG.why(app, G.conds)
      let why, rk
      if (!hire) { why = tx.why.good; rk = 'good' } else if (w.k === 'photo') { why = tx.why.photo; rk = 'photo' } else { why = whyCond(w.c); rk = 'cond' }
      G.lastWhy = rk
      A.expr = hire ? 'happy' : 'sad'
      sayApp(hire ? pickR(tx.hired) : pickR(tx.rejected))
      madBoss(why, 0.7)
    }
    A.ph = 'react'; A.t = 0
  }
  function whyCond(c) {
    const W = T().why, C = T().cond
    if (c.k === 'arms') return c.v ? W.armsT : W.armsF
    if (c.k === 'hat') return c.v ? W.hatT : W.hatF
    const word = c.k === 'eyes' ? C.eyes(c.v) : C[c.v]
    return c.neg ? W.neg(word) : W.pos(word)
  }
  function sayApp(text, o = {}) {
    const A = G.A; if (!A) return
    say(text, L.cx + A.x + L.bodyH * 0.25, L.by - L.bodyH * 1.0 - (A.app.t.hat ? L.bodyH * 0.25 : 0), { pitch: A.app.t.shape === 'mame' ? 0.15 : A.app.t.shape === 'shikaku' ? -0.12 : 0, ...o })
  }
  function madBoss(line, delay = 0) { G.boss = { mode: 'mad', t: -delay, line, said: false } }
  function noticeBoss() { G.boss = { mode: 'notice', t: 0, line: pickR(T().newNotice), said: false, slapped: false } }
  function confetti(x, y, n) { for (let i = 0; i < n; i++) G.confetti.push({ x, y, vx: (rnd() - 0.5) * 260, vy: -rnd() * 260 - 80, r: rnd() * 6, c: pickR(['#FFD34D', '#FF9EC4', '#7EC8F0', '#7BD389', '#FF8A3D']), t: 0 }) }

  // ---------- 同僚の邪魔 ----------
  const PEST_KIND = { mame: 'notice', shizuku: 'notice', shikaku: 'photo', box: 'photo', maru: 'face', sankaku: 'face', purin: 'shake' }
  function spawnPest() {
    const who = G.hires[Math.floor(rnd() * G.hires.length)]
    const kind = PEST_KIND[who.shape] || 'face'
    G.pest = { who: { ...who }, kind, ph: 'in', t: 0 }
    sfx(kind === 'photo' ? 'thud' : 'step', { vol: 0.6 })
    if (kind === 'shake') $('#resume').classList.add('shake')
    G.pestHint = G.tut && !G.tutDone.hintPest; hint('hintPest', pestBox().x + pestBox().w / 2, Math.max(70, pestBox().y - 6), false)
  }
  function pestBox() {
    // 邪魔している同僚の画面上の場所（押す所）
    const p = G.pest, n = $('#notice').getBoundingClientRect(), s = stage.getBoundingClientRect(), ph = $('#photoBox').getBoundingClientRect(), rs = $('#resume').getBoundingClientRect()
    if (p.kind === 'notice') return { x: n.left - s.left + n.width * 0.08, y: n.top - s.top + n.height * 0.18, w: n.width * 0.84, h: n.height * 0.75 }
    if (p.kind === 'photo') return { x: ph.left - s.left - 8, y: ph.top - s.top - 10, w: ph.width + 16, h: ph.height + 16 }
    if (p.kind === 'shake') return { x: rs.right - s.left - L.bodyH * 0.42, y: rs.top - s.top - L.bodyH * 0.38, w: L.bodyH * 0.55, h: L.bodyH * 0.5 }
    const H = L.bodyH; return { x: L.cx - H * 0.42, y: L.by - H * 0.92, w: H * 0.84, h: H * 0.62 }
  }
  function shooPest(auto) {
    const p = G.pest; if (!p || p.ph === 'out') return
    p.ph = 'out'; p.t = 0; $('#shoo').hidden = true; $('#resume').classList.remove('shake')
    if (!auto) { sfx('pop', { vol: 0.7 }); const b = pestBox(); say(pickR(T().shoo), b.x + b.w / 2, b.y, { dur: 0.8, quiet: true }); if (G.hintT) unhint() }
  }

  // ---------- 進行（固定 60Hz） ----------
  function step(dt) {
    G.t += dt
    if (bubT > 0) { bubT -= dt; if (bubT <= 0) hush() }
    if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) unhint() }
    for (const c of G.confetti) { c.t += dt; c.vy += 600 * dt; c.x += c.vx * dt; c.y += c.vy * dt }
    G.confetti = G.confetti.filter(c => c.t < 1.6)
    if (G.state !== 'play') return
    const A = G.A, B = G.boss
    // 社長
    if (B) {
      B.t += dt
      if (B.mode === 'notice') {
        if (B.t > 0.05 && !B.said) { B.said = true; sfx('spring', { vol: 0.6 }) }
        if (B.t > 0.45 && !B.slapped) { B.slapped = true; G.conds = LG.makeConds(G.seen, G.r, G.conds); renderNotice(true); sfx('paper', { vol: 0.9 }); sfx('thud', { vol: 0.4 }); say(B.line, L.W * 0.22, L.H - L.bodyH * 1.18, { boss: true, dur: 1.4 }) }
        if (B.t > 1.85) { G.boss = null; spawn() }
      } else {
        if (B.t > 0 && !B.said) {
          B.said = true; sfx('bad', { vol: 0.6 }); sfx('grunt', { vol: 0.8, rate: 0.85 }); const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on')
          say(G.miss >= 2 ? B.line : B.line, L.W * 0.22, L.H - L.bodyH * 1.25, { boss: true, dur: 1.6 })
        }
        if (B.t > 1.9) { G.boss = null; if (G.miss >= 2) return gameOver(); if (!G.A) next() }
      }
    }
    if (!A) return
    A.t += dt
    A.blinkT -= dt; if (A.blinkT < 0) { A.blink = 0.12; A.blinkT = 2 + rnd() * 2.5 }; if (A.blink > 0) A.blink -= dt
    if (A.ph === 'in') {
      const k = ease(A.t / 0.6); A.x = lerp(L.W * 0.75, 0, k)
      if (Math.floor(A.t / 0.2) !== Math.floor((A.t - dt) / 0.2) && A.t < 0.6) sfx('step', { vol: 0.25, rate: 1.1 })
      if (A.t >= 0.6) { A.ph = 'wait'; A.t = 0; A.x = 0; setStamps(true); sayApp(A.app.pr) ; tutHints() }
    } else if (A.ph === 'wait') {
      const sleeping = A.sleep > 0
      if (A.app.rare === 'sleepy' && !A.slept && A.wait > 1.2) { A.slept = true; A.sleep = 2.2; A.expr = 'sleep'; sayApp(T().zzz, { quiet: true }) }
      if (sleeping) { A.sleep -= dt; if (A.sleep <= 0) A.expr = 'normal' }
      if (!B && !sleeping) A.wait += dt
      if (A.pestAt > 0 && !G.pest && A.wait >= A.pestAt) { A.pestAt = -1; spawnPest() }
      const pr = A.wait / A.app.pat
      if (!sleeping) A.expr = pr > 0.55 ? 'sweat' : 'normal'
      if (pr > 0.8 && !A.ano) { A.ano = true; sayApp(T().ano) }
      if (pr >= 1) {   // 待たせすぎ
        A.decided = 'late'; setStamps(false); A.expr = 'sad'; sayApp(T().leave)
        G.miss++; updTally(); slapTally(); G.lastWhy = 'late'; G.log.push({ n: A.app.n, kind: A.app.kind, ok: A.app.ok, late: true, right: false })
        madBoss(T().why.late, 0.8); A.ph = 'react'; A.t = 0
        if (G.pest) shooPest(true)
      }
    } else if (A.ph === 'stamp') {
      if (A.t >= 0.32) judge()
    } else if (A.ph === 'react') {
      if (A.t >= 0.9) { A.ph = 'out'; A.t = 0; sfx('step', { vol: 0.25 }) }
    } else if (A.ph === 'out') {
      const hired = A.decided === 'hire'
      A.x = lerp(0, hired ? -L.W * 0.8 : L.W * 0.8, ease(A.t / 0.5))
      if (A.t >= 0.5) {
        if (hired) G.hires.push({ ...A.app.t }); else sfx('close', { vol: 0.4 })
        $('#resume').style.visibility = 'hidden'
        G.A = null
        if (!G.boss) next()
      }
    }
    // 邪魔の出入り
    const P = G.pest
    if (P) {
      P.t += dt
      if (P.ph === 'in' && P.t >= 0.35) { P.ph = 'stay'; const b = pestBox(), sh = $('#shoo'), m = 64; Object.assign(sh.style, { left: (b.x + b.w / 2 - Math.max(m, b.w) / 2) + 'px', top: (b.y + b.h / 2 - Math.max(m, b.h) / 2) + 'px', width: Math.max(m, b.w) + 'px', height: Math.max(m, b.h) + 'px' }); sh.hidden = false; if (!bubT && !G.pestHint) say(T().pest[P.kind], b.x + b.w / 2, b.y, { dur: 1.1 }) }
      if (P.ph === 'out' && P.t >= 0.3) G.pest = null
    }
  }
  function next() {
    if (G.state !== 'play') return
    if (G.seen > 0 && G.seen % 5 === 0 && G.noticeAt !== G.seen) { G.noticeAt = G.seen; noticeBoss() }
    else spawn()
  }
  function tutHints() {
    if (!G.tut) return
    const s = stage.getBoundingClientRect()
    if (G.seen === 1) {
      const n = $('#notice').getBoundingClientRect(); hint('hintNotice', n.left - s.left + n.width / 2, n.bottom - s.top, true)
      setTimeout(() => { if (G.A && G.A.ph === 'wait' && G.seen === 1) { const b = $('#bHire').getBoundingClientRect(); G.tutDone.hintStamp = 0; hint('hintStamp', b.left - s.left + b.width / 2 - 20, b.top - s.top, false) } }, 2600)
    }
    if (G.A.app.kind === 'impostor' && !G.tutDone.hintPhoto) { const b = $('#photoBox').getBoundingClientRect(); hint('hintPhoto', b.left - s.left + b.width / 2, b.top - s.top - 2, false) }
  }

  // ---------- 描画 ----------
  function render() {
    const W = L.W, H = L.H
    rc.setTransform(DPR, 0, 0, DPR, 0, 0); rc.clearRect(0, 0, W, H)
    fc.setTransform(DPR, 0, 0, DPR, 0, 0); fc.clearRect(0, 0, W, H)
    if (G.state === 'title') return renderTitle()
    if (G.state !== 'play' && G.state !== 'over') return
    // 同僚（後ろに小さく）
    const hs = G.hires.slice(-6), ch = L.bodyH * 0.42
    hs.forEach((h, i) => {
      if (G.pest && G.pest.who && G.pest.ph !== 'out' && i === hs.length - 1 && false) return
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2)
      const x = L.cx + side * (W * 0.36 + k * W * 0.09), y = L.deskTop + ch * 0.3
      drawChar(rc, h, x, y, ch, { t: G.t + i, blink: ((G.t + i * 1.7) % 4) < 0.12, wave: [0, 0], squash: Math.sin(G.t * 2 + i) * 0.015 })
    })
    const A = G.A
    if (A) {
      const hop = A.ph === 'in' || A.ph === 'out' ? Math.abs(Math.sin(A.t * 16)) * L.bodyH * 0.06 : 0
      const talking = bubT > 0 && A.ph !== 'out' && !(G.boss && G.boss.t > 0)
      const look = A.ph === 'wait' ? [Math.sin(G.t * 0.7) * 0.6, 0.2] : [0, 0]
      const wave = A.expr === 'happy' ? [0.95, 0.95] : talking ? [0, 0.55 + 0.35 * Math.sin(A.t * 9)] : [0.05, 0.05]
      drawChar(rc, A.app.t, L.cx + A.x, L.by - hop, L.bodyH, { t: G.t, blink: A.blink > 0, expr: A.expr, look, wave, talk: talking && A.expr === 'normal', squash: Math.sin(G.t * 3) * 0.02 + (A.ph === 'stamp' ? 0.05 : 0) })
    }
    // 邪魔
    const P = G.pest
    if (P) {
      const b = pestBox(), k = P.ph === 'in' ? ease(P.t / 0.35) : P.ph === 'out' ? 1 - ease(P.t / 0.3) : 1
      const s = P.who
      if (P.kind === 'notice') { const hh = b.h * 1.25; drawChar(fc, s, lerp(-W * 0.4, b.x + b.w / 2, k), b.y + b.h * 0.72, hh, { rot: -Math.PI / 2 + Math.sin(G.t * 2) * 0.04, expr: 'sleep', t: G.t }) }
      else if (P.kind === 'photo') { const hh = b.h * 0.9; drawChar(fc, s, b.x + b.w / 2, lerp(-hh, b.y + b.h, k), hh, { expr: 'happy', t: G.t, wave: [0.8, 0.8] }) }
      else if (P.kind === 'shake') { const hh = L.bodyH * 0.5; drawChar(fc, s, lerp(W + hh, b.x + b.w / 2, k), b.y + b.h, hh, { squash: Math.sin(G.t * 30) * 0.08, t: G.t, wave: [0.6, 0.6] }) }
      else { const hh = L.bodyH * 0.62; drawChar(fc, s, lerp(-W * 0.3, b.x + b.w / 2, k), b.y + b.h + hh * 0.2, hh, { expr: 'happy', t: G.t, wave: [0.5 + 0.5 * Math.sin(G.t * 10), 0.5 + 0.5 * Math.cos(G.t * 10)] }) }
    }
    if (P && P.ph === 'stay') { const b = pestBox(), r = Math.max(32, Math.max(b.w, b.h) / 2) + 4 + Math.sin(G.t * 6) * 3; fc.save(); fc.setLineDash([7, 6]); fc.lineWidth = 3; fc.strokeStyle = '#D23B2C'; fc.beginPath(); fc.arc(b.x + b.w / 2, b.y + b.h / 2, r, 0, Math.PI * 2); fc.stroke(); fc.restore() }
    // 社長
    const B = G.boss
    if (B && B.t > 0) {
      const im = IMG[B.mode === 'mad' ? 'boss_mad' : 'boss']
      const dur = 1.9, k = B.t < 0.3 ? ease(B.t / 0.3) : B.t > dur - 0.3 ? 1 - ease((B.t - dur + 0.3) / 0.3) : 1
      if (im) { const bh = L.bodyH * 1.15, bw = bh * im.width / im.height, shake = B.mode === 'mad' ? Math.sin(G.t * 50) * 3 : 0; fc.drawImage(im, W * 0.22 - bw / 2 + shake, H - bh * k * 0.95, bw, bh) }
    }
    for (const c of G.confetti) { fc.save(); fc.translate(c.x, c.y); fc.rotate(c.t * 8 + c.r); fc.fillStyle = c.c; fc.strokeStyle = INK; fc.lineWidth = 1.2; fc.fillRect(-4, -2.5, 8, 5); fc.strokeRect(-4, -2.5, 8, 5); fc.restore() }
  }
  // タイトルの絵（ヘッダーと同じ並び方）
  // タイトル: 面接待ちの列（ドアの前に並ぶ）
  const TITLE_CAST = [
    { s: { shape: 'sankaku', color: 'orange', eyes: 2, eyeStyle: 'dot', arms: true, hat: null }, x: 0.84, kind: 'wave' },
    { s: { shape: 'maru', color: 'pink', eyes: 3, eyeStyle: 'ring', arms: true, hat: 'cone' }, x: 0.63, kind: 'jump' },
    { s: { shape: 'shikaku', color: 'blue', eyes: 2, eyeStyle: 'dot', arms: false, hat: 'top' }, x: 0.43, kind: 'idle' },
    { s: { shape: 'mame', color: 'green', eyes: 2, eyeStyle: 'dot', arms: true, hat: null }, x: 0.18, kind: 'lie' },
  ]
  function renderTitle() {
    const c = $('#titleCv'), x = c.getContext('2d'), W = c.width / DPR, H = c.height / DPR, t = G.t
    x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, W, H)
    const im = IMG.boss; if (im) { const bh = H * 0.14, bw = bh * im.width / im.height, sq = Math.sin(t * 5) * 0.03; x.drawImage(im, W * 0.24 - bw * (1 + sq) / 2, H * 0.29 - bh * (1 - sq), bw * (1 + sq), bh * (1 - sq)) }
    const lineY = H * 0.71, h = Math.min(H * 0.085, W * 0.17)
    x.strokeStyle = 'rgba(43,43,43,.35)'; x.lineWidth = 2; x.setLineDash([2, 7]); x.beginPath(); x.moveTo(W * 0.06, lineY + 3); x.lineTo(W * 0.94, lineY + 3); x.stroke(); x.setLineDash([])
    for (const k of TITLE_CAST) {
      if (k.kind === 'jump') drawChar(x, k.s, W * k.x, lineY - Math.abs(Math.sin(t * 2.4)) * h * 0.25, h, { t, wave: [0.9, 0.6], blink: (t % 3.5) < 0.12 })
      else if (k.kind === 'wave') drawChar(x, k.s, W * k.x, lineY, h, { t, wave: [0.5 + 0.5 * Math.sin(t * 6), 0.5 + 0.5 * Math.sin(t * 6 + 1)] })
      else if (k.kind === 'idle') drawChar(x, k.s, W * k.x, lineY, h * 0.9, { t, expr: 'sweat', look: [-1, 0] })
      else drawChar(x, k.s, W * k.x, lineY - h * 0.05, h * 0.75, { t, rot: -Math.PI / 2, expr: 'sleep', wave: [0, 0.2] })
    }
  }

  // ---------- 画面の切り替え ----------
  function show(id) { for (const v of ['title', 'play', 'result']) $('#' + v).hidden = v !== id; $('#corner').hidden = id === 'result' }
  function toTitle() { G.state = 'title'; show('title'); applyLang() }
  function startGame() {
    startAudio(); sfx('stamp', { vol: 0.7 })
    show('play'); G.state = 'play'; layout(); newRun()
    if (window.TM) TM.start()
    setTimeout(() => { if (G.state === 'play' && !G.A && !G.boss) spawn() }, 350)
  }
  function gameOver() {
    G.state = 'over'; setStamps(false); hush(); unhint(); $('#shoo').hidden = true
    if (window.TM) TM.end(G.score, false)
    G.newBest = G.score > G.best
    if (G.newBest) { G.best = G.score; try { localStorage.setItem('oh_best', G.best) } catch (e) {} }
    try { localStorage.setItem('oh_tut', '1') } catch (e) {}
    G.tut = false
    sfx('fired', { vol: 0.7 }); Snd.duck(0.3, 2)
    setTimeout(() => { G.state = 'result'; show('result'); fillResult(); sfx('stamp', { vol: 0.9, delay: 0.3 }) }, 700)
  }
  const rankOf = n => { let r = ''; for (const [m, s] of T().ranks) if (n >= m) r = s; return r }
  const bossOf = n => { let r = ''; for (const [m, s] of T().bossSays) if (n >= m) r = s; return r }
  function fillResult() {
    const t = T()
    $('#rH').textContent = t.fired; $('#rLead').textContent = t.firedLead
    $('#rReason').textContent = `${t.reasonH}: ${t.reason[G.lastWhy || 'cond']}`
    $('#rHandled').textContent = t.handled; $('#rNum').textContent = G.score; $('#rUnit').textContent = t.persons
    $('#rRank').textContent = rankOf(G.score); $('#rBoss').textContent = bossOf(G.score)
    $('#rTeam').textContent = G.hires.length ? t.team : t.noTeam
    $('#bossSeal').textContent = lang === 'ja' ? '社長' : 'CEO'
    const nb = $('#newBest'); nb.hidden = !G.newBest; nb.textContent = t.newBest
    requestAnimationFrame(drawTeam)
  }
  function drawTeam() {
    const c = $('#teamCv'), w = c.clientWidth, h = c.clientHeight; if (!w || !h) return
    c.width = w * DPR; c.height = h * DPR; const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0)
    teamPhoto(x, w, h)
  }
  function teamPhoto(x, w, h) {
    const list = G.hires.slice(-12)
    if (!list.length) { const im = IMG.box; if (im) { const bh = Math.min(h * 0.6, 120), bw = bh * im.width / im.height; x.globalAlpha = 0.35; x.drawImage(im, w / 2 - bw / 2, h / 2 - bh / 2, bw, bh); x.globalAlpha = 1 } return }
    const rows = list.length > 6 ? 2 : 1, perRow = Math.ceil(list.length / rows)
    const ch = Math.min(h / rows * 0.86, w / perRow * 1.05)
    list.forEach((s, i) => {
      const r = Math.floor(i / perRow), k = i % perRow, cnt = Math.min(perRow, list.length - r * perRow)
      const cx = w / 2 + (k - (cnt - 1) / 2) * (w / perRow) * 0.98
      const rowH = Math.min(h / rows, ch * 1.25), top0 = (h - rowH * rows) / 2, by = top0 + (r + 1) * rowH
      drawChar(x, s, cx, by - ch * 0.04, ch * (s.hat ? 0.8 : 0.9), { expr: 'happy', wave: [0.9, 0.9] })
    })
  }
  // SNS に貼る1枚（1080x1350）
  function shareCanvas() {
    const t = T(), c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d')
    x.fillStyle = '#EFE6D6'; x.fillRect(0, 0, 1080, 1350)
    x.save(); x.translate(540, 675); x.rotate(-0.01); x.fillStyle = '#FFFDF7'; x.fillRect(-470, -610, 940, 1220); x.lineWidth = 5; x.strokeStyle = INK; x.strokeRect(-470, -610, 940, 1220); x.restore()
    const F = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif', HF = '"Yomogi","Hiragino Maru Gothic ProN",cursive'
    x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'alphabetic'
    x.font = `800 64px ${F}`; x.fillText(t.fired, 540, 190)
    x.font = `500 34px ${F}`; x.fillText(t.firedLead, 540, 260)
    x.font = `400 38px ${HF}`; x.fillText(`${t.reasonH}: ${t.reason[G.lastWhy || 'cond']}`, 540, 320)
    x.font = `800 36px ${F}`; x.fillText(t.handled, 540, 400)
    x.font = `800 190px ${F}`; x.fillText(String(G.score), 540, 575)
    const rk = rankOf(G.score); x.font = `800 58px ${F}`; const rw = x.measureText(rk).width
    x.fillStyle = '#FFD34D'; x.fillRect(540 - rw / 2 - 10, 618, rw + 20, 30); x.fillStyle = INK; x.fillText(rk, 540, 650)
    x.font = `800 30px ${F}`; x.globalAlpha = 0.7; x.fillText(G.hires.length ? t.team : t.noTeam, 540, 720); x.globalAlpha = 1
    x.save(); x.translate(110, 740); teamPhoto(x, 860, 380); x.restore()
    // 社長の判
    x.save(); x.translate(900, 200); x.rotate(0.2); x.strokeStyle = '#D23B2C'; x.lineWidth = 7; x.beginPath(); x.arc(0, 0, 70, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#D23B2C'; x.font = `800 40px ${F}`; x.textBaseline = 'middle'; x.fillText(lang === 'ja' ? '社長' : 'CEO', 0, 2); x.restore()
    const bi = IMG.boss; if (bi) { const bh = 150, bw = bh * bi.width / bi.height; x.drawImage(bi, 120, 1160, bw, bh) }
    x.textAlign = 'left'; x.font = `400 40px ${HF}`; x.fillStyle = INK; x.fillText(bossOf(G.score), 120 + 150 * IMG.boss.width / IMG.boss.height + 20, 1250)
    x.textAlign = 'right'; x.font = `800 26px ${F}`; x.globalAlpha = 0.6; x.fillText('tom3games.com', 1000, 1300); x.globalAlpha = 1
    return c
  }
  function saveImage() {
    const c = shareCanvas(), a = document.createElement('a'); a.download = 'odd-hires.png'; a.href = c.toDataURL('image/png'); a.click()
    if (window.TM) TM.share('save')
  }
  function postX() {
    const t = T(), url = 'https://tom3games.com/play/odd-hires/'
    const text = t.shareText(G.score, rankOf(G.score)) + ` #${t.tag}`
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener')
    if (window.TM) TM.share('x')
  }

  // ---------- 入力 ----------
  $('#bStart').addEventListener('click', startGame)
  $('#bAgain').addEventListener('click', startGame)
  $('#bTitle').addEventListener('click', toTitle)
  $('#bHire').addEventListener('click', () => decide(true))
  $('#bNo').addEventListener('click', () => decide(false))
  $('#shoo').addEventListener('click', () => shooPest(false))
  $('#bSave').addEventListener('click', saveImage)
  $('#bPost').addEventListener('click', postX)
  const openHow = () => { $('#how').hidden = false; G.paused = G.state === 'play' }
  $('#bHelp').addEventListener('click', openHow); $('#bHowT').addEventListener('click', openHow)
  $('#bHowClose').addEventListener('click', () => { $('#how').hidden = true; G.paused = false })
  $('#bLang').addEventListener('click', () => { lang = lang === 'ja' ? 'en' : 'ja'; try { localStorage.setItem('oh_lang', lang) } catch (e) {} applyLang() })
  function updMute() { $('#mIcon').setAttribute('d', muted ? 'M4 9v6h4l5 4V5L8 9H4zm11.6 3 2.4-2.4-1.1-1.1-2.4 2.4-2.4-2.4-1.1 1.1 2.4 2.4-2.4 2.4 1.1 1.1 2.4-2.4 2.4 2.4 1.1-1.1z' : 'M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z') }
  $('#bMute').addEventListener('click', () => { muted = !muted; Snd.setMute(muted); try { localStorage.setItem('oh_mute', muted ? '1' : '0') } catch (e) {} updMute() })
  updMute()

  // ---------- ループ ----------
  let last = performance.now(), acc = 0
  function frame() {
    const now = performance.now(); acc += Math.min(0.25, (now - last) / 1000) * G.fast; last = now
    if (G.paused || G.dbgPause) acc = 0
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60 }
    render()
    requestAnimationFrame(frame)
  }

  // ---------- 起動 ----------
  let loaded = 0
  const bar = $('#loadBar i'), total = LIST.length + 1
  const prog = () => { loaded++; bar.style.width = Math.round(loaded / total * 100) + '%' }
  const fontsOk = (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(prog)
  applyLang(); layout()
  const killLoad = () => { const l = $('#loading'); if (!l) return; l.style.opacity = '0'; setTimeout(() => l.remove(), 360) }
  setTimeout(killLoad, 12000)
  Promise.all([loadImages(prog), fontsOk]).then(() => {
    G.state = 'title'; show('title'); layout(); applyLang(); killLoad()
    window.__ohReady = true
    requestAnimationFrame(frame)
    if (/[?&]auto=1/.test(location.search)) autoPlay()
  })

  // iOS シミュレーター確認用（タップを送れないので ?auto=1 で人の速さで自動に遊ぶ。8人目と11人目はわざとまちがえる）
  function autoPlay() {
    let k = 0, busy = false
    setTimeout(startGame, 1500)
    setInterval(() => {
      if (G.state !== 'play' || busy || !canDecide()) return
      busy = true; k++
      if (k === 6) spawnPest()
      setTimeout(() => { if (G.pest) shooPest(false) }, 1400)
      setTimeout(() => { busy = false; if (!canDecide()) return; const ok = G.A.app.ok; decide(k === 8 || k === 11 ? !ok : ok) }, k === 6 ? 2600 : 1800)
    }, 150)
  }

  // ---------- 検証用の窓口 ----------
  window.oh = {
    get state() { return G.state }, get score() { return G.score }, get miss() { return G.miss }, get seen() { return G.seen }, get hires() { return G.hires.length },
    get conds() { return G.conds }, get log() { return G.log }, get lastWhy() { return G.lastWhy },
    cur() { const A = G.A; return A ? { ph: A.ph, ok: A.app.ok, kind: A.app.kind, rare: A.app.rare, t: A.app.t, photo: A.app.photo, wait: A.wait, pat: A.app.pat } : null },
    get boss() { return G.boss && G.boss.mode }, get pest() { return G.pest && { kind: G.pest.kind, ph: G.pest.ph } },
    canDecide, xy(sel) { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } },
    pestXY() { if (!G.pest) return null; const s = stage.getBoundingClientRect(), b = pestBox(); return { x: s.left + b.x + b.w / 2, y: s.top + b.y + b.h / 2 } },
    dbg: { pause(v = true) { G.dbgPause = v }, step(n = 1) { for (let i = 0; i < n; i++) step(1 / 60); render() }, seed(s) { G.forceSeed = s }, fast(v) { G.fast = v ? 4 : 1 }, noTut() { G.tut = false }, spawnPest, G, setConds(c) { G.conds = c; renderNotice(false) }, setApp(t, photo, pr) { const a = G.A.app; a.t = t; a.photo = photo || { ...t }; a.ok = LG.answer(a, G.conds); drawPhoto(); if (pr) sayApp(pr, { dur: 99 }) } },
    bubble: () => bub.classList.contains('on') ? bub.textContent : '', hint: () => hintEl.hidden ? '' : $('#hintT').textContent,
    shareLen: () => shareCanvas().toDataURL('image/png').length,
  }
})()
