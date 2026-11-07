/* ===== ÁUDIO: efeitos e trilha sonora 100% sintetizados (WebAudio) =====
   Trilha: koto (cordas dedilhadas), shakuhachi (flauta), taiko + percussão de samba (surdo, caixa, ganzá).
   Nenhum arquivo de áudio é usado. */
(function(){
const KF = window.KF = window.KF || {};
let ctx = null, master, musicG, sfxG, rev, revG, noiseBuf, trk = null;
let muted = false;
try { muted = localStorage.getItem('kfi_mute') === '1'; } catch (e) {}

const SC = {hira: [0, 2, 3, 7, 8], insen: [0, 1, 5, 7, 10], yo: [0, 2, 4, 7, 9], thai: [0, 2, 4, 7, 9]};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function dchar(c){            // '0'-'9' => 0-9 ; 'a'-'h' => 10-17 ; 'A'-'E' => -1..-5
  if (c >= '0' && c <= '9') return +c;
  if (c >= 'a' && c <= 'h') return c.charCodeAt(0) - 87;
  if (c >= 'A' && c <= 'E') return -(c.charCodeAt(0) - 64);
  return null;
}
function note(root, scale, d){ const s = SC[scale], o = Math.floor(d / 5), i = ((d % 5) + 5) % 5; return root + 12 * o + s[i]; }

/* ---------- primitivas ---------- */
function osc(type, f, t, dur, vol, o){
  o = o || {};
  const os = ctx.createOscillator(), g = ctx.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.glide || dur));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = os;
  if (o.filter) { const fl = ctx.createBiquadFilter(); fl.type = o.filter; fl.frequency.value = o.ff || 2000; fl.Q.value = o.q || 1; os.connect(fl); n = fl; }
  n.connect(g); g.connect(o.dest || sfxG);
  if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(rev); }
  os.start(t); os.stop(t + dur + 0.05);
}
function noise(t, dur, vol, o){
  o = o || {};
  const s = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  s.buffer = noiseBuf; s.loop = true;
  fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q || 0.8;
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(o.dest || sfxG);
  if (o.send) { const r = ctx.createGain(); r.gain.value = o.send; g.connect(r); r.connect(rev); }
  s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
}

/* ---------- instrumentos ---------- */
function koto(f, t, vol, dest){
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(), g2 = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2.004; g2.gain.value = 0.35;
  fl.type = 'lowpass'; fl.Q.value = 2.5; fl.frequency.setValueAtTime(Math.min(9000, f * 9), t); fl.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.3);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest);
  const s = ctx.createGain(); s.gain.value = 0.55; g.connect(s); s.connect(rev);
  o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
}
function shaku(f, t, dur, vol, dest){
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g2 = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = 0.12;
  lfo.frequency.value = 5.2; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.09); g.gain.setValueAtTime(vol, t + Math.max(0.1, dur - 0.14)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
  const s = ctx.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(rev);
  o.start(t); o2.start(t); lfo.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  noise(t, dur, vol * 0.22, {type: 'bandpass', f: f * 2, q: 6, a: 0.08, dest: dest});
}
function bass(f, t, dur, vol, dest){ osc('triangle', f, t, dur, vol, {dest: dest, filter: 'lowpass', ff: 600, a: 0.006}); osc('sine', f / 2, t, dur, vol * 0.7, {dest: dest}); }
function taiko(t, vol, dest, soft){
  osc('sine', soft ? 150 : 170, t, 0.35, vol, {f2: 48, glide: 0.25, dest: dest, send: 0.25});
  noise(t, 0.09, vol * 0.5, {f: 700, dest: dest});
}
function surdo(t, vol, dest){ osc('sine', 95, t, 0.32, vol, {f2: 58, glide: 0.2, dest: dest}); }
function slap(t, vol, dest){ noise(t, 0.09, vol, {type: 'bandpass', f: 2200, q: 1.2, dest: dest}); osc('triangle', 330, t, 0.05, vol * 0.4, {dest: dest}); }
function shake(t, vol, dest){ noise(t, 0.04, vol, {type: 'highpass', f: 6500, dest: dest}); }

