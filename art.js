/* ===== ARTE: lutadores, itens e cenários desenhados por código (sem imagens) ===== */
(function(){
const KF = window.KF = window.KF || {};
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 2);
const easeIn = x => Math.pow(clamp(x, 0, 1), 2);
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }


/* ============================ LUTADORES ============================ */
function line(g, x1, y1, x2, y2, w, c){ g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

function pose(f, t){
  const P = {lean: 0, bob: 0, ff: {x: 7, y: 0}, bf: {x: -7, y: 0}, fh: {x: 11, y: -4}, bh: {x: 7, y: 3}, mouth: 0, eyes: 0, rot: 0, sx: 1, dy: 0, shake: 0};
  const st = f.st;
  if (st === 'idle') { const s = Math.sin(t * 5 + f.id); P.bob = s * 0.8; P.fh.y = -4 + s; P.bh.y = 3 - s * .6; }
  else if (st === 'walk') {
    const p = f.walkT * 13;
    P.ff.x = 7 + Math.sin(p) * 9; P.ff.y = -Math.max(0, Math.cos(p)) * 4;
    P.bf.x = -7 - Math.sin(p) * 9; P.bf.y = -Math.max(0, -Math.cos(p)) * 4;
    P.bob = -Math.abs(Math.sin(p)) * 1.6; P.fh.x = 11 + Math.sin(p) * 3; P.bh.x = 7 - Math.sin(p) * 3; P.lean = 1.5;
  }
  else if (st === 'jump') { P.ff = {x: 9, y: -9}; P.bf = {x: -4, y: -6}; P.fh = {x: 12, y: -12}; P.bh = {x: -6, y: -12}; P.mouth = 1; }
  else if (st === 'atk') {
    const a = f.atk, k = f.t, su = a.su, ac = a.ac, rc = a.rc;
    const ext = k < su ? easeOut(k / Math.max(su, .001)) : k < su + ac ? 1 : 1 - easeIn((k - su - ac) / Math.max(rc, .001));
    P.mouth = 1;
    switch (a.pose) {
      case 'punch': P.fh = {x: 10 + ext * 18, y: -5 - (f.n % 2) * 5}; P.lean = ext * 3; P.bh = {x: 5, y: 2}; if (su > .2 && k < su) { P.fh = {x: 8 - (1 - ext) * 2, y: -10}; P.lean = -2; } break;
      case 'heavy': P.fh = {x: 8 + ext * 24, y: -5}; P.bh = {x: 6 + ext * 8, y: 1}; P.lean = ext * 5; P.ff.x = 12; P.bf.x = -9; break;
      case 'swing': P.fh = {x: 4 + ext * 26, y: -14 + ext * 12}; P.bh = {x: 2 + ext * 14, y: -10 + ext * 10}; P.lean = ext * 4; break;
      case 'kick': P.ff = {x: 8 + ext * 19, y: -4 - ext * 15}; P.lean = -ext * 3; P.fh = {x: 6, y: -8}; P.bh = {x: -2, y: -4}; break;
      case 'jkick': P.ff = {x: 10 + ext * 14, y: -9 - ext * 3}; P.bf = {x: -2, y: -4}; P.fh = {x: 4, y: -12}; P.bh = {x: -6, y: -8}; P.lean = -2; break;
      case 'spin': P.sx = Math.max(.22, Math.abs(Math.cos(k * 24))); P.ff = {x: 21, y: -15}; P.bf = {x: -21, y: -14}; P.fh = {x: 18, y: -6}; P.bh = {x: -18, y: -6}; break;
      case 'slam': { const up = k < su ? easeOut(k / su) : 1 - easeOut((k - su) / .08); P.fh = {x: 6 + (1 - up) * 14, y: -22 * up + 8 * (1 - up)}; P.bh = {x: 3 + (1 - up) * 14, y: -20 * up + 8 * (1 - up)}; P.lean = k < su ? -3 * up : 5; break; }
      case 'throw': P.fh = {x: 4 + ext * 16, y: -14 + ext * 8}; P.bh = {x: 0, y: -8}; P.lean = -ext * 2; break;
      case 'dash': P.lean = 6; P.ff = {x: 14, y: -2}; P.bf = {x: -16, y: -3}; P.fh = {x: 20, y: -6}; P.bh = {x: 14, y: 2}; break;
      case 'whistle': P.fh = {x: 7, y: -13}; P.bh = {x: 4, y: -12}; P.mouth = 2; P.bob = Math.sin(k * 40) * .8; break;
    }
  }
  else if (st === 'hurt') { P.lean = -5; P.fh = {x: 3, y: -10}; P.bh = {x: -4, y: -9}; P.mouth = 1; P.eyes = 1; P.shake = Math.sin(f.t * 60) * 1.2; }
  else if (st === 'down' || st === 'getup') {
    let lie = 1;
    if (st === 'getup') lie = 1 - easeOut(f.t / .35);
    else if (f.z > 1 || f.vz > 0) lie = clamp(0.35 + Math.abs(f.t) * 2.2, 0, 1) * .9;
    P.rot = -PI / 2 * lie; P.dy = 14 * lie; P.eyes = 1; P.mouth = 1; P.fh = {x: 6, y: -8}; P.bh = {x: -4, y: -6};
    if (st === 'getup') P.eyes = 0;
  }
  else if (st === 'win') { P.fh = {x: 6, y: -24 - Math.sin(t * 10) * 2}; P.bh = {x: -4, y: -24 + Math.sin(t * 10) * 2}; P.mouth = 1; P.bob = -Math.abs(Math.sin(t * 6)) * 3; }
  return P;
}

function hairShape(g, style, hx, hy, col){
  g.fillStyle = col;
  if (style === 'bald') return;
  if (style === 'spiky') {
    g.beginPath(); g.arc(hx, hy - 1, 8.6, PI * .98, TAU * 1.01); g.fill();
    for (let i = 0; i < 5; i++) { const a = PI * 1.05 + i * PI * .22; g.beginPath(); g.moveTo(hx + Math.cos(a - .18) * 8, hy - 1 + Math.sin(a - .18) * 8); g.lineTo(hx + Math.cos(a) * 13.5, hy - 1 + Math.sin(a) * 13.5); g.lineTo(hx + Math.cos(a + .18) * 8, hy - 1 + Math.sin(a + .18) * 8); g.fill(); }
    return;
  }
  g.beginPath(); g.arc(hx, hy - 1, 8.7, PI * .92, TAU * 1.04); g.fill();
  g.beginPath(); g.ellipse(hx - 5.5, hy + 1, 3.6, 6, 0, 0, TAU); g.fill();
  if (style === 'topknot') { g.beginPath(); g.arc(hx - 1, hy - 11, 3.6, 0, TAU); g.fill(); g.fillStyle = '#d33'; g.fillRect(hx - 2.6, hy - 9.2, 3.4, 1.6); }
  if (style === 'long') { g.beginPath(); g.moveTo(hx - 8, hy - 2); g.quadraticCurveTo(hx - 15, hy + 8, hx - 9, hy + 16); g.lineTo(hx - 4, hy + 8); g.fill(); }
}

function jerseyPattern(g, club, C, shx, shy, tw, hx, hy, W){
  const A = C(club.a), B = C(club.b), D = C(club.c || club.b), x0 = Math.min(shx, hx) - tw - 2, w = tw * 2 + 6, y0 = shy - 1, h = 26;
  switch (club.pat) {
    case 'ninja': g.fillStyle = B; g.fillRect(x0, shy + 6, w, 2.5); break;
    case 'solid': g.fillStyle = B; g.fillRect(x0, y0, w, 3); g.fillRect(x0, hy - 1, w, 1.6); break;
    case 'hoops': g.fillStyle = B; for (let y = shy + 2; y < hy; y += 7) g.fillRect(x0, y, w, 3.6); break;
    case 'hoops3': g.fillStyle = B; g.fillRect(x0, shy + 4, w, 4.5); g.fillStyle = D; g.fillRect(x0, shy + 11, w, 3.2); break;
    case 'halves': g.fillStyle = B; g.fillRect(hx, y0, w, h); break;
    case 'tricolor': { const t3 = (tw * 2) / 3; g.fillStyle = B; g.fillRect(hx - tw + t3 - 1, y0, t3 + 1, h); g.fillStyle = D; g.fillRect(hx - tw + t3 * 2 - 1, y0, t3 + 2, h); break; }
    case 'sash': g.fillStyle = B; g.beginPath(); g.moveTo(hx - tw - 2, shy + 1); g.lineTo(hx - tw + 6, shy + 1); g.lineTo(hx + tw + 2, hy); g.lineTo(hx + tw - 6, hy); g.closePath(); g.fill(); break;
    default: g.fillStyle = B; for (let i = -3; i <= 3; i += 2) g.fillRect(hx + i * 3.6 * W - 1.8, y0, 3.6 * W, 22);
  }
}

function drawFighter(g, f, sx, sy, time){
  const club = KF.CLUBS[f.club], S = f.scale || 1, W = f.wide || 1, fl = f.flash > 0;
  const C = c => fl ? '#fff' : c;
  const P = pose(f, time), ninja = f.club === 'ref';
  const sch = f.pid > 0 ? (typeof f.sc === 'object' && f.sc ? f.sc : KF.SCHOOLS[f.sc | 0]) : null, sid = sch ? sch.id : '';
  const skin = C(f.look.skin), hairC = C(f.look.hair);
  g.save();
  g.translate(sx + P.shake, sy);
  g.scale(f.face * S * P.sx, S);
  if (P.rot) { g.translate(0, P.dy); g.translate(0, -20); g.rotate(P.rot); g.translate(0, 20); }
  g.translate(0, P.bob);
  const hx = P.lean * .4, hy = -20, shx = P.lean, shy = -37;
  const jerseyA = C(club.a), jerseyB = C(club.b);
  /* braço de trás */
  const arm = (hand, back) => {
    const ax = shx + (back ? -1 : 1), ay = shy + 2, ex = ax + hand.x, ey = ay + hand.y;
    line(g, ax, ay, ex, ey, 4.6, skin);
    line(g, ax, ay, ax + (ex - ax) * .38, ay + (ey - ay) * .38, 6.6, jerseyA);
    if (sid === 'mt') { g.fillStyle = C(sch.trim); g.beginPath(); g.arc(ax + (ex - ax) * .32, ay + (ey - ay) * .32, 3.5, 0, TAU); g.fill(); g.fillStyle = C('#ffe27a'); g.beginPath(); g.arc(ax + (ex - ax) * .32, ay + (ey - ay) * .32, 1.2, 0, TAU); g.fill(); }
    if (sid === 'kf') { g.fillStyle = C(sch.trim); g.beginPath(); g.arc(ax + (ex - ax) * .8, ay + (ey - ay) * .8, 2.6, 0, TAU); g.fill(); }
    g.fillStyle = C(sid === 'mt' ? '#e9d9b0' : sid === 'tk' ? sch.trim : '#f4f0e6'); g.beginPath(); g.arc(ex, ey, 3.1, 0, TAU); g.fill();
    g.fillStyle = skin; g.beginPath(); g.arc(ex + .6, ey - .4, 2.2, 0, TAU); g.fill();
  };
  arm(P.bh, true);
  /* pernas */
  const leg = (foot, hipx) => {
    const x1 = hipx, y1 = hy, x2 = foot.x, y2 = foot.y;
    line(g, x1, y1, x2, y2, 5.4, C(club.sock));
    if (club.pat === 'stripes' && club.sock === club.a) line(g, x1 + (x2 - x1) * .62, y1 + (y2 - y1) * .62, x2, y2, 5.6, C('#f5f5f5'));
    line(g, x1, y1, x1 + (x2 - x1) * .38, y1 + (y2 - y1) * .38, 7.8 * W, C(club.short));
    g.fillStyle = C('#1a1a1a'); g.beginPath(); g.ellipse(x2 + 2, y2 - 1, 5, 3, 0, 0, TAU); g.fill();
  };
  leg(P.bf, hx - 2.5); leg(P.ff, hx + 2.5);
  /* tronco */
  const tw = 7 * W;
  g.beginPath(); g.moveTo(shx - tw, shy); g.lineTo(shx + tw, shy); g.lineTo(hx + 6 * W, hy + 2); g.lineTo(hx - 6 * W, hy + 2); g.closePath();
  g.fillStyle = jerseyA; g.fill();
  g.save(); g.clip();
  jerseyPattern(g, club, C, shx, shy, tw, hx, hy, W);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(shx - tw, shy); g.lineTo(shx + tw, shy); g.lineTo(hx + 6 * W, hy + 2); g.lineTo(hx - 6 * W, hy + 2); g.closePath(); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.moveTo(shx - 3, shy); g.lineTo(shx + 3, shy); g.lineTo(shx, shy + 3.4); g.fill();
  /* faixa/cinto (kung fu) */
  /* detalhes de cada escola (cultura) sobre o tronco */
  if (sid === 'kf') { g.fillStyle = C(sch.trim); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(shx * (1 - i * .3) + hx * i * .3 + 1.5, shy + 5 + i * 5.4, 1.35, 0, TAU); g.fill(); } }
  else if (sid === 'ka') { g.strokeStyle = C('#fff'); g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(shx - 4.5, shy + .5); g.lineTo(hx + 1.5, hy - 2); g.moveTo(shx + 4.5, shy + .5); g.lineTo(hx - 1.5, hy - 2); g.stroke(); }
  else if (sid === 'tk') { g.fillStyle = C(sch.trim); g.beginPath(); g.moveTo(shx - tw * .75, shy + 3); g.lineTo(shx + tw * .75, shy + 3); g.lineTo(hx + 4.2 * W, hy - 3); g.lineTo(hx - 4.2 * W, hy - 3); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.stroke(); g.fillStyle = C('#f5f5f5'); g.fillRect(shx - 1, shy + 5, 2, 7); }
  else if (sid === 'mt') { g.strokeStyle = C('#ffe27a'); g.lineWidth = 1.6; g.beginPath(); g.moveTo(shx - tw, shy + 1); g.lineTo(hx + 5 * W, hy - 1); g.stroke(); }
  g.fillStyle = C(ninja ? '#c23' : sid === 'kf' ? '#d11a2a' : sid === 'ka' || sid === 'tk' ? '#141414' : sid === 'mt' ? sch.trim : '#f2f2f2'); g.fillRect(hx - 6.4 * W, hy - 2, 12.8 * W, 2.4);
  if (sid === 'kf') { g.fillRect(hx - 6.4 * W - 3, hy - 1, 3.4, 8); }
  /* shorts */
  g.fillStyle = C(club.short); g.beginPath(); g.moveTo(hx - 6.6 * W, hy); g.lineTo(hx + 6.6 * W, hy); g.lineTo(hx + 7.4 * W, hy + 7); g.lineTo(hx - 7.4 * W, hy + 7); g.fill();
  /* cabeça */
  const cx = shx * .8 + 1, cy = shy - 9.5;
  g.fillStyle = skin; g.beginPath(); g.arc(cx, cy, 8.2, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx - 7.6, cy + 1, 1.9, 0, TAU); g.fill();
  hairShape(g, f.look.style, cx, cy, hairC);
  /* máscara ninja (árbitros) */
  if (ninja) { g.save(); g.beginPath(); g.arc(cx, cy, 8.3, 0, TAU); g.clip(); g.fillStyle = C('#15151a'); g.fillRect(cx - 9, cy + 1.6, 18, 9); g.restore(); }
  /* rosto */
  g.fillStyle = '#111';
  if (P.eyes === 1) { line(g, cx + 1.5, cy - .6, cx + 3.6, cy + 1.4, 1.2, '#111'); line(g, cx + 3.6, cy - .6, cx + 1.5, cy + 1.4, 1.2, '#111'); line(g, cx + 5.6, cy - .6, cx + 7.4, cy + 1.4, 1.2, '#111'); line(g, cx + 7.4, cy - .6, cx + 5.6, cy + 1.4, 1.2, '#111'); }
  else { g.beginPath(); g.ellipse(cx + 3, cy + .4, 1.1, 1.7, 0, 0, TAU); g.ellipse(cx + 6.6, cy + .4, 1.1, 1.7, 0, 0, TAU); g.fill(); }
  if (!ninja) {
    if (P.mouth) { g.beginPath(); g.ellipse(cx + 5.2, cy + 5, 1.9, P.mouth === 2 ? 1.2 : 2.2, 0, 0, TAU); g.fillStyle = '#6a1a1a'; g.fill(); }
    else line(g, cx + 3.6, cy + 5, cx + 6.6, cy + 4.6, 1, '#6a2a1a');
  }
  /* Muay Thai: mongkhon (cordão sagrado na cabeça) */
  if (sid === 'mt') { g.strokeStyle = C(sch.trim); g.lineWidth = 2.4; g.beginPath(); g.arc(cx, cy - 1, 8.4, PI * 1.02, TAU * 1.0); g.stroke(); g.strokeStyle = C('#ffe27a'); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy - 1, 8.4, PI * 1.02, TAU * 1.0); g.stroke(); g.fillStyle = C(sch.trim); g.beginPath(); g.arc(cx, cy - 9.6, 2.4, 0, TAU); g.fill(); }
  /* faixa na testa (hachimaki) com pontas voando */
  const bc = C(sid === 'ka' ? '#ffffff' : sid === 'tk' ? sch.trim : club.band);
  g.fillStyle = bc; g.beginPath(); g.moveTo(cx - 8.4, cy - 4.8); g.lineTo(cx + 8.4, cy - 4.8); g.lineTo(cx + 8, cy - 1.4); g.lineTo(cx - 8, cy - 1.4); g.fill();
  g.fillStyle = C('#c8102e'); g.beginPath(); g.arc(cx + 3.6, cy - 3.1, 1.3, 0, TAU); g.fill();
  const fw = Math.sin(time * 11 + f.id) * 2.2;
  g.strokeStyle = bc; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 8, cy - 3); g.quadraticCurveTo(cx - 14, cy - 4 + fw, cx - 20, cy - 1 - fw); g.stroke();
  g.beginPath(); g.moveTo(cx - 8, cy - 3); g.quadraticCurveTo(cx - 13, cy - 1 - fw, cx - 18, cy + 3 + fw); g.stroke();
  /* chefe: apito dourado e cartões */
  if (f.kind === 'boss') {
    g.fillStyle = C('#ffd23a'); g.beginPath(); g.ellipse(cx + 6, cy + 5.6, 3, 1.6, 0, 0, TAU); g.fill();
    g.fillStyle = C('#f2d600'); g.fillRect(shx + 2, shy + 5, 4.2, 6); g.fillStyle = C('#d11'); g.fillRect(shx + 4, shy + 7, 4.2, 6);
  }
  /* braço da frente */
  arm(P.fh, false);
  /* bandeira do bandeirinha */
  if (f.kind === 'flag') { const ax = shx + 1 + P.fh.x, ay = shy + 2 + P.fh.y; line(g, ax - 2, ay + 6, ax + 3, ay - 16, 1.6, '#ccc'); g.fillStyle = C('#ffcf1a'); g.beginPath(); g.moveTo(ax + 3, ay - 16); g.lineTo(ax + 15 + fw, ay - 13); g.lineTo(ax + 3, ay - 9); g.fill(); g.fillStyle = C('#d11'); g.beginPath(); g.moveTo(ax + 3, ay - 16); g.lineTo(ax + 15 + fw, ay - 13); g.lineTo(ax + 3, ay - 12.5); g.fill(); }
  g.restore();
}

