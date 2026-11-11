/* ===== REDE (cliente): conexão com o servidor de salas e interpolação dos snapshots ===== */
(function(){
const KF = window.KF = window.KF || {};
const N = KF.net = {ws: null, me: 0, live: false, snaps: [], objs: {}, board: [], room: null, ping: 0};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

N.url = function(){
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q.replace(/^http/, 'ws');
  if (location.protocol === 'file:' || !location.host) return null;
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
};
N.connect = function(){
  return new Promise((res, rej) => {
    if (N.ws && N.ws.readyState === 1) return res();
    const url = N.url(); if (!url) return rej(new Error('sem endereço'));
    let ws, done = false;
    try { ws = new WebSocket(url); } catch (e) { return rej(e); }
    N.ws = ws;
    const timer = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} rej(new Error('timeout')); } }, 8000);
    ws.onopen = () => { if (!done) { done = true; clearTimeout(timer); res(); } };
    ws.onerror = () => { if (!done) { done = true; clearTimeout(timer); rej(new Error('erro')); } };
    ws.onclose = () => { const was = N.ws === ws; N.live = false; if (was) { N.ws = null; N.room = null; if (N.onclose) N.onclose(); } };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } handle(m); };
  });
};
N.send = o => { if (N.ws && N.ws.readyState === 1) N.ws.send(JSON.stringify(o)); };
N.close = () => { if (N.ws) { const w = N.ws; N.ws = null; N.room = null; N.live = false; try { w.close(); } catch (e) {} } };

function handle(m){
  switch (m.t) {
    case 'hi': N.me = m.pid; break;
    case 'board': N.board = m.rows || []; if (N.onboard) N.onboard(); break;
    case 'room': N.room = m; if (N.onroom) N.onroom(m); break;
    case 'err': if (N.onerr) N.onerr(m.msg); break;
    case 'err2': if (N.onerr2) N.onerr2(m.msg); break;
    case 'begin': N.snaps = []; N.objs = {}; N.live = false; if (N.onbegin) N.onbegin(m); break;
    case 'snap': {
      N.snaps.push({rt: performance.now(), s: m.s}); if (N.snaps.length > 6) N.snaps.shift();
      if (!N.live) { N.live = true; if (N.onlive) N.onlive(m.s); }
      for (const ev of (m.ev || [])) if (N.onevent) N.onevent(ev);
      break;
    }
    case 'end': N.live = false; if (N.onend) N.onend(m); break;
    case 'pong': N.ping = Math.round(performance.now() - m.ts); break;
  }
}
setInterval(() => { if (N.ws && N.ws.readyState === 1) N.send({t: 'ping', ts: performance.now()}); }, 4000);

