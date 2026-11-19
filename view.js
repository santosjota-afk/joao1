/* ===== VISÃO: desenho do mundo e efeitos (só no navegador) =====
   Recebe um estado S com: ents, proj, items, cam, VW, t, theme, me, online. */
(function(){
const KF = window.KF = window.KF || {};
const art = KF.art;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const V = KF.view = {fx: [], shake: 0, bg: {}, demo: null, ghosts: [], gt: {}, flashA: 0, flashC: '#fff'};

V.stage = (theme, a, b) => { const k = theme + '|' + a + '|' + b; return V.bg[k] || (V.bg[k] = art.makeStage(theme, a, b)); };
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
    fxAdd({type: 'sp' + sc, x: ev[1], y: ev[2], col, life: .95, max: .95}); V.shake = Math.max(V.shake, sc === 2 ? 9 : 5);
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
const ease = q => 1 - Math.pow(1 - clamp(q, 0, 1), 3);
function glowDot(g, x, y, r, c0, c1){ const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }
function taperSlash(g, x0, y0, x1, y1, bend, w, col, al){      // garra afilada: curva com ponta
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2 - bend * .4, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
  g.globalAlpha = al; g.fillStyle = col; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx * .2, my - ny * .2, x0, y0); g.fill();
}
function drawSpecial(g, f, x, a){
  const p = 1 - a, sc = +f.type.slice(2); g.save(); g.translate(x, f.y); g.lineCap = 'round'; g.lineJoin = 'round';
  if (sc === 0) {          // DRAGÃO: serpente de fogo com cabeça, escamas e chamas
    g.globalCompositeOperation = 'lighter';
    glowDot(g, 0, -8, 30 + p * 40, 'rgba(255,140,40,' + (a * .5) + ')', 'rgba(255,60,0,0)');
    const N = 34, head = clamp(p * 1.35, 0, 1), pos = t => { const an = t * 11 + p * 6, r = (8 + t * 62) * (.55 + .45 * Math.min(1, p * 2.4)); return [Math.cos(an) * r, Math.sin(an) * r * .34 - t * 40 + 2 - Math.sin(t * 3.14) * 8]; };
    for (let i = 0; i < N; i++) {
      const t = (i / N) * head; if (head < .02) break; const [px, py] = pos(t), k = i / N, rad = 2.5 + (1 - k) * 6.2;
      g.globalAlpha = Math.min(1, a * 1.8) * (.55 + k * .45); glowDot(g, px, py, rad * 2.1, 'rgba(255,' + Math.round(210 - k * 150) + ',40,.85)', 'rgba(255,60,0,0)');
      g.fillStyle = k < .35 ? '#fff2a0' : '#ff7a2a'; g.beginPath(); g.arc(px, py, rad * .55, 0, 6.3); g.fill();
    }
    const [hx, hy] = pos(head), [bx, by] = pos(Math.max(0, head - .05)), ang = Math.atan2(hy - by, hx - bx);
    g.save(); g.translate(hx, hy); g.rotate(ang); g.globalAlpha = Math.min(1, a * 2);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#d6301f'; g.strokeStyle = '#3a0c08'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(-6, -5); g.quadraticCurveTo(4, -9, 12, -3); g.lineTo(15, 0); g.lineTo(5, 2); g.lineTo(13, 5); g.quadraticCurveTo(2, 9, -6, 5); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#ffd23a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3, -6); g.lineTo(-10, -12); g.moveTo(1, -7); g.lineTo(-4, -15); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(3, -3, 1.9, 0, 6.3); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(3.5, -3, .9, 0, 6.3); g.fill(); g.restore();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * .7; g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(0, 6, 20 + p * 54, 6 + p * 12, 0, 0, 6.3); g.fill();
  } else if (sc === 1) {   // KIAI: explosão de ki com kanji 気 e ondas
    g.globalCompositeOperation = 'lighter';
    const core = clamp(1 - p * 3, 0, 1); if (core > 0) glowDot(g, 0, -16, 16 + p * 80, 'rgba(255,255,255,' + core + ')', 'rgba(120,190,255,0)');
    for (let i = 0; i < 4; i++) { const q = clamp(p * 1.7 - i * .16, 0, 1); if (q <= 0 || q >= 1) continue; g.globalAlpha = (1 - q) * .95; g.strokeStyle = i % 2 ? '#bfe0ff' : '#ffffff'; g.lineWidth = 5 * (1 - q) + 1; g.beginPath(); g.ellipse(0, -14, 12 + ease(q) * 112, 7 + ease(q) * 62, 0, 0, 6.3); g.stroke(); }
    g.strokeStyle = '#fff'; for (let i = 0; i < 24; i++) { const an = i * .2618 + .1, q = ease(p * 1.2), r0 = 14 + q * 46, r1 = r0 + 12 + 40 * a * (i % 3 ? .6 : 1); g.globalAlpha = a * .85; g.lineWidth = i % 3 ? 1.4 : 2.4; g.beginPath(); g.moveTo(Math.cos(an) * r0, -14 + Math.sin(an) * r0 * .62); g.lineTo(Math.cos(an) * r1, -14 + Math.sin(an) * r1 * .62); g.stroke(); }
    g.globalAlpha = Math.min(1, a * 1.6); g.globalCompositeOperation = 'source-over'; g.font = '900 ' + (26 + p * 58) + 'px "Hiragino Mincho ProN","Noto Serif CJK JP",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(30,70,160,' + a + ')'; g.strokeText('気', 0, -30 - p * 20); g.fillStyle = '#fff'; g.fillText('気', 0, -30 - p * 20);
  } else if (sc === 2) {   // ELEFANTE: pisada gigante, rachaduras, pedras e poeira
    const drop = clamp(p / .22, 0, 1), foot = 1 - drop;
    if (foot > 0) { g.globalAlpha = .9; g.fillStyle = '#6b6b78'; g.strokeStyle = '#1c1c26'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -90 * foot * foot - 4, 30, 17, 0, 0, 6.3); g.fill(); g.stroke(); for (let k = -2; k <= 1; k++) { g.fillStyle = '#e9e1cf'; g.beginPath(); g.ellipse(k * 12 + 6, -90 * foot * foot + 8, 4.5, 3.4, 0, 0, 6.3); g.fill(); } }
    const q = clamp((p - .2) / .8, 0, 1); if (q > 0) {
      const al = 1 - q; g.globalAlpha = Math.min(1, al * 1.4); g.strokeStyle = '#1d120a'; g.lineWidth = 2.4;
      for (let i = 0; i < 11; i++) { const an = i * .571 + .2, r = 10 + ease(q) * 86; g.beginPath(); g.moveTo(Math.cos(an) * 8, 4 + Math.sin(an) * 2.5); g.lineTo(Math.cos(an) * r * .5 + Math.cos(an + .6) * 5, 4 + Math.sin(an) * r * .16); g.lineTo(Math.cos(an) * r, 4 + Math.sin(an) * r * .3); g.stroke(); }
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffd23a'; g.lineWidth = 5 * al + 1; g.globalAlpha = al; g.beginPath(); g.ellipse(0, 4, 18 + ease(q) * 108, 6 + ease(q) * 26, 0, 0, 6.3); g.stroke();
      g.globalAlpha = al * .45; g.fillStyle = '#e8c97a'; g.beginPath(); g.ellipse(0, 2, 26 + q * 70, 8 + q * 12, 0, 0, 6.3); g.fill(); g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 10; i++) { const an = i * .63 + 1, sp = 30 + (i % 4) * 18, tx = Math.cos(an) * sp * q * 1.7, ty = -Math.abs(Math.sin(an)) * sp * q * 1.6 + 120 * q * q - 8, s = 3.4 - (i % 3); g.globalAlpha = al; g.fillStyle = i % 2 ? '#7a6a58' : '#4c4036'; g.beginPath(); g.moveTo(tx - s, ty + s); g.lineTo(tx - s * .3, ty - s); g.lineTo(tx + s, ty + s * .5); g.closePath(); g.fill(); }
    }
  } else {                 // TIGRE: três garras de energia + olhos de tigre
    g.globalCompositeOperation = 'lighter'; const sw = ease(p * 3.2);
    for (let i = -1; i <= 1; i++) { const ox = i * 15, col = i === 0 ? '#ffffff' : '#6fc4ff'; taperSlash(g, ox - 34, -86, ox + 12 + 22 * sw, -86 + 92 * sw, -10, 5.5 - Math.abs(i), col, Math.min(1, a * 1.7)); taperSlash(g, ox + 34, -86, ox - 12 - 22 * sw, -86 + 92 * sw, 10, 5.5 - Math.abs(i), col, Math.min(1, a * 1.7)); }
    glowDot(g, 0, -20, 24 + p * 70, 'rgba(110,190,255,' + (a * .45) + ')', 'rgba(40,100,255,0)');
    const eye = clamp(1 - p * 2.2, 0, 1); if (eye > 0) for (const s of [-1, 1]) { g.globalAlpha = eye; g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(s * 7, -50); g.quadraticCurveTo(s * 18, -58, s * 26, -48); g.quadraticCurveTo(s * 16, -44, s * 7, -50); g.fill(); g.fillStyle = '#111'; g.fillRect(s * 16 - 1, -54, 2, 8); }
    g.globalAlpha = a * .7; g.strokeStyle = '#4aa8ff'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -10, 18 + ease(p) * 96, 7 + ease(p) * 32, 0, 0, 6.3); g.stroke();
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
  const cam = t * 14, bgs = V.stage('temple', 'none', 'none');
  bgs.draw(g, cam, VW, t, dt);
  /* raios de sol girando atrás do logo */
  g.save(); g.translate(VW / 2, 118); g.rotate(t * .05); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) { const an = i * Math.PI / 9, w = .11; g.fillStyle = i % 2 ? 'rgba(255,170,60,.07)' : 'rgba(255,90,60,.05)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * 520, Math.sin(an) * 520); g.lineTo(Math.cos(an + w) * 520, Math.sin(an + w) * 520); g.closePath(); g.fill(); }
  g.restore();
  /* lanternas subindo + brasas */
  if (!V.tl) { V.tl = {l: [], e: []}; for (let i = 0; i < 9; i++) V.tl.l.push({x: Math.random(), y: Math.random() * 300, v: 8 + Math.random() * 10, p: Math.random() * 6, s: .7 + Math.random() * .7}); for (let i = 0; i < 46; i++) V.tl.e.push({x: Math.random(), y: Math.random() * 270, v: 14 + Math.random() * 26, p: Math.random() * 6}); }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const e of V.tl.e) { e.y -= e.v * dt; if (e.y < -4) { e.y = 274; e.x = Math.random(); } const ex = e.x * VW + Math.sin(t * 1.3 + e.p) * 8; g.fillStyle = 'rgba(255,' + (150 + 60 * Math.sin(t * 5 + e.p)) + ',60,' + (.35 + .3 * Math.sin(t * 4 + e.p)) + ')'; g.fillRect(ex, e.y, 1.8, 1.8); }
  g.restore();
  for (const l of V.tl.l) {
    l.y -= l.v * dt; if (l.y < -30) { l.y = 290; l.x = Math.random(); }
    const lx = l.x * VW + Math.sin(t * .8 + l.p) * 12, s = l.s;
    g.save(); g.translate(lx, l.y); g.scale(s, s);
    const gl = g.createRadialGradient(0, 0, 2, 0, 0, 26); gl.addColorStop(0, 'rgba(255,170,60,.55)'); gl.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gl; g.fillRect(-26, -26, 52, 52);
    g.fillStyle = '#d6301f'; g.strokeStyle = '#3a0c08'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 0, 7, 9, 0, 0, 6.3); g.fill(); g.stroke();
    g.fillStyle = '#ffd77a'; g.fillRect(-2, -3, 4, 6); g.fillStyle = '#3a0c08'; g.fillRect(-4, -10, 8, 2); g.fillRect(-4, 8, 8, 2); g.restore();
  }
  if (!V.demo) {
    const mkf = (id, face) => ({id, club: 'fig', x: 0, y: 236, z: 0, face, st: 'idle', t: 0, walkT: 0, lk: [id % 5, id % 6, 1], scale: 1.18, wide: 1, kind: 'x', flash: 0, n: 0, atk: null, pid: id, sc: 0});
    V.demo = [mkf(3, 1), mkf(7, -1)];
  }
  const D = V.demo; D[0].club = a || 'fig'; D[1].club = b || 'ava'; D[0].lk = [1, 0, 1]; D[1].lk = [2, 3, 2];
  const cyc = t % 4.8, round = Math.floor(t / 4.8), who = round % 2, schoolIdx = round % 4;
  D[0].x = VW * .12; D[1].x = VW * .88;
  for (const f of D) { f.st = 'idle'; f.atk = null; f.t = 0; f.sc = 0; V.lookOf(f); f.look = null; V.lookOf(f); }
  const att = who ? D[1] : D[0], ph = (cyc % 1.6) / 1.6;
  D[0].sc = D[1].sc = schoolIdx; att.sc = schoolIdx;
  if (cyc < 1.6 && ph > .2 && ph < .75) { att.st = 'atk'; att.atk = KF.ATK[ph < .45 ? 'p1' : 'kick']; att.t = ph < .45 ? (ph - .2) / .25 * .22 : (ph - .45) / .3 * .3; att.n = 1; }
  for (const f of D) { art.drawShadow(g, f.x, f.y, 0, f.scale); art.drawFighter(g, f, f.x, f.y, t); }
  if (cyc >= 1.8 && cyc < 3.0) { const q = (cyc - 1.8) / 1.2; drawSpecial(g, {type: 'sp' + schoolIdx, y: att.y}, att.x, 1 - q); }
};
})();