function drawShadow(g, x, y, z, S){
  const k = clamp(1 - z / 90, .35, 1);
  g.fillStyle = 'rgba(0,0,0,' + (.32 * k) + ')'; g.beginPath(); g.ellipse(x, y + 1, 14 * S * k, 4.2 * S * k, 0, 0, TAU); g.fill();
}

function drawBall(g, x, y, r, spin){
  g.save(); g.translate(x, y); g.rotate(spin);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = '#222'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.lineTo(Math.cos(a) * r * .45, Math.sin(a) * r * .45); } g.fill();
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(Math.cos(a) * r * .85, Math.sin(a) * r * .85, r * .25, 0, TAU); g.fill(); }
  g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.restore();
}
function drawCard(g, x, y, red, spin){
  g.save(); g.translate(x, y); g.rotate(spin); g.fillStyle = red ? '#e11d2a' : '#ffd400'; g.strokeStyle = '#111'; g.lineWidth = 1.2;
  g.fillRect(-4, -6, 8, 12); g.strokeRect(-4, -6, 8, 12); g.restore();
}
function drawPastel(g, x, y, t){
  const b = Math.sin(t * 5) * 1.5;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 1, 9, 3, 0, 0, TAU); g.fill();
  g.save(); g.translate(x, y - 8 + b);
  g.fillStyle = '#e8a840'; g.beginPath(); g.moveTo(-9, 3); g.quadraticCurveTo(-9, -8, 0, -8); g.quadraticCurveTo(9, -8, 9, 3); g.closePath(); g.fill();
  g.strokeStyle = '#8a4a14'; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = '#b8742a'; g.lineWidth = 1.4; for (let i = -6; i <= 6; i += 3) { g.beginPath(); g.moveTo(i, 3); g.lineTo(i * .9, -.5); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(-3, -4, 2, 0, TAU); g.fill();
  g.fillStyle = '#ffe066'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText('+', 0, -12);
  g.restore();
}