/* ---------- efeitos sonoros ---------- */
const SFX = {
  click(t){ osc('triangle', 660, t, 0.07, 0.25); osc('triangle', 990, t + 0.04, 0.08, 0.2); },
  punch(t){ noise(t, 0.09, 0.55, {type: 'bandpass', f: 1500, f2: 400, q: 1}); osc('sine', 190, t, 0.1, 0.7, {f2: 70}); },
  kick(t){ noise(t, 0.16, 0.8, {f: 2400, f2: 250}); osc('sine', 140, t, 0.2, 0.95, {f2: 40}); osc('square', 220, t, 0.05, 0.15, {f2: 90}); },
  whoosh(t){ noise(t, 0.16, 0.22, {type: 'bandpass', f: 500, f2: 2200, q: 1.5, a: 0.06}); },
  hit(t){ SFX.punch(t); },
  heavy(t){ SFX.kick(t); osc('sine', 80, t, 0.35, 0.8, {f2: 30}); noise(t, 0.25, 0.4, {f: 500, f2: 100}); },
  jump(t){ osc('triangle', 280, t, 0.16, 0.25, {f2: 620}); },
  land(t){ noise(t, 0.08, 0.3, {f: 400}); osc('sine', 90, t, 0.1, 0.4, {f2: 50}); },
  hurt(t){ osc('square', 420, t, 0.2, 0.2, {f2: 140, filter: 'lowpass', ff: 1800}); },
  kiai(t){ osc('sawtooth', 420, t, 0.28, 0.32, {f2: 250, filter: 'bandpass', ff: 950, q: 3, a: 0.02, send: 0.15}); osc('sawtooth', 840, t, 0.2, 0.12, {f2: 500, filter: 'bandpass', ff: 1700, q: 4}); },
  ko(t){ osc('triangle', 520, t, 0.45, 0.3, {f2: 90}); noise(t, 0.3, 0.45, {f: 1800, f2: 150}); SFX.kick(t + 0.02); },
  pickup(t){ [660, 880, 1320, 1760].forEach((f, i) => osc('triangle', f, t + i * 0.06, 0.18, 0.28, {send: 0.3})); },
  special(t){ osc('sawtooth', 160, t, 0.5, 0.25, {f2: 1100, filter: 'lowpass', ff: 3000}); taiko(t + 0.02, 0.9, sfxG); SFX.gong(t + 0.05, 0.5); },
  gong(t, v){ v = v || 0.7; [1, 2.76, 5.4, 8.93].forEach((m, i) => osc('sine', 150 * m, t, 2.4 / (i + 1), v / (i + 1.4), {send: 0.5, a: 0.01})); noise(t, 0.4, 0.15 * v, {f: 3000, f2: 400}); },
  whistle(t){ [0, 0.2].forEach(d => { const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 2700; l.frequency.value = 32; lg.gain.value = 90; l.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.3, t + d + 0.02); g.gain.setValueAtTime(0.3, t + d + 0.14); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18); o.connect(g); g.connect(sfxG); o.start(t + d); l.start(t + d); o.stop(t + d + 0.2); l.stop(t + d + 0.2); noise(t + d, 0.16, 0.08, {type: 'highpass', f: 4000}); }); },
  card(t){ noise(t, 0.2, 0.2, {type: 'bandpass', f: 1800, f2: 3200, q: 2, a: 0.05}); },
  ball(t){ osc('sine', 130, t, 0.14, 0.7, {f2: 55}); noise(t, 0.06, 0.3, {f: 900}); },
  deflect(t){ osc('triangle', 880, t, 0.14, 0.35, {f2: 1760}); SFX.kick(t); },
  roar(t){ noise(t, 1.8, 0.35, {type: 'bandpass', f: 700, f2: 1300, q: 0.7, a: 0.5, send: 0.3}); noise(t + 0.2, 1.4, 0.18, {type: 'bandpass', f: 1800, q: 0.6, a: 0.4}); },
  wave(t){ SFX.whistle(t); },
  go(t){ osc('triangle', 520, t, 0.14, 0.3); osc('triangle', 780, t + 0.12, 0.2, 0.3); }
};

