/* ===== VISÃO: desenho do mundo e efeitos (só no navegador) =====
   Recebe um estado S com: ents, proj, items, cam, VW, t, theme, me, online. */
(function(){
const KF = window.KF = window.KF || {};
const art = KF.art;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const V = KF.view = {fx: [], shake: 0, bg: {}, demo: null, ghosts: [], gt: {}, flashA: 0, flashC: '#fff'};

V.stage = (theme, a, b) => { const k = theme === 'dojo' ? theme + '|' + a + '|' + b : theme; return V.bg[k] || (V.bg[k] = art.makeStage(theme, a, b)); };
V.lookOf = f => f.look || (f.look = {skin: KF.SKINS[f.lk[0]], hair: KF.HAIRS[f.lk[1]], style: KF.STYLES[f.lk[2]]});

function fxAdd(o){ if (V.fx.length < 260) V.fx.push(o); }
/* eventos vindos da simulação (solo) ou do servidor (online) */
V.event = function(ev){
  const k = ev[0];
  if (k === 'spark') fxAdd({type: 'spark', x: ev[1], y: ev[2], life: .24, max: .24, big: ev[3] ? 1.5 : 1});
  else if (k === 'dust') for (let i = 0; i < ev[3]; i++) fxAdd({type: 'dust', x: ev[1] + rand(-6, 6), y: ev[2], vx: rand(-20, 20), vy: rand(-18, -6), life: .4, max: .4});
  else if (k === 'text') fxAdd({type: 'text', x: ev[1], y: ev[2], vy: -26, life: .9, max: .9, txt: ev[3], col: ev[4], size: ev[5]});
  else if (k === 'ring') fxAdd({type: 'ring', x: ev[1], y: ev[2], r: 8, col: ev[3], grow: ev[4], max: ev[5], life: ev[5]});
  else if (k === 'shake') V.shake = Math.max(V.shake, ev[1]);
  else if (k === 'slash') fxAdd({type: 'slash', x: ev[1], y: ev[2], face: ev[3], key: ev[4], col: ev[5], sc: ev[6], pl: ev[7], rng: ev[8] || 34, life: ev[4] === 'kick' || ev[4] === 'p3' ? .26 : .2, max: ev[4] === 'kick' || ev[4] === 'p3' ? .26 : .2});
  else if (k === 'burst') {
    const n = ev[4] ? 9 : 5, cols = ['#ffffff', '#fff3a0', ev[5] || '#ffd23a'];
    for (let i = 0; i < n; i++) { const a = (Math.random() - .5) * 2.2, sp = rand(70, ev[4] ? 190 : 140); fxAdd({type: 'bp', x: ev[1], y: ev[2], vx: Math.cos(a) * ev[3] * sp, vy: Math.sin(a) * sp - 30, life: rand(.28, .5), max: .5, col: cols[i % 3], len: rand(3, 7)}); }
  }
  else if (k === 'special') {
    const sc = ev[3] | 0, col = (KF.SCHOOLS[sc] || {}).col || '#fff';
    fxAdd({type: 'sp' + sc, x: ev[1], y: ev[2], col, life: sc === 1 ? .7 : .6, max: sc === 1 ? .7 : .6});
    V.flashA = Math.max(V.flashA, .22); V.flashC = col;
    for (let i = 0; i < 14; i++) { const a = rand(0, 6.28), sp = rand(40, 150); fxAdd({type: 'bp', x: ev[1], y: ev[2] - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6 - 30, life: rand(.3, .6), max: .6, col: i % 2 ? col : '#fff', len: rand(3, 6)}); }
  }
  else if (k === 'flash') { V.flashC = ev[1] || '#fff'; V.flashA = Math.max(V.flashA, ev[2] || .4); }
};
V.update = function(dt){
  V.shake = Math.max(0, V.shake - 22 * dt); V.flashA = Math.max(0, V.flashA - 1.6 * dt);
  for (const gh of V.ghosts) gh.life -= dt; V.ghosts = V.ghosts.filter(gh => gh.life > 0);
  for (const f of V.fx) {
    f.life -= dt;
    if (f.type === 'dust') { f.x += f.vx * dt; f.y += f.vy * dt; }
    else if (f.type === 'text') { f.y += f.vy * dt; f.vy *= .94; }
    else if (f.type === 'ring') f.r += f.grow * dt;
    else if (f.type === 'bp') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 320 * dt; f.vx *= .985; }
  }
  V.fx = V.fx.filter(f => f.life > 0);
};
V.clearFx = () => { V.fx = []; V.shake = 0; V.ghosts = []; V.gt = {}; V.flashA = 0; };

function arcPath(g, cx, cy, r, a0, a1){ g.beginPath(); g.arc(cx, cy, r, a0, a1); }
function drawSlash(g, f, x, a){
  const p = 1 - a, face = f.face || 1, R = clamp(f.rng, 22, 60), k = f.key, big = f.pl ? 1 : .7;
  g.save(); g.translate(x, f.y); g.scale(face, 1); g.lineCap = 'round';
  const sw = Math.min(1, p * 3.2);
  if (k === 'kick' || k === 'p3') {           // meia-lua larga
    const cx = 2, cy = -14, a0 = -1.25, a1 = a0 + 2.0 * sw;
    for (const [w, al, col] of [[8 * big, .35, f.col], [4 * big, .85, f.col], [1.8, 1, '#ffffff']]) { g.globalAlpha = al * a; g.strokeStyle = col; g.lineWidth = w * (1 - p * .6); arcPath(g, cx, cy, R * .9, a0, a1); g.stroke(); }
  } else if (k === 'jkick') {                  // voadora: traço diagonal
    g.globalAlpha = a; for (const [w, col] of [[7 * big, f.col], [2.2, '#fff']]) { g.strokeStyle = col; g.lineWidth = w * (1 - p * .5); g.beginPath(); g.moveTo(-8, -40 + p * 4); g.lineTo(R * .9 * sw, -4); g.stroke(); }
  } else if (k === 'p1' || k === 'p2') {       // soco: riscos de velocidade
    g.globalAlpha = a; for (let i = 0; i < 3; i++) { const yy = -30 + i * 6 - (k === 'p2' ? 2 : 0), len = R * (.55 + .2 * (i === 1)) * sw; g.strokeStyle = i === 1 ? '#fff' : f.col; g.lineWidth = (i === 1 ? 2.4 : 3.4) * (1 - p * .5); g.beginPath(); g.moveTo(8 + i * 3, yy); g.lineTo(8 + i * 3 + len, yy - 1); g.stroke(); }
  } else {                                      // inimigos / outros golpes
    const a0 = -1.1, a1 = a0 + 1.7 * sw; g.globalAlpha = a * .8; g.strokeStyle = f.col; g.lineWidth = 4 * (1 - p * .6); arcPath(g, 0, -16, R * .8, a0, a1); g.stroke();
  }
  g.restore();
}
function drawSpecial(g, f, x, a){
  const p = 1 - a, sc = +f.type.slice(2); g.save(); g.translate(x, f.y);
  if (sc === 0) {          // DRAGÃO: espiral dupla de fogo
    for (let j = 0; j < 2; j++) {
      g.beginPath(); for (let i = 0; i <= 36; i++) { const t = i / 36, an = t * 9.4 + j * 3.14 + p * 8, r = (10 + p * 70) * (.25 + t * .75); const px = Math.cos(an) * r, py = Math.sin(an) * r * .32 - t * 26 * (1 - p * .4) + 6; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = j ? '#ffd23a' : '#ff5a1a'; g.lineWidth = 5 * a + 1; g.globalAlpha = Math.min(1, a * 1.6); g.lineCap = 'round'; g.stroke();
    }
    g.globalAlpha = a * .6; g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(0, 6, 22 + p * 40, 7 + p * 10, 0, 0, 6.3); g.fill();
  } else if (sc === 1) {   // KIAI: ondas brancas + raios
    for (let i = 0; i < 3; i++) { const q = clamp(p * 1.6 - i * .22, 0, 1); if (q <= 0) continue; g.globalAlpha = (1 - q) * .9; g.strokeStyle = i ? '#cfe8ff' : '#ffffff'; g.lineWidth = 4 * (1 - q) + 1; g.beginPath(); g.ellipse(0, -14, 14 + q * 100, 8 + q * 56, 0, 0, 6.3); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.globalAlpha = a * .8; for (let i = 0; i < 16; i++) { const an = i * .3927, r0 = 18 + p * 50, r1 = r0 + 24 * a + 6; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(an) * r0, -14 + Math.sin(an) * r0 * .6); g.lineTo(Math.cos(an) * r1, -14 + Math.sin(an) * r1 * .6); g.stroke(); }
  } else if (sc === 2) {   // ELEFANTE: pisada, rachaduras e poeira dourada
    g.globalAlpha = Math.min(1, a * 1.5); g.strokeStyle = '#2a1a10'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const an = i * .7 + .3, r = 14 + p * 78; g.beginPath(); g.moveTo(Math.cos(an) * 10, 4 + Math.sin(an) * 3); g.lineTo(Math.cos(an) * r * .6 + Math.cos(an + .5) * 6, 4 + Math.sin(an) * r * .2); g.lineTo(Math.cos(an) * r, 4 + Math.sin(an) * r * .3); g.stroke(); }
    g.strokeStyle = '#f2c200'; g.lineWidth = 5 * a + 1; g.beginPath(); g.ellipse(0, 4, 20 + p * 100, 6 + p * 24, 0, 0, 6.3); g.stroke();
    g.globalAlpha = a * .5; g.fillStyle = '#e8c97a'; g.beginPath(); g.ellipse(0, 2, 30 + p * 60, 8 + p * 10, 0, 0, 6.3); g.fill();
  } else {                 // TIGRE: garras cruzadas
    g.lineCap = 'round'; const sw = Math.min(1, p * 3);
    for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) {
      const ox = side * 8 + i * 10, len = 70 * sw; g.globalAlpha = a; g.strokeStyle = i === 0 ? '#ffffff' : '#7fc0ff'; g.lineWidth = (i === 0 ? 3.4 : 2.6) * (.5 + a);
      g.beginPath(); g.moveTo(ox - side * 28, -56 + i * 4); g.lineTo(ox - side * 28 + side * len * .45, -56 + i * 4 + len * .8); g.stroke();
    }
    g.globalAlpha = a * .55; g.strokeStyle = '#4aa8ff'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -10, 20 + p * 90, 8 + p * 30, 0, 0, 6.3); g.stroke();
  }
  g.restore();
}