/* ============================ CENÁRIOS ============================ */
function layer(w, h, rs, fn){
  const c = document.createElement('canvas'); c.width = Math.ceil(w * rs); c.height = Math.ceil(h * rs);
  const g = c.getContext('2d'); g.scale(rs, rs); fn(g, w, h); return {c, w, h};
}
function tile(g, L, fac, cam, y, VW, alpha){
  const x0 = -((cam * fac) % L.w); if (alpha != null) g.globalAlpha = alpha;
  for (let x = x0; x < VW; x += L.w) g.drawImage(L.c, Math.floor(x), y, L.w + 1, L.h);
  g.globalAlpha = 1;
}
function glow(g, x, y, r, col, a){
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a == null ? 1 : a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
function pagoda(g, x, y, w, h, col){
  g.fillStyle = col; const tiers = 5, th = h / tiers;
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * .15), ty = y - h + i * th;
    g.beginPath(); g.moveTo(x - tw / 2 - 5, ty + th * .55); g.quadraticCurveTo(x - tw / 2, ty + th * .5, x - tw * .35, ty); g.lineTo(x + tw * .35, ty); g.quadraticCurveTo(x + tw / 2, ty + th * .5, x + tw / 2 + 5, ty + th * .55); g.closePath(); g.fill();
    g.fillRect(x - tw * .3, ty + th * .5, tw * .6, th * .5 + 1);
  }
  g.fillRect(x - 1, y - h - 14, 2, 16);
}
function torii(g, x, y, w, h, col){
  g.fillStyle = col;
  g.fillRect(x - w / 2 + w * .1, y - h, w * .07, h); g.fillRect(x + w / 2 - w * .17, y - h, w * .07, h);
  g.fillRect(x - w * .38, y - h * .72, w * .76, h * .07);
  g.beginPath(); g.moveTo(x - w * .62, y - h * .93); g.quadraticCurveTo(x, y - h * .8, x + w * .62, y - h * .93); g.lineTo(x + w * .55, y - h * 1.02); g.quadraticCurveTo(x, y - h * .9, x - w * .55, y - h * 1.02); g.closePath(); g.fill();
}
function lantern(g, x, y, r, col, gl){
  if (gl) glow(g, x, y, r * 4.5, gl, .55);
  g.strokeStyle = '#2a1a10'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - r * 1.9); g.lineTo(x, y - r); g.stroke();
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * .85, r * 1.15, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .8; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(x, y, r * .85 * (i === 0 ? .1 : .55), r * 1.15, 0, 0, TAU); if (i !== 0) g.stroke(); }
  g.fillStyle = '#2a1a10'; g.fillRect(x - r * .45, y - r * 1.25, r * .9, r * .3); g.fillRect(x - r * .45, y + r * .95, r * .9, r * .3);
}
function sakura(g, x, y, s, rnd){
  g.strokeStyle = '#3a2218'; g.lineCap = 'round'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 6 * s, y - 40 * s, x + 4 * s, y - 70 * s); g.stroke();
  g.lineWidth = 3.4 * s; g.beginPath(); g.moveTo(x + 2 * s, y - 45 * s); g.quadraticCurveTo(x + 24 * s, y - 62 * s, x + 38 * s, y - 70 * s); g.stroke();
  g.beginPath(); g.moveTo(x, y - 38 * s); g.quadraticCurveTo(x - 20 * s, y - 56 * s, x - 36 * s, y - 62 * s); g.stroke();
  const cols = ['#ffb7c9', '#ff9cb5', '#ffd0dd', '#f48fb1'];
  for (let i = 0; i < 46; i++) { const a = rnd() * TAU, d = rnd() * 44 * s; g.fillStyle = cols[i % 4]; g.globalAlpha = .88; g.beginPath(); g.arc(x + 2 * s + Math.cos(a) * d * 1.25, y - 76 * s + Math.sin(a) * d * .62, (5 + rnd() * 7) * s, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}
function pine(g, x, y, s, col){
  g.fillStyle = col; g.fillRect(x - 2 * s, y - 14 * s, 4 * s, 14 * s);
  for (let i = 0; i < 4; i++) { const w = (22 - i * 4) * s, yy = y - 12 * s - i * 11 * s; g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy - 16 * s, x + w, yy); g.quadraticCurveTo(x, yy - 4 * s, x - w, yy); g.fill(); }
}

