// 判定と応募者づくり（画面に関係しない部分）。ブラウザでは window.OHL、node では globalThis.OHL（sim.mjs が使う）
;(function (G) {
  const SHAPES = ['maru', 'sankaku', 'shikaku', 'purin', 'mame', 'shizuku']
  const COLORS = ['yellow', 'blue', 'pink', 'green', 'orange']
  const HATS = ['cone', 'top', 'knit']
  const KEYS = ['color', 'eyes', 'arms', 'hat', 'shape']

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const pick = (r, a) => a[Math.floor(r() * a.length)]
  const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

  function randTraits(r) {
    return { shape: pick(r, SHAPES), color: pick(r, COLORS), eyes: 1 + Math.floor(r() * 3), arms: r() < 0.5, hat: r() < 0.45 ? pick(r, HATS) : null, eyeStyle: r() < 0.55 ? 'ring' : 'dot' }
  }
  const shapeOf = t => (t.shape === 'box' ? 'shikaku' : t.shape)
  // 1つの条件を満たすか
  function sat(t, c) {
    switch (c.k) {
      case 'color': return (t.color === c.v) !== !!c.neg
      case 'eyes': return (t.eyes === c.v) !== !!c.neg
      case 'shape': return (shapeOf(t) === c.v) !== !!c.neg
      case 'arms': return t.arms === c.v
      case 'hat': return !!t.hat === c.v
    }
    return true
  }
  const others = (a, v) => a.filter(x => x !== v)
  function satisfy(t, c, r) {
    if (sat(t, c)) return
    if (c.k === 'color') t.color = c.neg ? pick(r, others(COLORS, c.v)) : c.v
    else if (c.k === 'eyes') t.eyes = c.neg ? pick(r, others([1, 2, 3], c.v)) : c.v
    else if (c.k === 'shape') t.shape = c.neg ? pick(r, others(SHAPES, c.v)) : c.v
    else if (c.k === 'arms') t.arms = c.v
    else if (c.k === 'hat') t.hat = c.v ? pick(r, HATS) : null
  }
  // わざと1つだけ外す（近い外し方: 目は1つ違い）
  function violate(t, c, r) {
    if (c.k === 'color') t.color = c.neg ? c.v : pick(r, others(COLORS, c.v))
    else if (c.k === 'eyes') t.eyes = c.neg ? c.v : (c.v === 2 ? pick(r, [1, 3]) : 2)
    else if (c.k === 'shape') t.shape = c.neg ? c.v : pick(r, others(SHAPES, c.v))
    else if (c.k === 'arms') t.arms = !c.v
    else if (c.k === 'hat') t.hat = c.v ? null : pick(r, HATS)
  }
  // 写真だけ1か所変える（替え玉）
  function mutate(p, key, r) {
    if (key === 'color') p.color = pick(r, others(COLORS, p.color))
    else if (key === 'shape') p.shape = pick(r, others(SHAPES, p.shape))
    else if (key === 'eyes') p.eyes = p.eyes === 2 ? pick(r, [1, 3]) : 2
    else if (key === 'arms') p.arms = !p.arms
    else if (key === 'hat') p.hat = p.hat ? null : pick(r, HATS)
  }
  const same = (a, b) => a.shape === b.shape && a.color === b.color && a.eyes === b.eyes && a.arms === b.arms && (a.hat || null) === (b.hat || null) && !!a.mustache === !!b.mustache
  function diffKey(a, b) { for (const k of ['shape', 'color', 'eyes', 'arms', 'hat']) if ((a[k] || null) !== (b[k] || null)) return k; return null }
  // 正解（採用すべきか）。ここが唯一の正本。画面も bot もこれを使う
  function answer(app, conds) { return same(app.t, app.photo) && conds.every(c => sat(app.t, c)) }
  function why(app, conds) {
    if (!same(app.t, app.photo)) return { k: 'photo', key: diffKey(app.t, app.photo) }
    const c = conds.find(c => !sat(app.t, c)); return c ? { k: 'cond', c } : null
  }

  // 求人票。n=さばいた人数。前回と同じ組み合わせにしない
  function makeConds(n, r, prev) {
    const cnt = n < 5 ? 1 : n < 12 ? 2 : n < 25 ? 3 : 4
    const pool = n < 5 ? ['color', 'hat', 'arms'] : KEYS
    let keys
    for (let i = 0; i < 8; i++) { keys = shuffle(r, pool).slice(0, cnt); if (!prev || keys.join() !== prev.map(c => c.k).join()) break }
    return keys.map(k => {
      if (k === 'color') return { k, v: pick(r, COLORS), neg: n >= 5 && r() < 0.3 }
      if (k === 'eyes') return { k, v: 1 + Math.floor(r() * 3), neg: r() < 0.3 }
      if (k === 'shape') return { k, v: pick(r, SHAPES), neg: r() < 0.5 }
      return { k, v: r() < 0.5 }
    })
  }

  // 待てる秒数
  const patience = n => Math.max(5.6, 13 - n * 0.2)

  // 応募者。st は走行中の状態（社長の変装は1回だけ など）
  function makeApplicant(n, conds, r, st = {}) {
    let kind; const x = r()
    if (n === 3) kind = 'impostor'   // 最初の替え玉は4人目に必ず（教える）
    else if (n >= 3 && x < (n < 15 ? 0.2 : 0.28)) kind = 'impostor'
    else if (x < 0.62) kind = 'match'
    else kind = 'miss'
    let t = randTraits(r), rare = null
    if (n >= 4 && n !== 3 && r() < 0.11) {
      const opts = ['box', 'sleepy']
      if (!conds.some(c => c.k === 'color')) opts.push('niji')
      if (!st.bossCame && n >= 8) opts.push('boss')
      rare = pick(r, opts)
    }
    if (rare === 'box') t = { shape: 'box', color: 'card', eyes: 0, arms: false, hat: null, eyeStyle: 'dot' }
    else if (rare === 'boss') { t = { shape: 'purin', color: 'yellow', eyes: 1, arms: true, hat: 'top', eyeStyle: 'ring', mustache: true }; st.bossCame = true }
    else {
      conds.forEach(c => satisfy(t, c, r))
      if (kind === 'miss') violate(t, pick(r, conds), r)
      if (rare === 'niji') t.color = 'niji'
    }
    const photo = { ...t }
    if (kind === 'impostor' && !rare) {
      const keys = n < 10 ? ['color', 'shape'] : n < 20 ? ['color', 'shape', 'hat', 'arms', 'eyes'] : ['eyes', 'hat', 'arms', 'eyes', 'color']
      mutate(photo, pick(r, keys), r)
    }
    const app = { t, photo, rare, n, pat: patience(n) }
    app.ok = answer(app, conds)
    app.kind = !same(t, photo) ? 'impostor' : app.ok ? 'match' : 'miss'
    return app
  }

  G.OHL = { SHAPES, COLORS, HATS, KEYS, rng, pick, shuffle, sat, same, diffKey, answer, why, makeConds, makeApplicant, patience }
})(typeof window !== 'undefined' ? window : globalThis)