/* ---------- trilhas ---------- */
const H = 'hhHhhhHhhhHhhhHh';
const TRACKS = {
  title: {bpm: 74, root: 62, scale: 'hira', bars: [
    {k: '0.2.3.2.0.2.3.5.', l: '5.......7.......', b: '0.......3.......', d: 'X.......x.......', h: ''},
    {k: '5.3.2.3.5.7.5.3.', l: '8.......7...5...', b: '0.......2.......', d: '........x...x...', h: ''},
    {k: '7.5.3.2.3.5.7.8.', l: '5.......3...2...', b: '3.......0.......', d: 'X.......x.......', h: ''},
    {k: '5.3.2.0.2.0.A.0.', l: '0...............', b: '0...............', d: 'X...............', h: ''}]},
  battle1: {bpm: 132, root: 57, scale: 'hira', bars: [
    {k: '0.2.3.2.5.3.2.3.', l: '5...3...2.......', b: '0.0.0.0.0.0.3.3.', d: 'X...s...Xx..s...', h: H},
    {k: '5.3.5.7.5.3.2.0.', l: '7...5...3...2...', b: '0.0.0.0.2.2.3.3.', d: 'X...s...X...s.x.', h: H},
    {k: '7.5.7.8.7.5.3.5.', l: '8...7...5...7...', b: '3.3.3.3.2.2.0.0.', d: 'Xx..s...Xx..s...', h: H},
    {k: '8.7.5.3.5.3.2.0.', l: '8.......5.3.2...', b: '0.0.0.0.3.3.2.2.', d: 'X...s...X.x.sxsx', h: H},
    {k: '0.2.3.2.5.3.2.3.', l: '5.......7.......', b: '0.0.0.0.0.0.3.3.', d: 'X...s...Xx..s...', h: H},
    {k: '5.7.8.7.5.3.2.3.', l: '8...a...8...7...', b: '0.0.0.0.2.2.3.3.', d: 'X...s...X...s.x.', h: H},
    {k: '7.8.7.5.3.5.7.8.', l: 'a.......8...7.5.', b: '3.3.3.3.2.2.0.0.', d: 'Xx..s...Xx..s...', h: H},
    {k: '8.7.5.3.2.3.5.7.', l: '5...3...2...0...', b: '0.0.0.0.3.3.2.2.', d: 'X.x.sxx.X.x.sxsx', h: H}]},
  battle2: {bpm: 144, root: 55, scale: 'insen', bars: [
    {k: '0.1.2.1.0.1.2.3.', l: '3...2...1.......', b: '0.0.0.0.0.0.0.0.', d: 'X...s...X.x.s...', h: H},
    {k: '3.2.3.4.3.2.1.0.', l: '4...3...2...1...', b: '0.0.0.0.1.1.2.2.', d: 'X...s...Xx..s...', h: H},
    {k: '5.4.3.4.5.6.5.4.', l: '5...6...5...3...', b: '2.2.2.2.1.1.0.0.', d: 'X...s.x.X...s...', h: H},
    {k: '4.3.2.1.2.1.0.A.', l: '4.......2.1.0...', b: '0.0.0.0.2.2.1.1.', d: 'X...s...X.x.sxsx', h: H}]},
  battle3: {bpm: 150, root: 53, scale: 'thai', bars: [
    {k: '0.2.4.2.0.2.4.3.', l: '4...2...0.......', b: '0.0.0.0.0.0.0.0.', d: 'X..xs..xX.x.s...', h: H},
    {k: '4.3.4.2.0.2.3.4.', l: '3...4...2...0...', b: '0.0.0.0.2.2.1.1.', d: 'X...s...Xx..s.x.', h: H},
    {k: '5.4.3.4.5.7.5.4.', l: '5...7...5...3...', b: '2.2.2.2.1.1.0.0.', d: 'X.x.s...X...s.x.', h: H},
    {k: '4.2.0.2.4.2.0.A.', l: '4.......2...0...', b: '0.0.0.0.2.2.1.1.', d: 'X...s.x.Xx.xsxsx', h: H}]},
  boss: {bpm: 160, root: 50, scale: 'hira', bars: [
    {k: '0.0.2.0.3.0.2.0.', l: '7.7.5.3.2.......', b: '0.00.00.0.00.00.', d: 'Xx..s.x.Xx..s.x.', h: H},
    {k: '0.0.3.0.5.0.3.0.', l: '8.8.7.5.3.......', b: '0.00.00.3.33.33.', d: 'X...s.x.XxX.s.xx', h: H},
    {k: '5.7.8.7.5.7.8.a.', l: 'a...8...7.5.7...', b: '3.33.33.2.22.22.', d: 'Xx..s...X.xxs.x.', h: H},
    {k: '8.7.5.3.2.3.5.7.', l: '8.7.5.3.2.......', b: '0.00.00.0.00.00.', d: 'XxXxs.xxXxXxsxsx', h: H}]}
};