function chedi(g, x, y, s, col, dk){
  g.fillStyle = dk; g.fillRect(x - 30 * s, y - 10 * s, 60 * s, 10 * s); g.fillRect(x - 24 * s, y - 20 * s, 48 * s, 10 * s);
  g.fillStyle = col; g.beginPath(); g.moveTo(x - 20 * s, y - 20 * s); g.quadraticCurveTo(x - 22 * s, y - 62 * s, x, y - 70 * s); g.quadraticCurveTo(x + 22 * s, y - 62 * s, x + 20 * s, y - 20 * s); g.fill();
  g.fillStyle = dk; for (let i = 0; i < 4; i++) g.fillRect(x - (15 - i * 3) * s, y - (26 + i * 12) * s, (30 - i * 6) * s, 2.4 * s);
  g.fillStyle = col; g.beginPath(); g.moveTo(x - 4 * s, y - 70 * s); g.lineTo(x, y - 112 * s); g.lineTo(x + 4 * s, y - 70 * s); g.fill();
  g.fillStyle = '#ffeaa0'; g.beginPath(); g.arc(x, y - 112 * s, 2.2 * s, 0, TAU); g.fill();
}
function prang(g, x, y, w, h, col, dk){
  g.fillStyle = dk; g.fillRect(x - w * .6, y - 12, w * 1.2, 12);
  for (let i = 0; i < 5; i++) {
    const t0 = i / 5, t1 = (i + 1) / 5, yy0 = y - 12 - (h - 12) * t0, yy1 = y - 12 - (h - 12) * t1, w0 = w * (1 - t0 * .78) / 2, w1 = w * (1 - t1 * .78) / 2;
    g.fillStyle = i % 2 ? col : dk; g.beginPath(); g.moveTo(x - w0, yy0); g.lineTo(x - w1 - 3, yy1); g.lineTo(x + w1 + 3, yy1); g.lineTo(x + w0, yy0); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, yy1 + 4, 6, (yy0 - yy1) * .55);
  }
  g.fillStyle = col; g.fillRect(x - 1.2, y - h - 14, 2.4, 16); g.fillRect(x - 5, y - h - 6, 10, 2);
}
function palm(g, x, y, s, col){
  g.strokeStyle = col; g.lineWidth = 3.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10 * s, y - 40 * s, x + 4 * s, y - 78 * s); g.stroke();
  g.lineWidth = 2.2 * s; for (let i = 0; i < 7; i++) { const a = -Math.PI * .95 + i * Math.PI * .32; g.beginPath(); g.moveTo(x + 4 * s, y - 78 * s); g.quadraticCurveTo(x + 4 * s + Math.cos(a) * 18 * s, y - 78 * s + Math.sin(a) * 14 * s - 6 * s, x + 4 * s + Math.cos(a) * 34 * s, y - 78 * s + Math.sin(a) * 6 * s + 14 * s); g.stroke(); }
}
function elephant(g, x, y, s, body, cloth){
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = body; g.beginPath(); g.ellipse(0, -30, 30, 22, 0, 0, TAU); g.fill();
  g.fillRect(-24, -20, 11, 20); g.fillRect(12, -20, 11, 20);
  g.beginPath(); g.ellipse(28, -42, 15, 15, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(36, -36); g.quadraticCurveTo(48, -26, 40, -6); g.quadraticCurveTo(36, -2, 33, -8); g.quadraticCurveTo(38, -24, 30, -32); g.fill();
  g.beginPath(); g.ellipse(18, -44, 8, 11, 0, 0, TAU); g.fill();
  g.fillStyle = '#f5ecd0'; g.beginPath(); g.moveTo(36, -34); g.quadraticCurveTo(50, -34, 52, -24); g.quadraticCurveTo(44, -28, 36, -28); g.fill();
  g.fillStyle = cloth; g.fillRect(-20, -44, 38, 26); g.fillStyle = '#f2c200'; g.fillRect(-20, -44, 38, 4); g.fillRect(-20, -22, 38, 4);
  g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(-1, -31, 5, 0, TAU); g.fill(); g.fillStyle = cloth; g.beginPath(); g.arc(-1, -31, 2.4, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(32, -46, 1.4, 0, TAU); g.fill();
  g.restore();
}
function garland(g, x1, x2, y, sag, n, R){
  g.strokeStyle = '#3a6a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x1, y); g.quadraticCurveTo((x1 + x2) / 2, y + sag, x2, y); g.stroke();
  for (let i = 0; i <= n; i++) { const t = i / n, px = x1 + (x2 - x1) * t, py = y + 2 * t * (1 - t) * sag; g.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ff9a1a' : '#ffc21a'; g.beginPath(); g.arc(px, py + 3, 3, 0, TAU); g.fill(); }
}
function makeStage(theme, ca, cb){
  const H = 270, HZ = 150, rs = 1.6, S = {theme, amb: [], bursts: []};
  const R = mulberry(theme.length * 977 + 11);

  if (theme === 'temple') {
    S.far = layer(1000, 150, rs, (g, w, h) => {
      g.fillStyle = '#6a2f58'; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 25) g.lineTo(x, h - 38 - Math.sin(x * .013) * 20 - R() * 14); g.lineTo(w, h); g.fill();
      g.fillStyle = '#8a4a78'; g.beginPath(); g.moveTo(290, h); g.lineTo(480, h - 108); g.lineTo(530, h - 108); g.lineTo(720, h); g.fill();
      g.fillStyle = '#fff6f0'; g.beginPath(); g.moveTo(463, h - 98); g.lineTo(480, h - 108); g.lineTo(530, h - 108); g.lineTo(547, h - 98); g.lineTo(530, h - 92); g.lineTo(515, h - 99); g.lineTo(500, h - 91); g.lineTo(485, h - 98); g.fill();
    });
    S.mid = layer(900, 150, rs, (g, w, h) => {
      pagoda(g, 190, h, 74, 112, '#3b1533'); pagoda(g, 640, h, 56, 84, '#3b1533');
      for (let i = 0; i < 12; i++) pine(g, 20 + i * 76 + R() * 30, h, .7 + R() * .4, '#2f1128');
      g.fillStyle = '#331230'; g.fillRect(0, h - 14, w, 14);
    });
    S.near = layer(1200, 150, rs, (g, w, h) => {
      torii(g, 330, h, 140, 112, '#c8202c');
      sakura(g, 90, h, 1.25, R); sakura(g, 720, h, 1.45, R); sakura(g, 1060, h, 1.1, R);
      lantern(g, 560, h - 52, 7, '#ff7a3a', '#ff9a4a'); lantern(g, 885, h - 60, 7, '#ff7a3a', '#ff9a4a');
      g.fillStyle = '#6d6068'; g.fillRect(550, h - 40, 20, 40); g.fillRect(545, h - 44, 30, 6); // lanterna de pedra
    });
    S.floorT = layer(256, 120, rs, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5e4c52'); gr.addColorStop(1, '#8a7478'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let y = 0, row = 0; while (y < h) { const rh = 10 + y * .16; g.strokeStyle = 'rgba(30,15,25,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        const cw = 40 + y * .5, off = (row % 2) * cw / 2; for (let x = -off; x < w; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke(); g.fillStyle = 'rgba(255,255,255,' + (.02 + R() * .05) + ')'; g.fillRect(x + 1, y + 1, cw - 2, rh - 2); }
        y += rh; row++; }
    });
  }
  else if (theme === 'bridge') {
    S.far = layer(1000, 150, rs, (g, w, h) => {
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (.25 + R() * .6) + ')'; g.fillRect(R() * w, R() * 80, 1.4, 1.4); }
      g.fillStyle = '#0d1530'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 20) g.lineTo(x, h - 30 - Math.sin(x * .02) * 14 - R() * 10); g.lineTo(w, h); g.fill();
      for (let i = 0; i < 70; i++) { g.fillStyle = R() > .5 ? '#ffd27a' : '#fff0b0'; g.globalAlpha = .6 + R() * .4; g.fillRect(R() * w, h - 8 - R() * 34, 1.6, 1.6); } g.globalAlpha = 1;
    });
    S.mid = layer(1000, 150, rs, (g, w, h) => {
      for (const tx of [150, 650]) {
        g.fillStyle = '#1b2748'; g.fillRect(tx - 7, h - 112, 5, 112); g.fillRect(tx + 2, h - 112, 5, 112); g.fillRect(tx - 9, h - 112, 18, 5); g.fillRect(tx - 9, h - 70, 18, 3);
        glow(g, tx, h - 112, 14, '#ffd27a', .7);
      }
      g.strokeStyle = '#2d3c6b'; g.lineWidth = 2;
      const cable = (x1, x2, y1, y2, sag) => { g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag, x2, y2); g.stroke(); };
      cable(-100, 150, h - 20, h - 112, 40); cable(150, 650, h - 112, h - 112, 62); cable(650, 1150, h - 112, h - 112, 62);
      g.lineWidth = 1; g.strokeStyle = '#26345c';
      for (let x = 160; x < 650; x += 16) { const t = (x - 150) / 500, y = (h - 112) + 4 * t * (1 - t) * 31; g.beginPath(); g.moveTo(x, y); g.lineTo(x, h - 6); g.stroke(); if (x % 64 === 0) { g.fillStyle = '#ffd27a'; g.globalAlpha = .8; g.fillRect(x - 1, y - 1, 2, 2); g.globalAlpha = 1; } }
      g.fillStyle = '#16203d'; g.fillRect(0, h - 8, w, 8);
    });
    S.near = layer(640, 150, rs, (g, w, h) => {
      g.strokeStyle = '#3b1d14'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, 22); g.quadraticCurveTo(w / 2, 56, w + 10, 22); g.stroke();
      for (let i = 0; i < 8; i++) { const x = 40 + i * 80, t = x / w, y = 22 + 4 * t * (1 - t) * 17; lantern(g, x, y + 10, 8, i % 2 ? '#ff5a3a' : '#ffb23a', i % 2 ? '#ff7a4a' : '#ffc860'); }
      g.fillStyle = '#2b1612'; g.fillRect(0, h - 12, w, 12); for (let x = 0; x < w; x += 64) { g.fillRect(x, h - 34, 5, 24); lantern(g, x + 2.5, h - 40, 5, '#ff7a3a', '#ff9a4a'); }
    });
    S.floorT = layer(240, 120, rs, (g, w, h) => {
      g.fillStyle = '#4a2a1d'; g.fillRect(0, 0, w, h);
      let y = 0, row = 0; while (y < h) { const rh = 9 + y * .17; g.strokeStyle = 'rgba(20,8,4,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        const cw = 80 + y * .6, off = (row * 37) % cw; for (let x = -off; x < w + cw; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke(); g.fillStyle = 'rgba(255,170,90,' + (.03 + R() * .07) + ')'; g.fillRect(x + 1, y + 1, cw - 2, rh - 2); }
        y += rh; row++; }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(.3, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  else if (theme === 'wat') {
    S.far = layer(1000, 150, rs, (g, w, h) => {
      g.fillStyle = '#3a1f55'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 25) g.lineTo(x, h - 26 - Math.sin(x * .017) * 14 - R() * 8); g.lineTo(w, h); g.fill();
      for (const x of [120, 430, 700, 930]) chedi(g, x, h - 6, .62 + R() * .2, '#a8762a', '#6a4a1a');
    });
    S.mid = layer(900, 150, rs, (g, w, h) => {
      prang(g, 230, h, 66, 120, '#e8b848', '#8a5a1a'); chedi(g, 520, h, 1.05, '#f2c75a', '#9a6a1c'); prang(g, 790, h, 52, 92, '#e8b848', '#8a5a1a');
      for (const x of [60, 380, 650, 860]) palm(g, x, h, .9 + R() * .25, '#1c2a24');
      g.fillStyle = '#2a1a2e'; g.fillRect(0, h - 10, w, 10);
    });
    S.near = layer(1100, 150, rs, (g, w, h) => {
      garland(g, 40, 330, 18, 26, 14, R); garland(g, 330, 640, 18, 28, 15, R); garland(g, 640, 960, 18, 26, 15, R);
      for (const x of [330, 640, 960]) { g.fillStyle = '#6a1a1a'; g.fillRect(x - 3, 8, 6, 14); }
      elephant(g, 250, h, 1.25, '#7a6a72', '#c8102e'); elephant(g, 840, h, 1.25, '#7a6a72', '#1c56d8');
      for (const x of [520, 1010]) { g.strokeStyle = '#2a1a18'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 48); g.stroke(); lantern(g, x, 56, 9, '#ff3a2a', '#ff7a4a'); }
    });
    S.floorT = layer(256, 120, rs, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1e3f93'); gr.addColorStop(1, '#2b58c0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,20,.18)'; for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, w, 3);
    });
  }
  else { // dojo-estádio
    S.far = layer(960, 150, rs, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b160f'); gr.addColorStop(1, '#4a2a1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 120) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(255,225,170,.12)'; g.fillRect(x + 12, 28, 96, 82); g.strokeStyle = 'rgba(40,20,10,.7)'; g.lineWidth = 1.4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x + 12 + i * 24, 28); g.lineTo(x + 12 + i * 24, 110); g.stroke(); } for (let j = 0; j <= 3; j++) { g.beginPath(); g.moveTo(x + 12, 28 + j * 27.3); g.lineTo(x + 108, 28 + j * 27.3); g.stroke(); } }
      glow(g, 480, 70, 170, '#c8202c', .35); g.fillStyle = '#d6202c'; g.beginPath(); g.arc(480, 66, 30, 0, TAU); g.fill();
      for (let x = 60; x < w; x += 120) lantern(g, x, 22, 8, '#d83a2a', '#ff8a5a');
    });
    const CA = KF.CLUBS[ca] || KF.CLUBS.fig, CB = KF.CLUBS[cb] || KF.CLUBS.ava;
    const flagCol = c => (c.a === '#f5f5f5' || c.a === '#ffffff') ? c.b : c.a;
    S.bann = layer(960, 100, rs, (g, w, h) => {
      for (let i = 0; i < 12; i++) {
        const x = 20 + i * 80, fig = i % 2 === 0; g.fillStyle = '#e8d8b0'; g.fillRect(x - 3, 0, 36, 3);
        g.beginPath(); g.moveTo(x, 3); g.lineTo(x + 30, 3); g.lineTo(x + 30, 70); g.lineTo(x + 15, 80); g.lineTo(x, 70); g.closePath(); g.save(); g.clip();
        const cc = fig ? CA : CB; g.fillStyle = cc.a; g.fillRect(x, 0, 30, 90); g.fillStyle = cc.b === cc.a ? '#fff' : cc.b; for (let s = 0; s < 30; s += 10) g.fillRect(x + s + 5, 0, 5, 90); g.restore();
        g.fillStyle = '#f2c200'; g.beginPath(); g.arc(x + 15, 34, 5, 0, TAU); g.fill();
      }
    });
    const mkCrowd = ph => layer(800, 80, rs, (g, w, h) => {
      const r = mulberry(5); const row = [{y: 64, s: 1}, {y: 48, s: .9}, {y: 33, s: .8}];
      g.fillStyle = '#1b0f0c'; g.fillRect(0, 0, w, h);
      for (const rw of row) for (let x = 6; x < w; x += 15 * rw.s) {
        const t = r() , jb = Math.sin(ph * PI + x * .3) * 2.2, cl = r() < .5 ? CA : CB, pal = [cl.a, cl.b === cl.a ? '#fff' : cl.b];
        g.fillStyle = pal[0]; g.fillRect(x - 5 * rw.s, rw.y - 12 * rw.s + jb, 10 * rw.s, 14 * rw.s); g.fillStyle = pal[1]; g.fillRect(x - 1.5 * rw.s, rw.y - 12 * rw.s + jb, 3 * rw.s, 14 * rw.s);
        g.fillStyle = KF.SKINS[Math.floor(r() * 5)]; g.beginPath(); g.arc(x, rw.y - 17 * rw.s + jb, 4.6 * rw.s, 0, TAU); g.fill();
        if (r() < .3) { const up = Math.sin(ph * PI + x) * 3; line(g, x + 5 * rw.s, rw.y - 10 * rw.s + jb, x + 8 * rw.s, rw.y - 28 * rw.s + jb + up, 1.2, '#ddd'); g.fillStyle = flagCol(cl); g.fillRect(x + 8 * rw.s, rw.y - 29 * rw.s + jb + up, 10 * rw.s, 6 * rw.s); }
      }
    });
    S.crowdA = mkCrowd(0); S.crowdB = mkCrowd(1);
    S.floorT = layer(256, 120, rs, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9a7040'); gr.addColorStop(1, '#c79a5c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let y = 0; while (y < h) { const rh = 8 + y * .13; g.strokeStyle = 'rgba(60,30,10,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); const cw = 70 + y; for (let x = ((y * 13) % cw) * -1; x < w; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke(); } y += rh; }
    });
  }
  S.draw = function(g, cam, VW, t, dt){
    const th = S.theme;
    if (th === 'temple') {
      const sg = g.createLinearGradient(0, 0, 0, HZ); sg.addColorStop(0, '#2b0f3a'); sg.addColorStop(.55, '#b03a5a'); sg.addColorStop(1, '#ffb26a'); g.fillStyle = sg; g.fillRect(0, 0, VW, HZ + 2);
      const sx = 380 - cam * .04; glow(g, sx, 108, 120, '#ff7a4a', .55); g.fillStyle = '#ff4a3a'; g.beginPath(); g.arc(sx, 108, 44, 0, TAU); g.fill();
      for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,190,200,.22)'; const cx = ((i * 260 - cam * .08) % (VW + 300) + VW + 300) % (VW + 300) - 120; g.beginPath(); g.ellipse(cx, 40 + i * 14, 70, 10, 0, 0, TAU); g.fill(); }
      tile(g, S.far, .12, cam, HZ - 150, VW); tile(g, S.mid, .35, cam, HZ - 150, VW); tile(g, S.near, .7, cam, HZ - 150, VW);
    } else if (th === 'bridge') {
      const sg = g.createLinearGradient(0, 0, 0, HZ); sg.addColorStop(0, '#050a1c'); sg.addColorStop(.7, '#16244f'); sg.addColorStop(1, '#3a3a70'); g.fillStyle = sg; g.fillRect(0, 0, VW, HZ + 2);
      const mx = 420 - cam * .03; glow(g, mx, 52, 70, '#fff6d0', .5); g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(mx, 52, 20, 0, TAU); g.fill(); g.fillStyle = '#e6dcb0'; g.beginPath(); g.arc(mx - 5, 48, 4, 0, TAU); g.arc(mx + 6, 58, 3, 0, TAU); g.fill();
      tile(g, S.far, .1, cam, HZ - 150, VW); tile(g, S.mid, .3, cam, HZ - 150, VW);
      /* fogos de artifício */
      S.fw = S.fw || {t: 0, list: []}; S.fw.t -= dt;
      if (S.fw.t <= 0) { S.fw.t = .5 + Math.random() * 1.1; S.fw.list.push({x: Math.random() * VW, y: 25 + Math.random() * 60, a: 0, c: ['#ff5a7a', '#ffd23a', '#6af', '#8f8'][Math.floor(Math.random() * 4)]}); }
      g.globalCompositeOperation = 'lighter';
      S.fw.list = S.fw.list.filter(f => (f.a += dt) < 1.3);
      for (const f of S.fw.list) { const r = easeOut(f.a / 1.3) * 42, al = 1 - f.a / 1.3; g.fillStyle = f.c; g.globalAlpha = al; for (let i = 0; i < 18; i++) { const an = i / 18 * TAU; g.beginPath(); g.arc(f.x + Math.cos(an) * r, f.y + Math.sin(an) * r + f.a * 14, 1.7, 0, TAU); g.fill(); } }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      tile(g, S.near, .65, cam, HZ - 150, VW);
    } else if (th === 'wat') {
      const sg = g.createLinearGradient(0, 0, 0, HZ); sg.addColorStop(0, '#190b38'); sg.addColorStop(.5, '#a83a78'); sg.addColorStop(1, '#ffb347'); g.fillStyle = sg; g.fillRect(0, 0, VW, HZ + 2);
      const sx = 330 - cam * .03; glow(g, sx, 112, 110, '#ffd27a', .5); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(sx, 112, 34, 0, TAU); g.fill();
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (.2 + (i * 37 % 10) / 20) + ')'; g.fillRect((i * 97) % VW, (i * 53) % 60, 1.2, 1.2); }
      tile(g, S.far, .12, cam, HZ - 150, VW); tile(g, S.mid, .35, cam, HZ - 150, VW); tile(g, S.near, .7, cam, HZ - 150, VW);
    } else {
      g.fillStyle = '#2b160f'; g.fillRect(0, 0, VW, HZ + 2);
      tile(g, S.far, .15, cam, HZ - 150, VW);
      tile(g, S.bann, .25, cam, 4, VW);
      tile(g, (Math.floor(t * 3.5) % 2) ? S.crowdA : S.crowdB, .5, cam, HZ - 82, VW);
    }
    /* chão */
    tile(g, S.floorT, 1, cam, HZ, VW);
    if (th === 'dojo') {   // marcações de campo no tatame
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; const cx = 520 - cam;
      g.beginPath(); g.ellipse(cx, 212, 105, 36, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(cx, 158); g.lineTo(cx, 268); g.stroke();
      g.beginPath(); g.arc(cx, 212, 3, 0, TAU); g.fillStyle = '#fff'; g.fill();
    }
    if (th === 'wat') {   // cordas do ringue de Muay Thai
      const cols = ['#d11a2a', '#f5f5f5', '#1c56d8'];
      for (let i = 0; i < 3; i++) { g.strokeStyle = cols[i]; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, HZ - 6 - i * 9); g.lineTo(VW, HZ - 6 - i * 9); g.stroke(); }
      for (let x = -((cam % 260) + 260) % 260; x < VW + 40; x += 260) { g.fillStyle = '#2b2b33'; g.fillRect(x - 3, HZ - 36, 6, 38); g.fillStyle = '#d11a2a'; g.fillRect(x - 5, HZ - 30, 10, 20); }
      S.amb2 = S.amb2 || []; while (S.amb2.length < 14) S.amb2.push({x: Math.random() * 700, y: Math.random() * 150, v: 6 + Math.random() * 8, p: Math.random() * 6});
      for (const p of S.amb2) { p.y -= p.v * dt; p.p += dt; if (p.y < -10) { p.y = 150 + Math.random() * 20; p.x = Math.random() * (VW + 100); } const px = p.x + Math.sin(p.p) * 8; glow(g, px, p.y, 9, '#ffb04a', .55); g.fillStyle = '#ffd27a'; g.fillRect(px - 2, p.y - 2.5, 4, 5); }
    }
    if (th === 'bridge') { g.fillStyle = '#1b0e0a'; g.fillRect(0, HZ, VW, 5); }
    /* pétalas */
    if (th === 'temple') {
      while (S.amb.length < 34) S.amb.push({x: Math.random() * 700, y: Math.random() * 270, v: 14 + Math.random() * 22, p: Math.random() * 6, s: 1.5 + Math.random() * 1.8});
      g.fillStyle = 'rgba(255,190,210,.9)';
      for (const p of S.amb) { p.y += p.v * dt; p.x -= (6 + p.v * .35) * dt; p.p += dt * 2; if (p.y > 275 || p.x < -10) { p.y = -8; p.x = Math.random() * (VW + 120); } g.beginPath(); g.ellipse(p.x + Math.sin(p.p) * 6, p.y, p.s, p.s * .6, p.p, 0, TAU); g.fill(); }
    }
  };
  return S;
}

KF.art = {pose, drawFighter, drawShadow, drawBall, drawCard, drawPastel, makeStage, glow, line};
})();