function drawFx(g, cam){
  for (const f of V.fx) {
    const a = clamp(f.life / f.max, 0, 1), x = f.x - cam;
    if (f.type === 'slash') { drawSlash(g, f, x, a); continue; }
    if (f.type && f.type.charCodeAt(0) === 115 && f.type.charCodeAt(1) === 112 && f.type.length === 3) { drawSpecial(g, f, x, a); continue; }
    if (f.type === 'bp') { g.strokeStyle = f.col; g.lineWidth = 2; g.lineCap = 'round'; g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.moveTo(x, f.y); g.lineTo(x - f.vx * .02 * (f.len / 4), f.y - f.vy * .02 * (f.len / 4)); g.stroke(); g.globalAlpha = 1; continue; }
    if (f.type === 'spark') {
      const r = (1 - a) * 16 * f.big + 4; g.save(); g.translate(x, f.y); g.strokeStyle = '#fff3a0'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + .3; g.beginPath(); g.moveTo(Math.cos(an) * r * .45, Math.sin(an) * r * .45); g.lineTo(Math.cos(an) * r, Math.sin(an) * r); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.beginPath(); g.arc(0, 0, 5 * a * f.big + 1, 0, 6.3); g.fill(); g.restore();
    } else if (f.type === 'dust') { g.fillStyle = 'rgba(230,220,200,' + (a * .6) + ')'; g.beginPath(); g.arc(x, f.y, 2 + (1 - a) * 3, 0, 6.3); g.fill(); }
    else if (f.type === 'text') {
      g.save(); g.globalAlpha = Math.min(1, a * 2); g.font = '900 ' + f.size + 'px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.lineWidth = 3.4; g.strokeStyle = '#2a0a0a'; g.lineJoin = 'round';
      g.strokeText(f.txt, x, f.y); g.fillStyle = f.col; g.fillText(f.txt, x, f.y); g.restore();
    } else if (f.type === 'ring') {
      g.save(); g.globalAlpha = a; g.strokeStyle = f.col; g.lineWidth = 4 * a + 1; g.beginPath(); g.ellipse(x, f.y - 4, f.r, f.r * .32, 0, 0, 6.3); g.stroke(); g.globalAlpha = a * .3; g.fillStyle = f.col; g.fill(); g.restore();
    }
  }
}