/* ---------- tema original de cada clube (gerado a partir do id; não são os hinos oficiais) ---------- */
function clubTrack(id){
  let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const scale = pick(['hira', 'yo', 'insen', 'thai', 'yo']), root = 50 + Math.floor(rnd() * 10), bpm = 112 + Math.floor(rnd() * 34);
  const motif = Array.from({length: 4}, () => Math.floor(rnd() * 6));
  const drums = pick(['X..xs..xX.x.s.x.', 'X.x.s.x.X.x.sxsx', 'Xx..s...Xx..s.x.', 'X...sx..X.x.s.xs']);
  const kp = [['0.2.', 0], ['.1.3', 1], ['2.0.', 2], ['3.1.', 3]];
  const bars = [];
  for (let bi = 0; bi < 4; bi++) {
    let k = '', l = '.'.repeat(16), b = '';
    for (let q = 0; q < 4; q++) { const m = motif[(q + bi) % 4], v = (q === 3 && bi % 2) ? m + 2 : m; k += v + '.' + ((m + (q % 2 ? 2 : 1)) % 7) + '.'; }
    l = (motif[bi] + 3) % 8 + '.......' + (motif[(bi + 1) % 4] + 2) % 8 + '.......';
    for (let q = 0; q < 8; q++) b += (q % 4 === 3 ? motif[bi] % 3 : 0) + '.';
    bars.push({k, l, b, d: drums, h: H});
  }
  return {bpm, root, scale, bars};
}

/* ---------- sequenciador ---------- */
let cur = null, bar = 0, step = 0, nextT = 0, timer = null, pending = null;
function schedStep(T, b, s, t, sd){
  const tr = trk, d = (c) => c && c !== '.' ? c : null;
  const k = dchar(b.k[s]);
  if (k !== null) koto(mtof(note(T.root + 12, T.scale, k)), t, 0.16, tr);
  const l = b.l[s];
  if (l && l !== '.' && dchar(l) !== null) {
    let n = 1; while (s + n < 16 && b.l[s + n] === '.') n++;
    shaku(mtof(note(T.root + 24, T.scale, dchar(l))), t, n * sd * 0.96, 0.2, tr);
  }
  const bs = dchar(b.b[s]);
  if (bs !== null) bass(mtof(note(T.root - 12, T.scale, bs)), t, sd * 1.8, 0.4, tr);
  const dr = b.d[s];
  if (dr === 'X') taiko(t, 0.85, tr); else if (dr === 'x') taiko(t, 0.4, tr, true);
  else if (dr === 's') surdo(t, 0.7, tr);
  if (b.h && d(b.h[s])) shake(t, b.h[s] === 'H' ? 0.16 : 0.08, tr);
  if (b.h && T.bpm > 120 && (s === 4 || s === 12)) slap(t, 0.12, tr);
}
function tick(){
  if (!ctx || !cur) return;
  const sd = 60 / cur.bpm / 4;
  while (nextT < ctx.currentTime + 0.18) {
    schedStep(cur, cur.bars[bar], step, nextT, sd);
    nextT += sd; step++;
    if (step >= 16) { step = 0; bar = (bar + 1) % cur.bars.length; }
  }
}

