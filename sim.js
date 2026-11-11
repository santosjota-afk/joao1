/* ===== SIMULAÇÃO: combate, IA, ondas, chefe, câmera, jogadores =====
   Sem DOM, sem áudio, sem desenho. Roda no navegador (modo solo) e no servidor (salas online).
   Tudo que o jogador deve ver/ouvir sai como "eventos" (G.drain()). */
(function(root){
const KF = root.KF = root.KF || {};
const YMIN = 172, YMAX = 254, GRAV = 760;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sgn = v => v < 0 ? -1 : 1;
const PRESS = {punch: 1, kick: 1, jump: 1, special: 1};

KF.createGame = function(){
  let uid = 0, events = [];
  const E = (...a) => events.push(a);
  const G = {state: 'idle', ents: [], proj: [], items: [], players: [], cam: 0, camMin: 0, VW: 480, t: 0, score: 0, kos: 0, maxCombo: 0, hitstop: 0, shake: 0, go: false, wi: 0, si: 0, nP: 1, mp: false, queue: [], waveActive: false, reported: false, hitsTaken: 0};
  G.drain = () => { const e = events; events = []; return e; };
  const spark = (x, y, big) => E('spark', x, y, big ? 1 : 0);
  const dust = (x, y, n) => E('dust', x, y, n);
  const popText = (x, y, txt, col, size) => E('text', x, y, txt, col || '#fff', size || 13);
  const byPid = pid => G.players.find(p => p.pid === pid);

  /* ---------- criação ---------- */
  function mk(kind, club, side, x, y){
    const K = KF.KINDS[kind];
    const f = {id: ++uid, kind, K, club, side, x, y, z: 0, vx: 0, vy: 0, vz: 0, face: side === 'good' ? 1 : -1, st: 'idle', t: 0, walkT: 0,
      hp: K.hp, max: K.hp, spd: K.spd, scale: K.scale || 1, wide: K.wide || 1, atk: null, atkKey: null, inv: 0, flash: 0, cool: rand(.3, 1), tok: false, tgt: null, tgtT: 0,
      lk: [Math.floor(rand(0, 5)), Math.floor(rand(0, 6)), K.hair ? KF.STYLES.indexOf(K.hair) : (club === 'ref' ? 4 : pick([0, 0, 1, 2, 3]))],
      didHit: false, hitSet: null, queue: false, n: 0, dead: false, fade: 0, lie: 0, landed: false, bar: 0, poise: 0,
      pref: Math.random() < .55, boss: !!K.boss, armor: !!K.armor, entered: false, wy: rand(-20, 20), wyT: 0, rep: 0, mt: 0};
    G.ents.push(f); return f;
  }
  G.addPlayer = function(pid, name, idx, sc, lk, club){
    const p = mk('player', KF.CLUBS[club] && club !== 'ref' ? club : G.club, 'good', 60 + (idx || 0) * 10, 196 + ((idx || 0) % 4) * 17);
    const SC = KF.SCHOOLS[Math.max(0, KF.SCHOOL_IDS.indexOf(sc))]; p.sc = SC; p.scI = KF.SCHOOLS.indexOf(SC);
    p.hp = p.max = SC.hp; p.spd = SC.spd;
    p.pid = pid; p.isPlayer = true; p.name = name || 'Mestre'; p.lives = 3; p.ki = 20; p.pts = 0; p.combo = 0; p.comboT = 0; p.out = false;
    p.inp = {x: 0, y: 0, p: {}};
    p.lk = Array.isArray(lk) && lk.length === 3 ? [clamp(lk[0] | 0, 0, 4), clamp(lk[1] | 0, 0, 5), clamp(lk[2] | 0, 0, 4)] : [(pid * 2) % 5, (pid * 3 + 1) % 6, [1, 2, 0, 3, 1, 0][pid % 6]];
    G.players.push(p); return p;
  };
  G.setAxis = (pid, x, y) => { const p = byPid(pid); if (p) { p.inp.x = clamp(+x || 0, -1, 1); p.inp.y = clamp(+y || 0, -1, 1); } };
  G.press = (pid, n) => { const p = byPid(pid); if (p && PRESS[n]) p.inp.p[n] = G.t; };
  const take = (f, n) => { const t = f.inp.p[n]; if (t !== undefined && G.t - t < .19) { delete f.inp.p[n]; return true; } return false; };

  /* o: {players:[{pid,name}], carry:{score,ki}, mp:bool} */
  G.start = function(si, club, rival, o){
    o = o || {}; const st = KF.STAGES[si];
    G.pvp = o.pvp || null; G.winner = ''; G.winClub = ''; G.pt = 0;
    G.stage = G.pvp ? {id: 0, name: 'ARENA DA ILHA', theme: 'dojo', len: G.VW || 440, waves: [], cap: 0, tokens: 0, allies: 0, music: 'battle3', intro: '', tip: ''} : st;
    G.si = si; G.club = club; G.rival = rival || KF.rivalOf(club); G.mp = !!o.mp; G.state = 'play';
    G.ents = []; G.proj = []; G.items = []; G.players = []; G.queue = []; events = [];
    G.t = 0; G.cam = 0; G.camMin = 0; G.wi = 0; G.waveActive = false; G.go = false; G.clearT = 0; G.reported = false;
    G.score = o.carry ? o.carry.score : 0; G.kos = 0; G.maxCombo = 0; G.hitstop = 0; G.shake = 0; G.startScore = G.score; G.hitsTaken = 0;
    const pls = o.players && o.players.length ? o.players : [{pid: 1, name: 'Você'}];
    G.nP = pls.length;
    pls.forEach((pl, i) => { const p = G.addPlayer(pl.pid, pl.name, i, pl.sc, pl.lk, pl.club); if (o.carry && o.carry.ki != null && !G.mp) p.ki = o.carry.ki; });
    G.player = G.players[0];
    if (G.pvp) {
      const ps = G.players, VW = G.VW || 440;
      G.club = ps[0].club; G.rival = (ps.find(p => p.club !== ps[0].club) || {club: G.rival}).club;
      const groups = G.pvp === 'teams' ? [...new Set(ps.map(p => p.club))].map(c => ps.filter(p => p.club === c)) : ps.map(p => [p]);
      groups.forEach((gr, k) => { const bx = 50 + (groups.length > 1 ? k * (VW - 100) / (groups.length - 1) : (VW - 100) / 2); gr.forEach((p, j) => { p.x = bx + (j % 2) * 18; p.y = 196 + ((j + k) % 4) * 16; p.face = bx < VW / 2 ? 1 : -1; p.lives = 2; }); });
    }
    const nAllies = G.pvp ? 0 : G.mp ? (st.truce ? 2 : 0) : st.allies;
    for (let i = 0; i < nAllies; i++) {
      const c = st.truce && i % 2 === 1 ? G.rival : club;
      const a = mk('ally', c, 'good', 36 + i * 22, 190 + i * 28); a.entered = true; a.ally = true;
    }
    E('music', G.stage.music);
    E('banner', G.pvp ? (G.pvp === 'teams' ? 'TIME × TIME!' : 'TODOS CONTRA TODOS!') : 'FASE ' + st.id + ' — ' + st.name.toUpperCase(), 1900);
  };

  /* ---------- utilidades ---------- */
  function wAt(i){ const w = G.stage.waves[i].at; return w < 0 ? G.stage.len - G.VW : Math.min(w, G.stage.len - G.VW); }
  function aliveEnemies(){ let n = 0; for (const e of G.ents) if (e.side === 'bad' && !e.dead) n++; return n; }
  const cap = () => G.stage.cap + Math.floor((G.nP - 1) * 1.6);
  const tokens = () => G.stage.tokens + Math.floor((G.nP - 1) * .8);
  const livePlayers = () => G.players.filter(p => !p.out);

  /* ---------- ataques ---------- */
  const fxCol = f => f.isPlayer && f.sc ? f.sc.col : ((KF.CLUBS[f.club] || {}).glow || '#fff');
  function slashFx(f, a){
    E('slash', Math.round(f.x), Math.round(f.y - f.z), f.face, f.atkKey || '', fxCol(f), f.isPlayer && f.sc ? KF.SCHOOLS.indexOf(f.sc) : -1, f.isPlayer ? 1 : 0, a.rng | 0);
  }
  function startAtk(f, key){
    const a = KF.ATK[key];
    f.atk = a; f.atkKey = key; f.st = 'atk'; f.t = 0; f.didHit = false; f.hitSet = new Set(); f.queue = false; f.n++; f.mt = 0;
    if (a.air) f.vz = Math.max(f.vz, 40);
    else if (a.lunge) f.vx = f.face * a.lunge;
    if (a.inv) f.inv = a.su + a.ac + .05;
    if (a.dashV) f.dashY = f.tgt ? f.tgt.y : f.y;
    if (a.sfx === 'special' || a.sfx === 'whistle') E('sfx', a.sfx);
    else if (a.pose !== 'throw') E('sfx', 'whoosh');
    if (f.isPlayer && (key === 'kick' || key === 'p3')) E('sfx', 'kiai');
    if (f.isPlayer && key === 'spin') {
      E('ring', f.x, f.y, f.sc ? f.sc.col : KF.CLUBS[f.club].glow, 130, .5);
      E('special', Math.round(f.x), Math.round(f.y - f.z), f.sc ? KF.SCHOOLS.indexOf(f.sc) : 0);
      popText(f.x, f.y - f.z - 92, f.sc.spMark, f.sc.col, 34); E('shake', 3);
    }
  }
  function schoolMul(f, key){
    const S = f.sc; if (!S) return 1;
    return key === 'p1' || key === 'p2' || key === 'p3' ? S.pu : key === 'kick' ? S.ki : key === 'jkick' ? S.ju : key === 'spin' ? S.spm : 1;
  }
  function endAtk(f){
    const key = f.atkKey, K = f.K; f.atk = null;
    if (f.st === 'atk') f.st = 'idle';
    if (f.isPlayer) return;
    if (f.rep > 0) { f.rep--; startAtk(f, key); return; }
    f.tok = false;
    if (K.boss) f.cool = f.hp < f.max * .5 ? rand(.5, 1) : rand(1, 1.8);
    else if (K.cd) f.cool = rand(K.cd[0], K.cd[1]);
    else f.cool = rand(.4, .9);
  }
  function spawnProj(f, type){
    const T = f.tgt, dir = f.face, spd = type === 'ball' ? 195 : type === 'yel' ? 235 : 270;
    let vy = 0;
    if (T && type !== 'ball') { const d = Math.max(30, Math.abs(T.x - f.x)); vy = clamp((T.y - f.y) / d * spd, -50, 50); }
    G.proj.push({type, x: f.x + dir * 18 * f.scale, y: f.y, z: type === 'ball' ? 12 : 26, vx: dir * spd, vy, side: f.side, ownerPid: null, life: 3.2, spin: 0,
      dmg: type === 'ball' ? 8 : type === 'yel' ? 9 : 16, deflected: false});
    E('sfx', type === 'ball' ? 'ball' : 'card');
  }

  function isFoe(f, t){
    if (G.pvp) return t !== f && !!t.isPlayer && (G.pvp === 'ffa' || t.club !== f.club);
    return t.side === (f.side === 'good' ? 'bad' : 'good');
  }
  function strike(f, a){
    if (G.pvp && G.state !== 'play') return;
    for (const t of G.ents) {
      if (!isFoe(f, t) || t.dead || t.st === 'down' || t.st === 'getup' || f.hitSet.has(t)) continue;
      const dx = t.x - f.x;
      const inX = a.around ? Math.abs(dx) <= a.rng + 6 * t.scale : (dx * f.face >= -8 && dx * f.face <= a.rng + 7 * t.scale);
      if (!inX || Math.abs(t.y - f.y) > a.dy || Math.abs(t.z - f.z) > 38) continue;
      f.hitSet.add(t); damage(t, Math.round(a.dmg * (f.K.dm || 1) * schoolMul(f, f.atkKey) * (G.pvp ? .7 : 1)), f, a);
    }
    if (f.side === 'good') for (const p of G.proj) {      // devolver bolas e cartões
      if (p.side === 'good') continue;
      const dx = p.x - f.x;
      if ((a.around ? Math.abs(dx) < a.rng : (dx * f.face > -8 && dx * f.face < a.rng + 12)) && Math.abs(p.y - f.y) < 22 && Math.abs(p.z - f.z) < 46) {
        p.side = 'good'; p.ownerPid = f.isPlayer ? f.pid : null; p.deflected = true; p.vx = -p.vx * 1.35; p.vy *= -1; p.life = 3; p.dmg *= 1.7;
        if (a.around) p.vx = sgn(dx) * Math.abs(p.vx);
        E('sfx', 'deflect'); spark(p.x, p.y - p.z, 1); popText(p.x, p.y - p.z - 14, 'DEVOLVEU!', '#ffe14d', 12);
        if (f.isPlayer) { G.score += 50; f.pts += 50; f.ki = Math.min(100, f.ki + 8); }
      }
    }
  }

  function damage(t, dmg, src, att){
    if (t.inv > 0 || t.dead) return false;
    t.hp = Math.max(0, t.hp - dmg); t.flash = .09; t.bar = 2.2;
    const dir = (t.x - src.x) === 0 ? src.face : sgn(t.x - src.x);
    const kill = t.hp <= 0, heavy = kill || att.down;
    const cy = t.y - t.z - 28 * t.scale;
    spark(t.x - dir * 3, cy, heavy);
    E('burst', Math.round(t.x - dir * 3), Math.round(cy), dir, heavy ? 1 : 0, fxCol(src));
    E('sfx', heavy ? 'heavy' : 'hit');
    G.hitstop = Math.max(G.hitstop, kill && t.boss ? .35 : heavy ? .085 : .05);
    E('shake', heavy ? 5 : 2.2);
    if (heavy && Math.random() < .5) popText(t.x, cy - 14, pick(['POW!', 'BAM!', 'HAI!', 'DON!', 'ORA!']), '#ffec7a', 14);
    const cr = src.pid != null ? byPid(src.pid) : null;
    if (cr) {
      cr.combo++; cr.comboT = 1.7; G.maxCombo = Math.max(G.maxCombo, cr.combo);
      const pts = 10 + Math.min(cr.combo, 20) * 2; G.score += pts; cr.pts += pts;
      cr.ki = Math.min(100, cr.ki + (heavy ? 9 : 5) * (cr.sc ? cr.sc.kg : 1));
    }
    if (t.isPlayer) { E('sfx', 'hurt'); E('buzz', t.pid, heavy ? 70 : 30); G.hitsTaken++; t.combo = 0; }
    if (!t.isPlayer && t.side === 'bad') { t.tok = false; if (!t.atk) t.cool = Math.max(t.cool, rand(.3, .7)); }
    if (kill) {
      t.dead = true; t.hp = 0; knockdown(t, dir, att.kb * 1.1, 200);
      E('sfx', 'ko');
      if (G.pvp && cr && t.isPlayer && cr !== t) { cr.pts += 300; G.score += 300; G.kos++; popText(t.x, cy - 26, 'NOCAUTE!', '#ffd23a', 16); }
      if (t.side === 'bad') {
        G.kos++; const sc = t.K.score || 100; G.score += sc; if (cr) cr.pts += sc;
        popText(t.x, cy - 26, t.boss ? 'GOOOOL!' : pick(['GOL!', 'GOL!', 'GOLAÇO!']), '#ffd23a', t.boss ? 20 : 15);
        if (!t.boss && Math.random() < .15) G.items.push({type: 'pastel', x: t.x, y: t.y});
        if (t.boss) { E('sfx', 'roar'); E('sfx', 'gong'); E('flash', '#fff6d0', .55); }
      }
      return true;
    }
    if (t.armor) {
      t.poise += dmg; t.vx += dir * 28;
      if (att.down && t.poise >= (t.boss ? 90 : 34)) { t.poise = 0; knockdown(t, dir, att.kb, 150); return true; }
      if (t.st === 'idle' || t.st === 'walk') { t.st = 'hurt'; t.t = 0; t.stun = .12; }
      return true;
    }
    if (att.down) knockdown(t, dir, att.kb, 150);
    else { t.st = 'hurt'; t.t = 0; t.stun = att.stun || .28; t.vx = dir * att.kb; t.atk = null; t.face = -dir; }
    return true;
  }
  function knockdown(t, dir, kb, vz){
    t.st = 'down'; t.t = 0; t.vz = vz; t.vx = dir * kb; t.landed = false; t.lie = 0; t.atk = null; t.face = -dir; t.tok = false; t.rep = 0;
  }

  /* ---------- movimento / IA ---------- */
  function moveTo(f, tx, ty, spd, dt){
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d < 2.5) { if (f.st === 'walk') f.st = 'idle'; return true; }
    const s = Math.min(spd * dt, d);
    f.x += dx / d * s; f.y += dy / d * s * .75; f.st = 'walk'; f.walkT += dt; return false;
  }
  function pickTarget(f){
    let best = null, bd = 1e9;
    for (const e of G.ents) {
      if (e.side === f.side || e.dead || e.st === 'down' || e.st === 'getup') continue;
      let d = Math.abs(e.x - f.x) + Math.abs(e.y - f.y) * 1.5;
      if (f.side === 'bad' && f.pref && e.isPlayer) d -= 150 + (e.pid % 3) * 60;
      if (f.side === 'good' && d > 420) continue;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function nearestPlayer(f){
    let b = null, bd = 1e9; for (const p of G.players) { if (p.out || p.dead) continue; const d = Math.abs(p.x - f.x); if (d < bd) { bd = d; b = p; } }
    return b || G.players[0];
  }
  function tokenFree(){ let n = 0; for (const e of G.ents) if (e.side === 'bad' && e.tok && !e.dead) n++; return n < tokens(); }

  function ai(f, dt){
    const K = f.K;
    f.tgtT -= dt; f.cool -= dt;
    if (f.tgtT <= 0 || !f.tgt || f.tgt.dead || f.tgt.st === 'down' || f.tgt.st === 'getup') { f.tgt = pickTarget(f); f.tgtT = rand(.6, 1.2); }
    const T = f.tgt, P = nearestPlayer(f);
    if (!f.entered && f.side === 'bad') {
      moveTo(f, f.x < G.cam + G.VW / 2 ? G.cam + 40 : G.cam + G.VW - 40, f.y, f.spd * 1.1, dt);
      if (f.x > G.cam + 18 && f.x < G.cam + G.VW - 18) f.entered = true;
      f.face = f.x < G.cam + G.VW / 2 ? 1 : -1; return;
    }
    if (!T) {
      if (f.side === 'good' && P) {
        const tx = P.x + (f.id % 2 ? -52 : 46), ty = P.y + ((f.id % 3) - 1) * 24;
        if (Math.abs(tx - f.x) > 14 || Math.abs(ty - f.y) > 10) { moveTo(f, tx, ty, f.spd * (Math.abs(tx - f.x) > 120 ? 1.4 : .9), dt); f.face = tx > f.x ? 1 : -1; }
        else { f.st = 'idle'; f.face = P.x >= f.x ? 1 : -1; }
      } else f.st = 'idle';
      return;
    }
    const dx = T.x - f.x, dy = T.y - f.y, adx = Math.abs(dx), ady = Math.abs(dy);
    if (K.boss) return bossAI(f, dt, T, dx, dy, adx, ady);
    f.face = dx >= 0 ? 1 : -1;
    if (K.ranged) {
      const sx = G.cam;
      if (adx < 120) moveTo(f, clamp(f.x - sgn(dx) * 40, sx + 16, sx + G.VW - 16), f.y, f.spd, dt);
      else if (adx > 250) moveTo(f, f.x + sgn(dx) * 40, f.y, f.spd * .8, dt);
      else if (ady > 8) moveTo(f, f.x, T.y, f.spd * .85, dt);
      else f.st = 'idle';
      f.x = clamp(f.x, sx + 14, sx + G.VW - 14);
      if (f.cool <= 0 && ady < 14 && adx > 90) { f.tgt = T; startAtk(f, 'throw'); }
      return;
    }
    const reach = K.reach || 27;
    if (f.side === 'bad') { if (!f.tok && f.cool <= 0 && tokenFree()) f.tok = true; }
    else f.tok = f.cool <= 0;
    if (f.tok) {
      const sx = T.x - sgn(dx) * (reach - 8);
      const near = Math.abs(T.x - f.x) <= reach && ady <= 9;
      if (near) { f.face = dx >= 0 ? 1 : -1; f.rep = K.burst && Math.random() < .5 ? K.burst - 1 : (Math.random() < .25 ? 1 : 0); if (f.side === 'good') f.rep = 0; startAtk(f, f.side === 'good' ? (Math.random() < .35 ? 'kick' : 'p1') : K.atk); }
      else moveTo(f, sx, T.y, f.spd, dt);
    } else {
      f.wyT -= dt; if (f.wyT <= 0) { f.wyT = rand(1, 2.2); f.wy = rand(-30, 30); }
      const hv = (K.hover || 100) * (f.side === 'good' ? .6 : 1), side = sgn(f.x - T.x);
      if (adx < hv - 12) moveTo(f, T.x + side * hv, T.y + f.wy, f.spd * .7, dt);
      else if (adx > hv + 30) moveTo(f, T.x + side * hv, T.y + f.wy, f.spd * .8, dt);
      else if (Math.abs(f.y - (T.y + f.wy)) > 8) moveTo(f, f.x, T.y + f.wy, f.spd * .6, dt);
      else if (f.st === 'walk') f.st = 'idle';
    }
  }

  function bossAI(f, dt, T, dx, dy, adx, ady){
    const enraged = f.hp < f.max * .5;
    f.face = dx >= 0 ? 1 : -1;
    if (!f.summoned && enraged) {
      f.summoned = true; E('sfx', 'whistle'); E('banner', 'REFORÇOS DO APITO!', 1500);
      for (let i = 0; i < 2 + Math.floor((G.nP - 1) / 2); i++) G.queue.push({k: 'flag', side: i % 2 ? 'L' : 'R', d: .6 + i * .8});
    }
    if (f.cool > 0 || f.rep > 0) { moveTo(f, T.x - sgn(dx) * 100, T.y, f.spd, dt); return; }
    let key; const r = Math.random();
    if (adx < 60 && ady < 14 && r < .55) key = 'bmelee';
    else if (r < .32) key = 'bdash';
    else if (r < .58) key = enraged && Math.random() < .5 ? 'bred' : 'bcard';
    else if (r < .8) key = (adx < 140) ? 'bwhistle' : 'bcard';
    else key = 'bdash';
    f.rep = (key === 'bcard' && enraged) ? 2 : 0;
    startAtk(f, key);
  }

  function updAtk(f, dt){
    const a = f.atk, k = f.t;
    if (a.dashV && k < a.su) f.y += (f.dashY - f.y) * Math.min(1, dt * 8);
    if (!a.dashV && !a.air) f.vx *= Math.exp(-dt * 9);
    if (a.dashV) { if (k >= a.su && k < a.su + a.ac) f.vx = f.face * a.dashV; else f.vx *= Math.exp(-dt * 10); }
    if (a.air) { const ax = f.isPlayer ? f.inp.x : 0; f.vx = f.face * 70 + ax * 30; }
    if (k >= a.su) {
      if (!f.didHit) {
        f.didHit = true;
        if (a.proj) spawnProj(f, a.proj);
        else { slashFx(f, a); strike(f, a); if (a.shock) { E('ring', f.x, f.y, '#ffe14d', 190, .45); E('shake', 4); } }
        f.mt = a.multi || 0;
      } else if (a.multi && k < a.su + a.ac) {
        f.mt -= dt; if (f.mt <= 0) { f.mt = a.multi; f.hitSet = new Set(); strike(f, a); }
      }
    }
    if (f.isPlayer && a.next) {
      if (k > a.su * .5 && take(f, 'punch')) f.queue = true;
      if (f.queue && k >= a.su + a.ac) { startAtk(f, a.next); return; }
    }
    if (a.air) { if (f.z <= 0 && k > .05) { f.atk = null; f.st = 'idle'; } return; }
    if (k >= a.su + a.ac + a.rc) endAtk(f);
  }

  function playerControl(f, dt){
    const ax = f.inp.x, ay = f.inp.y, mv = Math.hypot(ax, ay);
    if (mv > 0) {
      f.x += ax * f.spd * dt; f.y += ay * f.spd * .72 * dt; f.walkT += dt; f.st = 'walk';
      if (Math.abs(ax) > .25) f.face = ax > 0 ? 1 : -1;
    } else if (f.st === 'walk') f.st = 'idle';
    if (take(f, 'special')) {
      if (f.ki >= 50) { f.ki -= 50; startAtk(f, 'spin'); E('sfx', 'kiai'); popText(f.x, f.y - 62, f.sc.sp + '!', f.sc.col, 16); return; }
      E('sfx', 'click');
    }
    if (take(f, 'punch')) { startAtk(f, 'p1'); return; }
    if (take(f, 'kick')) { startAtk(f, 'kick'); return; }
    if (take(f, 'jump')) { f.vz = 255; f.st = 'jump'; E('sfx', 'jump'); return; }
  }

  function onLand(f){
    if (f.st === 'jump') { f.st = 'idle'; dust(f.x, f.y, 4); E('sfx', 'land'); }
    else if (f.st === 'down') { f.landed = true; f.lie = 0; dust(f.x, f.y, 6); E('sfx', 'land'); E('shake', f.dead ? 3 : 1.5); }
  }

  function updateFighter(f, dt){
    f.t += dt; f.flash = Math.max(0, f.flash - dt); f.inv = Math.max(0, f.inv - dt); f.bar = Math.max(0, f.bar - dt); f.poise = Math.max(0, f.poise - 6 * dt);
    if (f.isPlayer && f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) f.combo = 0; }
    switch (f.st) {
      case 'idle': case 'walk': f.vx *= Math.exp(-dt * 12); if (f.isPlayer) playerControl(f, dt); else ai(f, dt); break;
      case 'jump':
        if (f.isPlayer) {
          f.x += f.inp.x * f.spd * .85 * dt; f.y += f.inp.y * f.spd * .5 * dt; if (Math.abs(f.inp.x) > .25) f.face = f.inp.x > 0 ? 1 : -1;
          if (take(f, 'punch') || take(f, 'kick')) { startAtk(f, 'jkick'); E('sfx', 'kiai'); }
          else if (f.ki >= 50 && take(f, 'special')) { f.ki -= 50; startAtk(f, 'spin'); popText(f.x, f.y - f.z - 62, f.sc.sp + '!', f.sc.col, 16); }
        }
        break;
      case 'atk': updAtk(f, dt); break;
      case 'hurt': f.vx *= Math.exp(-dt * 8); if (f.t >= f.stun) { f.st = 'idle'; f.inv = Math.max(f.inv, f.isPlayer ? .3 : 0); } break;
      case 'down':
        f.vx *= Math.exp(-dt * (f.landed ? 6 : 1.2));
        if (f.landed) {
          f.lie += dt;
          if (f.dead) {
            if (f.isPlayer) { if (f.lie > 1.1) playerDied(f); }
            else if (f.lie > .5) { f.fade += dt; if (f.fade > .85) f.remove = true; }
          } else if (f.lie > .75) { f.st = 'getup'; f.t = 0; f.inv = .9; }
        }
        break;
      case 'getup': f.vx *= Math.exp(-dt * 8); if (f.t > .35) f.st = 'idle'; break;
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.z > 0 || f.vz > 0) {
      f.vz -= GRAV * dt; f.z += f.vz * dt;
      if (f.z <= 0) { f.z = 0; f.vz = 0; onLand(f); }
    }
    f.y = clamp(f.y, YMIN, YMAX);
  }

  function playerDied(p){
    if (p.lives > 1) {
      p.lives--; p.hp = p.max; p.dead = false; p.st = 'getup'; p.t = 0; p.inv = 2.4; p.x = G.pvp ? G.cam + rand(50, G.VW - 50) : G.cam + 60; p.y = rand(200, 235); p.z = 0; p.vx = 0; p.ki = Math.max(p.ki, 30); p.landed = false;
      E('banner', (G.mp ? p.name + ' voltou!' : 'VOCÊ VOLTOU!') + ' (' + p.lives + ' vidas)', 1300); E('sfx', 'pickup');
    } else {
      p.out = true; p.remove = true;
      if (G.state === 'play') { if (G.pvp) pvpCheck(); else if (G.players.every(q => q.out)) { G.state = 'over'; G.clearT = 0; E('jingle', 'lose'); } }
    }
  }
  function pvpCheck(){
    if (G.state !== 'play') return;
    const al = G.players.filter(p => !p.out && !p.left);
    if (new Set(al.map(p => G.pvp === 'teams' ? p.club : p.pid)).size > 1) return;
    G.state = 'clear'; G.clearT = 0; const w = al[0];
    G.winner = !w ? '' : G.pvp === 'teams' ? KF.CLUBS[w.club].name : w.name; G.winClub = w ? w.club : '';
    E('jingle', 'win'); E('banner', w ? G.winner.toUpperCase() + ' VENCEU!' : 'EMPATE!', 2600);
    for (const p of al) { p.st = 'win'; p.t = 0; }
  }

  /* ---------- ondas ---------- */
  function startWave(){
    const st = G.stage, w = st.waves[G.wi];
    G.waveActive = true; G.go = false; E('go', 0);
    let list = w.e.map(e => [e[0], e[1], e[2]]);
    const extra = Math.round((G.nP - 1) * .45 * w.e.length);
    for (let i = 0; i < extra; i++) { const b = pick(w.e); if (b[0] !== 'boss') list.push([b[0], pick(['L', 'R']), b[2] + rand(.5, 3)]); }
    list.sort((a, b) => a[2] - b[2]);
    G.queue = list.map(e => ({k: e[0], side: e[1], d: (e[2] - 0) + .4}));
    // atrasos relativos (cada item espera o anterior)
    for (let i = G.queue.length - 1; i > 0; i--) G.queue[i].d = Math.max(.3, G.queue[i].d - G.queue[i - 1].d);
    const boss = !!w.boss;
    E('banner', boss ? 'CHEFE: MESTRE JUIZ!' : (G.wi === 0 && G.si === 0 ? 'LUTE!' : 'ONDA ' + (G.wi + 1) + ' / ' + st.waves.length), 1400);
    E('sfx', boss ? 'whistle' : 'wave'); if (boss) E('sfx', 'gong');
    if (!G.mp) {
      let na = 0; for (const e of G.ents) if (e.ally && !e.dead) na++;
      if (G.wi > 0 && na < st.allies) { const c = st.truce && na % 2 ? G.rival : G.club; const a = mk('ally', c, 'good', G.cam - 20, rand(190, 235)); a.entered = true; a.ally = true; popText(G.cam + 40, 170, 'REFORÇO!', '#8cf', 12); }
    }
  }
  function spawnEnemy(q){
    const K = KF.KINDS[q.k], club = K.club || G.rival;
    const side = q.side === 'B' ? (Math.random() < .5 ? 'L' : 'R') : q.side;
    const x = side === 'L' ? G.cam - 26 : G.cam + G.VW + 26;
    const f = mk(q.k, club, 'bad', x, rand(YMIN + 8, YMAX - 8));
    f.face = side === 'L' ? 1 : -1;
    if (K.boss) { f.x = G.cam + G.VW + 40; f.y = 212; f.cool = 1.2; f.max = f.hp = Math.round(K.hp * (1 + .42 * (G.nP - 1))); }
    return f;
  }
  function waveCleared(){
    G.waveActive = false; G.wi++;
    if (G.wi >= G.stage.waves.length) { stageComplete(); return; }
    G.go = true; E('go', 1); E('banner', 'VAI! ▶', 1200); E('sfx', 'go');
    if (livePlayers().some(p => p.hp < p.max * .7) || G.wi >= 2) G.items.push({type: 'pastel', x: G.cam + G.VW * .6, y: rand(200, 240)});
    if (G.nP > 3) G.items.push({type: 'pastel', x: G.cam + G.VW * .4, y: rand(200, 240)});
  }
  function stageComplete(){
    G.state = 'clear'; G.clearT = 0; G.go = false; E('go', 0);
    E('jingle', 'win'); E('banner', 'FASE COMPLETA!', 2400);
    for (const e of G.ents) if (e.side === 'good' && !e.dead && (e.st === 'idle' || e.st === 'walk')) { e.st = 'win'; e.t = 0; }
  }

  /* ---------- atualização ---------- */
  G.update = function(dt){
    G.t += dt;
    if (G.state === 'clear' || G.state === 'over') {
      G.clearT += dt;
      if (G.state === 'clear' && G.clearT > 3.2 && !G.reported) { G.reported = true; E('stageclear'); }
      if (G.state === 'over' && G.clearT > 1.8 && !G.reported) { G.reported = true; E('gameover'); }
    }
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    G.shake = Math.max(0, G.shake - 22 * dt);
    if (G.state === 'play' && G.pvp) { G.pt += dt; if (G.pt > 11 && G.items.length < 2) { G.pt = 0; G.items.push({type: 'pastel', x: G.cam + rand(60, G.VW - 60), y: rand(200, 240)}); } }
    if (G.state === 'play' && !G.pvp) {
      const lim = G.wi < G.stage.waves.length ? wAt(G.wi) : G.stage.len - G.VW;
      if (!G.waveActive && G.wi < G.stage.waves.length && G.cam >= lim - 1 && G.t > 1.6) startWave();
      if (G.waveActive) {
        const q = G.queue;
        if (q.length) { q[0].d -= dt; if (q[0].d <= 0 && aliveEnemies() < cap()) spawnEnemy(q.shift()); }
        else if (aliveEnemies() === 0) waveCleared();
      }
    }
    for (const f of G.ents) updateFighter(f, dt);
    separate();
    G.ents = G.ents.filter(f => !f.remove);
    for (const f of G.ents) {
      if (f.isPlayer) f.x = clamp(f.x, G.cam + 12, G.cam + G.VW - 12);
      else if (f.side === 'good') f.x = clamp(f.x, G.cam - 30, G.cam + G.VW + 30);
      else f.x = clamp(f.x, -50, G.stage.len + 50);
    }
    updateProj(dt); updateItems(dt); updateCam(dt);
  };

  function separate(){
    const L = G.ents;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.dead || b.dead || a.st === 'down' || b.st === 'down' || a.st === 'getup' || b.st === 'getup' || a.z > 8 || b.z > 8) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 6) {
        const px = (14 - Math.abs(dx)) * .25 * sgn(dx || (a.id - b.id)), py = (6 - Math.abs(dy)) * .35 * sgn(dy || (a.id - b.id));
        if (!a.isPlayer) { a.x -= px; a.y -= py; } if (!b.isPlayer) { b.x += px; b.y += py; }
      }
    }
  }
  function updateProj(dt){
    for (const p of G.proj) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 16 * sgn(p.vx); p.life -= dt;
      if (p.x < G.cam - 120 || p.x > G.cam + G.VW + 120) p.life = 0;
      for (const t of G.ents) {
        if (t.side === p.side || t.dead || t.st === 'down' || t.st === 'getup' || t.inv > 0) continue;
        if (Math.abs(t.x - p.x) < 11 * t.scale && Math.abs(t.y - p.y) < 12 && p.z >= t.z - 6 && p.z <= t.z + 48 * t.scale) {
          const src = {x: p.x - sgn(p.vx), face: sgn(p.vx), pid: p.ownerPid, K: {dm: 1}};
          damage(t, Math.round(p.dmg), src, {dmg: p.dmg, kb: 90, stun: .3, down: p.type === 'red' || p.deflected});
          p.life = 0; break;
        }
      }
    }
    G.proj = G.proj.filter(p => p.life > 0);
  }
  function updateItems(){
    for (const it of G.items) for (const P of G.players) {
      if (it.got || P.out || P.dead) continue;
      if (Math.abs(P.x - it.x) < 18 && Math.abs(P.y - it.y) < 14 && P.z < 20) {
        it.got = true; const h = Math.min(P.max - P.hp, 38); P.hp += h; P.ki = Math.min(100, P.ki + 15); E('sfx', 'pickup');
        popText(it.x, it.y - 24, h > 0 ? '+' + Math.round(h) + ' VIDA' : 'DELÍCIA!', '#7dff8a', 12); G.score += 25; P.pts += 25;
      }
    }
    G.items = G.items.filter(i => !i.got);
  }
  function updateCam(dt){
    const lp = livePlayers(), ref = lp.length ? lp : G.players;
    let ax = 0; for (const p of ref) ax += p.x; ax /= ref.length;
    let lim = G.stage.len - G.VW;
    if (G.state === 'play' && G.wi < G.stage.waves.length) lim = Math.min(lim, wAt(G.wi));
    G.camMax = Math.max(G.camMin, lim);
    const tx = clamp(ax - G.VW * .42, G.camMin, G.camMax);
    G.cam += (tx - G.cam) * Math.min(1, dt * 6);
    if (G.cam > G.camMax) G.cam = G.camMax;
    G.camMin = Math.max(G.camMin, Math.min(G.cam, G.camMax));
    if (G.state === 'play' && !G.waveActive && G.wi < G.stage.waves.length && !G.go && G.wi > 0 && G.cam < G.camMax - 40) { G.go = true; E('go', 1); }
    if (G.go && (G.waveActive || G.state !== 'play')) { G.go = false; E('go', 0); }
  }

  /* ---------- estado para os clientes ---------- */
  G.removePlayer = function(pid){
    const p = byPid(pid); if (!p || p.left) return;
    p.left = true; p.out = true; p.remove = true; p.dead = true;
    if (G.state === 'play') { if (G.pvp) pvpCheck(); else if (G.players.every(q => q.out)) { G.state = 'over'; G.clearT = 0; E('jingle', 'lose'); } }
  };
  G.info = () => G.players.filter(p => !p.left).map(p => ({pid: p.pid, name: p.name, hp: Math.round(p.hp), max: p.max, ki: Math.round(p.ki), lives: p.lives, out: p.out, pts: p.pts, combo: p.combo, cl: p.club}));
  const r1 = v => Math.round(v * 10) / 10;
  G.snapshot = function(){
    return {
      t: G.t, cam: r1(G.cam), si: G.si, wi: G.wi, st: G.state, go: G.go ? 1 : 0, sc: G.score, kos: G.kos, mc: G.maxCombo, club: G.club, rival: G.rival, pv: G.pvp === 'teams' ? 2 : G.pvp === 'ffa' ? 1 : 0, win: G.winner, wc: G.winClub,
      f: G.ents.map(f => ({i: f.id, k: f.kind, c: f.club, s: f.side === 'good' ? 1 : 0, x: r1(f.x), y: r1(f.y), z: r1(f.z), fc: f.face, st: f.st, t: Math.round(f.t * 100) / 100, w: Math.round(f.walkT * 100) / 100,
        hp: Math.round(f.hp), mx: f.max, fl: f.flash > 0 ? 1 : 0, iv: f.inv > 0 ? 1 : 0, d: f.dead ? 1 : 0, fd: Math.round(f.fade * 100) / 100, b: f.bar > 0 ? 1 : 0, p: f.pid != null ? f.pid : 0, n: f.n, ak: f.atkKey, lk: f.lk, sc: f.scI || 0, vz: Math.round(f.vz), al: f.ally ? 1 : 0, nm: f.name})),
      pr: G.proj.map(p => ({t: p.type, x: r1(p.x), y: r1(p.y), z: p.z, sp: r1(p.spin), s: p.side === 'good' ? 1 : 0, df: p.deflected ? 1 : 0})),
      it: G.items.map(i => ({x: r1(i.x), y: r1(i.y)})),
      pl: G.info()
    };
  };
  return G;
};
})(typeof window !== 'undefined' ? window : globalThis);