V.render = function(g, S, dt){
  const cam = S.cam, VW = S.VW, T = S.t, me = S.me;
  g.save();
  if (V.shake > .3) g.translate(rand(-V.shake, V.shake) * .6, rand(-V.shake, V.shake) * .6);
  V.stage(S.theme, S.cA, S.cB).draw(g, cam, VW, T, dt);
  const L = [];
  for (const f of S.ents) {            // imagens residuais em golpes rápidos
    if (dt > 0 && !f.dead) {
      const ak = f.ak || f.atkKey, fast = (f.st === 'atk' && f.atk && (f.atk.air || f.atk.dashV || f.atk.lunge || ak === 'spin' || ak === 'kick')) || (f.pid > 0 && f.st === 'jump');
      if (fast) { V.gt[f.id] = (V.gt[f.id] || 0) - dt; if (V.gt[f.id] <= 0) { V.gt[f.id] = .04; if (V.ghosts.length < 46) { const c = Object.assign({}, f); V.ghosts.push({f: c, life: .22, max: .22}); } } }
    }
  }
  for (const gh of V.ghosts) L.push({y: gh.f.y - .5, gh});
  for (const f of S.ents) L.push({y: f.y, f});
  for (const p of S.proj) L.push({y: p.y, p});
  for (const i of S.items) L.push({y: i.y, i});
  for (const o of L) {
    if (o.f) { if (!(o.f.dead && o.f.fade > .3)) art.drawShadow(g, o.f.x - cam, o.f.y, o.f.z, o.f.scale); }
    else if (o.p) art.drawShadow(g, o.p.x - cam, o.p.y, o.p.z + 10, .5);
  }
  L.sort((a, b) => a.y - b.y);
  for (const o of L) {
    if (o.gh) { const c = o.gh.f; V.lookOf(c); g.globalAlpha = .38 * o.gh.life / o.gh.max; art.drawFighter(g, c, c.x - cam, c.y - c.z, T); g.globalAlpha = 1; continue; }
    if (o.f) {
      const f = o.f, sx = f.x - cam, sy = f.y - f.z; V.lookOf(f);
      if (f.dead && f.fade > 0) g.globalAlpha = Math.abs(Math.sin(f.fade * 30)) * (1 - f.fade / .85);
      else if (f.inv > 0 && f.pid > 0 && f.st !== 'atk') g.globalAlpha = Math.sin(T * 40) > 0 ? .45 : 1;
      art.drawFighter(g, f, sx, sy, T);
      g.globalAlpha = 1;
      const top = sy - 62 * f.scale;
      if (f.pid > 0 && !f.dead) {
        if (f.pid === me) { g.fillStyle = '#ffd23a'; g.strokeStyle = '#000'; g.lineWidth = 1.5; const b = Math.sin(T * 6) * 2; g.beginPath(); g.moveTo(sx - 6, top - 10 + b); g.lineTo(sx + 6, top - 10 + b); g.lineTo(sx, top - 2 + b); g.closePath(); g.stroke(); g.fill(); }
        else if (S.online) {
          g.font = '900 8px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.lineWidth = 2.6; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.fillStyle = '#9fe0ff';
          g.strokeText(f.name || 'Jogador', sx, top - 3); g.fillText(f.name || 'Jogador', sx, top - 3);
        }
      }
      else if (f.side === 'bad' && f.bar > 0 && !f.dead && !f.boss) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(sx - 14, top - 4, 28, 5); g.fillStyle = f.hp / f.max > .4 ? '#7cf06a' : '#ff6a4a'; g.fillRect(sx - 13, top - 3, 26 * f.hp / f.max, 3); }
      else if (f.ally && f.bar > 0 && !f.dead) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(sx - 12, top - 4, 24, 4); g.fillStyle = '#6ab8ff'; g.fillRect(sx - 11, top - 3, 22 * f.hp / f.max, 2); }
      if (f.st === 'atk' && f.atk && !(f.pid > 0) && f.side === 'bad' && f.t < f.atk.su && f.atk.su > .25 && f.atk.pose !== 'throw') {
        g.font = '900 15px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = (Math.floor(f.t * 20) % 2) ? '#ff2a2a' : '#ffd23a'; g.strokeText('!', sx, top - 2); g.fillText('!', sx, top - 2);
      }
    } else if (o.p) {
      const p = o.p; if (p.type === 'ball') art.drawBall(g, p.x - cam, p.y - p.z, 6, p.spin); else art.drawCard(g, p.x - cam, p.y - p.z, p.type === 'red', p.spin);
      if (p.deflected) { g.strokeStyle = 'rgba(255,230,120,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x - cam, p.y - p.z, 9, 0, 6.3); g.stroke(); }
    } else art.drawPastel(g, o.i.x - cam, o.i.y, T);
  }
  drawFx(g, cam);
  g.restore();
  if (V.flashA > .01) { g.save(); g.globalAlpha = Math.min(.5, V.flashA); g.fillStyle = V.flashC; g.fillRect(0, 0, VW, 270); g.restore(); }
  if (S.curtain > 1) {       // laterais escuras: a área jogável online tem largura fixa
    const w = S.curtain, gl = g.createLinearGradient(0, 0, w, 0); gl.addColorStop(0, 'rgba(8,3,4,.96)'); gl.addColorStop(.8, 'rgba(8,3,4,.9)'); gl.addColorStop(1, 'rgba(8,3,4,0)');
    g.fillStyle = gl; g.fillRect(0, 0, w, 270);
    const gr = g.createLinearGradient(VW, 0, VW - w, 0); gr.addColorStop(0, 'rgba(8,3,4,.96)'); gr.addColorStop(.8, 'rgba(8,3,4,.9)'); gr.addColorStop(1, 'rgba(8,3,4,0)');
    g.fillStyle = gr; g.fillRect(VW - w, 0, w, 270);
  }
};