/* ---------- API ---------- */
const A = KF.audio = {
  init(){
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp); comp.connect(ctx.destination);
      musicG = ctx.createGain(); musicG.gain.value = 0.55; musicG.connect(master);
      sfxG = ctx.createGain(); sfxG.gain.value = 0.9; sfxG.connect(master);
      const len = Math.floor(ctx.sampleRate * 1.7), ib = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      rev = ctx.createConvolver(); rev.buffer = ib; revG = ctx.createGain(); revG.gain.value = 0.38; rev.connect(revG); revG.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      A.analyser = ctx.createAnalyser(); A.analyser.fftSize = 512; master.connect(A.analyser);
      if (pending) { const p = pending; pending = null; A.music(p); }
    } catch (e) { ctx = null; }
  },
  get ready(){ return !!ctx; },
  get muted(){ return muted; },
  setMuted(m){
    muted = !!m; try { localStorage.setItem('kfi_mute', muted ? '1' : '0'); } catch (e) {}
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.03);
  },
  sfx(name, a){
    if (!ctx || muted || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.005, a); } catch (e) {}
  },
  music(name){
    if (!ctx) { pending = name; return; }
    if (name && name === A.curName && cur) return;
    A.stopMusic(0.35);
    if (name && name.indexOf('club_') === 0 && !TRACKS[name]) TRACKS[name] = clubTrack(name.slice(5));
    if (!name || !TRACKS[name]) { cur = null; return; }
    cur = TRACKS[name]; bar = 0; step = 0; nextT = ctx.currentTime + 0.25;
    trk = ctx.createGain(); trk.gain.value = 1; trk.connect(musicG);
    clearInterval(timer); timer = setInterval(tick, 30);
    A.curName = name;
  },
  stopMusic(fade){
    clearInterval(timer); timer = null; cur = null; A.curName = null; pending = null;
    if (ctx && trk) {
      const old = trk; trk = null;
      try { old.gain.setTargetAtTime(0, ctx.currentTime, (fade || 0.3) / 3); setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 2500); } catch (e) {}
    }
  },
  jingle(kind){        // vitória / derrota
    if (!ctx) return;
    A.stopMusic(0.2);
    const t = ctx.currentTime + 0.3, g = ctx.createGain(); g.connect(musicG);
    if (kind === 'win') {
      const seq = [0, 2, 4, 5, 7, 9, 8, 9, 12]; const root = 60;
      seq.forEach((d, i) => koto(mtof(note(root, 'yo', d + 0)), t + i * 0.14, 0.2, g));
      shaku(mtof(72), t + 0.2, 1.6, 0.22, g); shaku(mtof(76), t + 0.9, 1.8, 0.22, g);
      SFX.gong(t, 0.7); SFX.roar(t + 0.2);
      [0, 0.28, 0.42].forEach((d, i) => taiko(t + d, 0.8, g));
    } else {
      [4, 3, 1, 0].forEach((d, i) => shaku(mtof(note(57, 'insen', d)), t + i * 0.5, 0.7, 0.22, g));
      SFX.gong(t, 0.5); taiko(t, 0.8, g);
    }
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 6000);
  },
  suspend(){ if (ctx && ctx.state === 'running') ctx.suspend(); },
  resume(){ if (ctx && ctx.state === 'suspended') ctx.resume(); },
  level(){      // 0..1 (para testes)
    if (!A.analyser) return 0;
    const d = new Uint8Array(A.analyser.fftSize); A.analyser.getByteTimeDomainData(d);
    let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i] - 128)); return m / 128;
  }
};
})();