/* estado interpolado (85 ms atrás) no mesmo formato que a visão espera */
N.state = function(){
  const sn = N.snaps; if (!sn.length) return null;
  const now = performance.now() - 85;
  let a = sn[0], b = sn[sn.length - 1];
  for (let i = sn.length - 1; i > 0; i--) if (sn[i - 1].rt <= now) { a = sn[i - 1]; b = sn[i]; break; }
  if (sn.length === 1 || now <= sn[0].rt) a = b = sn[0];
  const al = a === b ? 1 : clamp((now - a.rt) / ((b.rt - a.rt) || 1), 0, 1);
  const A = {}; for (const f of a.s.f) A[f.i] = f;
  const ents = [], seen = {};
  for (const f of b.s.f) {
    const p = A[f.i] || f, K = KF.KINDS[f.k] || {};
    const o = N.objs[f.i] || (N.objs[f.i] = {}); seen[f.i] = 1;
    const jump = Math.abs(f.x - p.x) > 140;
    const q = jump ? 1 : al;
    const el = Math.max(0, (now - b.rt) / 1000);
    o.id = f.i; o.kind = f.k; o.club = f.c; o.side = f.s ? 'good' : 'bad'; o.x = lerp(p.x, f.x, q); o.y = lerp(p.y, f.y, q); o.z = lerp(p.z, f.z, q);
    o.face = f.fc; o.st = f.st; o.t = f.t + Math.min(.2, el); o.walkT = f.w + Math.min(.2, el); o.hp = f.hp; o.max = f.mx; o.flash = f.fl ? 1 : 0; o.inv = f.iv ? 1 : 0;
    o.dead = !!f.d; o.fade = f.fd; o.bar = f.b ? 1 : 0; o.pid = f.p; o.n = f.n; o.atk = f.ak ? KF.ATK[f.ak] : null; o.vz = f.vz; o.ally = !!f.al; o.name = f.nm; o.sc = f.sc | 0; o.ak = f.ak || '';
    o.scale = K.scale || 1; o.wide = K.wide || 1;
    if (!o.lk || o.lk[0] !== f.lk[0] || o.lk[1] !== f.lk[1] || o.lk[2] !== f.lk[2]) { o.lk = f.lk; o.look = null; }
    ents.push(o);
  }
  for (const id in N.objs) if (!seen[id]) delete N.objs[id];
  const s = b.s;
  return {ents, proj: s.pr.map(p => ({type: p.t, x: p.x, y: p.y, z: p.z, spin: p.sp, side: p.s ? 'good' : 'bad', deflected: !!p.df})), items: s.it,
    cam: lerp(a.s.cam, s.cam, al), t: performance.now() / 1000, theme: s.pv ? 'dojo' : KF.STAGES[s.si].theme, cA: s.club, cB: s.rival, me: N.me, online: true, pl: s.pl, sc: s.sc, kos: s.kos, si: s.si, pv: s.pv, win: s.win, wi: s.wi, st: s.st};
};

/* predição local do próprio jogador: o movimento aparece na hora (o servidor confirma depois) */
N.pred = {x: 0, y: 0, ok: false}; N.localAtk = null;
N.predict = function(S, dt, ax){
  const me = S.ents.find(e => e.pid === N.me), last = N.snaps[N.snaps.length - 1]; if (!me || !last) return;
  const sf = last.s.f.find(f => f.p === N.me); if (!sf) return;
  const P = N.pred, spd = (KF.SCHOOLS[me.sc | 0] || {spd: 98}).spd, free = sf.st === 'idle' || sf.st === 'walk' || sf.st === 'jump';
  if (!P.ok || !free || Math.abs(sf.x - P.x) > 90 || Math.abs(sf.y - P.y) > 60) { P.x = sf.x; P.y = sf.y; P.ok = true; }
  else {
    const air = sf.st === 'jump', mv = Math.hypot(ax.x, ax.y);
    P.x += ax.x * spd * (air ? .85 : 1) * dt; P.y += ax.y * spd * (air ? .5 : .72) * dt;
    const k = Math.min(1, (mv > .1 ? 1.4 : 7) * dt);
    P.x += (sf.x - P.x) * k; P.y += (sf.y - P.y) * k;
    P.y = clamp(P.y, 172, 254);
  }
  const mfree = me.st === 'idle' || me.st === 'walk';
  if (free) { me.x = P.x; me.y = P.y; if (Math.abs(ax.x) > .25) me.face = ax.x > 0 ? 1 : -1; }
  if (mfree && free) { const mv = Math.hypot(ax.x, ax.y) > .1; me.st = mv ? 'walk' : 'idle'; if (mv) me.walkT = (me.walkT || 0) + dt * 0; }
  const L = N.localAtk;
  if (L) {
    const age = (performance.now() - L.t0) / 1000;
    if (age > .45 || me.st === 'atk' || me.st === 'hurt' || me.st === 'down') N.localAtk = null;
    else if (mfree) { me.st = 'atk'; me.atk = KF.ATK[L.key]; me.t = age; me.n = (me.n | 0) + 1; }
  }
};
})();
