// 遊び方ごとの分布。node sim.mjs  （画面なし。logic.js の判定と応募者づくりをそのまま使う）
// 人の速さの bot: 読むのに 1.0秒＋条件1つ0.6秒＋写真0.8秒（ばらつき）、邪魔をどかすのに1.2秒。見落としは特徴ごとの確率
import { readFileSync } from 'node:fs'
new Function(readFileSync(new URL('./logic.js', import.meta.url), 'utf8'))()
const L = globalThis.OHL
const SEEDS = 12, RUNS = 40
// 見落としやすさ（人が1回見て間違える確率）
const MISS = { color: 0.006, shape: 0.006, hat: 0.012, arms: 0.02, eyes: 0.035 }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()) }
function play(seed, bot) {
  const r = L.rng(seed), br = L.rng(seed * 7 + 3), st = {}
  let conds = L.makeConds(0, r, null), seen = 0, score = 0, miss = 0, hires = 0, time = 0
  const why = []
  while (miss < 2 && seen < 400) {
    if (seen > 0 && seen % 5 === 0) conds = L.makeConds(seen, r, conds)
    const app = L.makeApplicant(seen, conds, r, st); seen++
    const pestP = seen - 1 < 6 || !hires ? 0 : seen - 1 < 15 ? 0.3 : 0.45
    const pest = r() < pestP; if (pest) r(); else r()   // 画面側と同じく乱数を1つ使う
    let hire, t
    if (bot === 'all-hire') { hire = true; t = 0.6 }
    else if (bot === 'all-no') { hire = false; t = 0.6 }
    else if (bot === 'random') { hire = br() < 0.5; t = 0.8 }
    else if (bot === 'perfect') { hire = app.ok; t = 1.2 }
    else if (bot === 'photo-only') { hire = L.same(app.t, app.photo); t = 1.4 }   // 求人票を見ない
    else if (bot === 'notice-only') { hire = conds.every(c => L.sat(app.t, c)); t = 1.4 }   // 写真を見ない
    else {   // human: 見落としつき
      const slow = bot === 'human-slow' ? 1.4 : 1
      t = (1.0 + 0.6 * conds.length + 0.8 + gauss(br) * 0.35) * slow + (pest ? 1.2 : 0)
      let seenOk = conds.every(c => {
        const real = L.sat(app.t, c); return br() < MISS[c.k] ? !real : real
      })
      const k = L.diffKey(app.t, app.photo)
      let photoOk = !k
      if (k && br() < MISS[k] * 2) photoOk = true            // 違いを見落とす
      if (!k && br() < 0.004) photoOk = false               // 同じなのに違うと思う
      hire = seenOk && photoOk
    }
    time += t + 2.2
    if (t > app.pat) { miss++; why.push('late'); continue }
    if (hire === app.ok) { score++; if (hire) hires++ }
    else { miss++; why.push(hire ? app.kind : 'good'); if (hire) hires++ }
  }
  return { score, seen, time, why }
}
const bots = ['human', 'human-slow', 'perfect', 'all-hire', 'all-no', 'random', 'photo-only', 'notice-only']
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))]
for (const bot of bots) {
  const sc = [], tm = [], why = {}
  for (let s = 1; s <= SEEDS * RUNS / 10; s++) { const g = play(s * 9973 + 11, bot); sc.push(g.score); tm.push(g.time); for (const w of g.why) why[w] = (why[w] || 0) + 1 }
  console.log(`${bot.padEnd(12)} 中央値 ${String(q(sc, 0.5)).padStart(3)}  25% ${String(q(sc, 0.25)).padStart(3)}  75% ${String(q(sc, 0.75)).padStart(3)}  最大 ${String(Math.max(...sc)).padStart(3)}  時間中央 ${Math.round(q(tm, 0.5))}秒  まちがい内訳 ${JSON.stringify(why)}`)
}
// 同じ種なら同じ応募者（再現性）
const a = L.makeApplicant(5, L.makeConds(5, L.rng(1), null), L.rng(42)), b = L.makeApplicant(5, L.makeConds(5, L.rng(1), null), L.rng(42))
console.log('再現性', JSON.stringify(a.t) === JSON.stringify(b.t) && a.ok === b.ok)
// 正解の割合（採用すべき子の比率）
let okN = 0, imp = 0, N = 0; for (let s = 1; s < 200; s++) { const r = L.rng(s), st = {}; let c = L.makeConds(0, r, null); for (let n = 0; n < 40; n++) { if (n && n % 5 === 0) c = L.makeConds(n, r, c); const ap = L.makeApplicant(n, c, r, st); N++; okN += ap.ok; imp += ap.kind === 'impostor' } }
console.log(`採用すべき子 ${(okN / N * 100).toFixed(0)}%  替え玉 ${(imp / N * 100).toFixed(0)}%`)