/* ---------- tela de título: duelo decorativo ---------- */
V.renderTitle = function(g, dt, t, VW, a, b){
  const cam = t * 14, bgs = V.stage('temple');
  bgs.draw(g, cam, VW, t, dt);
  if (!V.demo) {
    const mkf = (id, face) => ({id, club: 'fig', x: 0, y: 236, z: 0, face, st: 'idle', t: 0, walkT: 0, lk: [id % 5, id % 6, 1], scale: 1.18, wide: 1, kind: 'x', flash: 0, n: 0, atk: null});
    V.demo = [mkf(3, 1), mkf(7, -1)];
  }
  const D = V.demo; D[0].club = a || 'fig'; D[1].club = b || 'ava'; D[0].lk = [1, 0, 1]; D[1].lk = [2, 3, 2];
  const cyc = t % 3.2, who = Math.floor(t / 3.2) % 2;
  D[0].x = VW * .12; D[1].x = VW * .88;
  for (const f of D) { f.st = 'idle'; f.atk = null; f.t = 0; V.lookOf(f); f.look = null; V.lookOf(f); }
  const att = who ? D[1] : D[0], ph = (cyc % 1.6) / 1.6;
  if (cyc < 1.6 && ph > .2 && ph < .75) { att.st = 'atk'; att.atk = KF.ATK[ph < .45 ? 'p1' : 'kick']; att.t = ph < .45 ? (ph - .2) / .25 * .22 : (ph - .45) / .3 * .3; att.n = 1; }
  for (const f of D) { art.drawShadow(g, f.x, f.y, 0, f.scale); art.drawFighter(g, f, f.x, f.y, t); }
};
})();
