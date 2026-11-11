/* ===== MAIN: telas, HUD, salvamento, modo solo e modo online ===== */
(function(){
const KF = window.KF, au = KF.audio, In = KF.input, V = KF.view, N = KF.net;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const G = KF.game = KF.createGame();          // simulação do modo solo
const SAVE = 'kfi_save_v2';
let save = {best: 0, cleared: 0, club: 'fig', rival: 'ava', name: '', school: 'kf', look: [1, 0, 1]};
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

const UI = KF.ui = {mode: 'title', paused: false, modal: false};
let club = save.club, rival = save.rival, tTitle = 0, last = performance.now();
const view = {k: 1, VW: 480, offY: 0};

/* ---------- tamanho ---------- */
function resize(){
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  if (innerHeight * dpr > 900) dpr = 900 / innerHeight;
  canvas.width = Math.max(2, Math.round(innerWidth * dpr)); canvas.height = Math.max(2, Math.round(innerHeight * dpr));
  view.k = Math.min(canvas.height / 270, canvas.width / 440); view.VW = canvas.width / view.k; view.offY = (canvas.height - 270 * view.k) / 2;
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();

/* ---------- telas ---------- */
const scr = $('screen');
function show(html, cls){ scr.innerHTML = html; scr.className = cls || ''; UI.modal = true; }
function hide(){ scr.className = 'hidden'; scr.innerHTML = ''; UI.modal = false; }
const sndLabel = () => au.muted ? '🔇 SOM: DESLIGADO' : '🔊 SOM: LIGADO';
const hideGame = () => { $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); };
function swatch(id){
  const k = KF.CLUBS[id], a = k.a, b = k.b, c = k.c;
  switch (k.pat) {
    case 'stripes': return 'repeating-linear-gradient(90deg,' + a + ' 0 5px,' + b + ' 5px 10px)';
    case 'hoops': return 'repeating-linear-gradient(0deg,' + a + ' 0 5px,' + b + ' 5px 10px)';
    case 'hoops3': return 'linear-gradient(0deg,' + a + ' 0 30%,' + c + ' 30% 45%,' + a + ' 45% 60%,' + b + ' 60% 80%,' + a + ' 80%)';
    case 'halves': return 'linear-gradient(90deg,' + a + ' 50%,' + b + ' 50%)';
    case 'tricolor': return 'linear-gradient(90deg,' + a + ' 33%,' + b + ' 33% 66%,' + c + ' 66%)';
    case 'sash': return 'linear-gradient(135deg,' + a + ' 36%,' + b + ' 36% 62%,' + a + ' 62%)';
    default: return 'linear-gradient(180deg,' + b + ' 0 14%,' + a + ' 14%)';
  }
}
const chip = (id, extra) => '<button class="chip" data-act="club" data-club="' + id + '"><i style="background:' + swatch(id) + '"></i><span>' + esc(KF.CLUBS[id].name) + '</span>' + (extra || '') + '</button>';
const clubTag = id => '<span class="ctag"><i style="background:' + swatch(id) + '"></i>' + esc(KF.CLUBS[id].name) + '</span>';
function boardHtml(){
  const rows = N.board || []; if (!rows.length) return '<p class="hint" style="animation:none">Ainda sem pontos. Seja o primeiro!</p>';
  const top = rows[0].pts || 1;
  return '<div class="board">' + rows.slice(0, 6).map((r, i) => KF.CLUBS[r.club] ? '<div class="brow"><b>' + (i + 1) + '</b><i style="background:' + swatch(r.club) + '"></i><span>' + esc(KF.CLUBS[r.club].name) + '</span><u style="width:' + Math.max(6, r.pts / top * 100) + '%"></u><em>' + r.pts + '</em></div>' : '').join('') + '</div>';
}

function titleScreen(){
  UI.mode = 'title'; UI.paused = false; hideGame(); N.live = false;
  show('<div class="title"><div class="seal">島</div><h1 class="logo"><span>' + KF.TITLE[0] + '</span><span>' + KF.TITLE[1] + '</span></h1>' +
    '<p class="sub">O CLÁSSICO VIROU ARTE MARCIAL — TIMES E RIVAIS</p>' +
    '<button class="btn big" data-act="play">▶ JOGAR SOZINHO</button>' +
    '<button class="btn" data-act="online">👥 JOGAR COM A TURMA</button>' +
    '<div class="row"><button class="btn alt" data-act="how">❓ COMO JOGAR</button><button class="btn alt" data-act="snd">' + sndLabel() + '</button></div>' +
    (save.best ? '<p class="hint" style="animation:none;opacity:.9">RECORDE: ' + save.best + '</p>' : '<p class="hint">toque para começar</p>') + '</div>', 'clear');
  au.music('title');
}
function howScreen(back){
  show('<div class="card"><h2>COMO JOGAR</h2>' +
    '<div class="ctrls"><div><i>🕹</i> Joystick à esquerda: andar</div><div><i>拳</i> SOCO: toque 3x = combo</div><div><i>蹴</i> CHUTE: golpe forte que derruba</div><div><i>跳</i> PULO (ataque no ar = voadora)</div>' +
    '<div><i>龍</i> ESPECIAL: giro que acerta todo mundo (gasta KI) — muda conforme a escola de luta</div><div><i>🥟</i> Pastel de camarão recupera vida</div></div>' +
    '<p class="tip">Acerte as bolas e cartões <b>com um golpe</b> para devolvê-los! Online: crie uma sala, passe o código de 4 letras e lutem juntos (até 6). Os pontos de cada sala somam no placar do seu time. Teclado: setas/WASD + J (soco), K (chute), L (pulo), U (dragão).</p>' +
    '<div class="row"><button class="btn" data-act="' + (back || 'title') + '">OK, ENTENDI</button></div></div>', 'solid');
}

/* ----- escolha de clube (solo e online) ----- */
let pickCb = null;
function pickScreen(title, ids, back, cb){
  pickCb = cb;
  show('<div class="card wide"><h2>' + title + '</h2><div class="clubs scroll">' + ids.map(id => chip(id)).join('') + '</div><div class="row"><button class="btn alt" data-act="' + back + '">◀ VOLTAR</button></div></div>', 'solid');
}

/* ----- seleção de lutador: time, escola de luta e aparência ----- */
const STY_NAMES = ['Curto', 'Espetado', 'Longo', 'Coque', 'Careca'], STAT_L = ['PODER', 'VELOC.', 'RESIST.'];
let sel = {club: save.club, rival: save.rival, school: save.school || 'kf', lk: Array.isArray(save.look) && save.look.length === 3 ? save.look.slice() : [1, 0, 1]};
let selOpts = null, pvRaf = 0;
const schoolOf = id => KF.SCHOOLS.find(x => x.id === id) || KF.SCHOOLS[0];
const cyc = (i, n, d) => ((i + d) % n + n) % n;
function fighterScreen(o){
  selOpts = o; const keep = scr.querySelector('.card'), top = keep ? keep.scrollTop : 0;
  if (!KF.CLUBS[sel.club] || sel.club === 'ref') sel.club = 'fig';
  if (o.ban && sel.club === o.ban) sel.club = KF.CLUB_LIST.map(c => c.id).find(id => id !== o.ban);
  const ALL = KF.CLUB_LIST.map(c => c.id), RIV = ALL.filter(id => id !== sel.club);
  if (!KF.CLUBS[sel.rival] || sel.rival === 'ref' || sel.rival === sel.club) sel.rival = KF.CLUBS[sel.club].rivals.find(id => id !== sel.club) || RIV[0];
  const S = schoolOf(sel.school);
  let team = '';
  if (o.team) team = '<div class="lab">SEU TIME</div><div class="cyc"><button class="btn sm alt" data-act="selclub" data-d="-1">◀</button><button class="cname" data-act="clubgrid"><i style="background:' + swatch(sel.club) + '"></i>' + esc(KF.CLUBS[sel.club].name) + '</button><button class="btn sm alt" data-act="selclub" data-d="1">▶</button></div>' + (o.noRival ? '' :
    '<div class="lab">RIVAL</div>') + (o.noRival ? '' : '<div class="cyc"><button class="btn sm alt" data-act="selrival" data-d="-1">◀</button><button class="cname" data-act="rivalgrid"><i style="background:' + swatch(sel.rival) + '"></i>' + esc(KF.CLUBS[sel.rival].name) + '</button><button class="btn sm alt" data-act="selrival" data-d="1">▶</button></div>');
  else team = '<p class="hint" style="animation:none">O time é o da sala.</p>';
  const dots = (arr, key, cur) => '<div class="dots">' + arr.map((c, i) => '<button class="dot' + (i === cur ? ' on' : '') + '" data-act="' + key + '" data-i="' + i + '" style="background:' + c + '" aria-label="opção ' + (i + 1) + '"></button>').join('') + '</div>';
  const cards = KF.SCHOOLS.map(x => '<button class="scard' + (x.id === S.id ? ' on' : '') + '" data-act="selschool" data-id="' + x.id + '" style="--c:' + x.col + '"><span class="mk">' + x.mark + '</span><b>' + x.name + '</b><small>' + x.land + '</small></button>').join('');
  const bars = S.stat.map((v, i) => '<div class="sbar"><em>' + STAT_L[i] + '</em><span>' + '<i></i>'.repeat(v).replace(/<i><\/i>/g, '<i class="f" style="background:' + S.col + '"></i>') + '<i></i>'.repeat(5 - v) + '</span></div>').join('');
  show('<div class="card wide selcard"><h2>' + (o.title || 'ESCOLHA SEU LUTADOR') + '</h2><div class="sel">' +
    '<div class="pvbox"><canvas id="pv" width="220" height="200"></canvas>' + team + '</div>' +
    '<div class="selr"><div class="lab">ESCOLA DE LUTA</div><div class="sch">' + cards + '</div>' +
    '<div class="sinfo"><p>' + S.desc + '</p>' + bars + '<div class="spl"><span style="color:' + S.col + '">' + S.spMark + '</span> ESPECIAL: <b>' + S.sp + '</b></div></div>' +
    '<div class="lab">APARÊNCIA</div><div class="app">' + dots(KF.SKINS, 'selskin', sel.lk[0]) + dots(KF.HAIRS, 'selhair', sel.lk[1]) +
    '<div class="stys">' + STY_NAMES.map((n, i) => '<button class="sty' + (i === sel.lk[2] ? ' on' : '') + '" data-act="selsty" data-i="' + i + '">' + n + '</button>').join('') + '</div></div></div></div>' +
    '<div class="row"><button class="btn alt" data-act="' + o.back + '">◀ VOLTAR</button><button class="btn big" data-act="selok">✔ CONFIRMAR</button></div></div>', 'solid');
  const nc = scr.querySelector('.card'); if (nc) nc.scrollTop = top;
  if (o.team) au.anthem(sel.club);
  pvStart();
}
function pvStart(){
  cancelAnimationFrame(pvRaf); const cv = $('pv'); if (!cv) return; const g = cv.getContext('2d'), t0 = performance.now(), art = KF.art;
  const f = {id: 5, club: 'fig', x: 0, y: 0, z: 0, face: 1, st: 'idle', t: 0, walkT: 0, lk: [1, 0, 1], scale: 1, wide: 1, kind: 'x', flash: 0, n: 0, atk: null, pid: 1, sc: null};
  const loop = now => {
    if (!document.body.contains(cv)) return;
    const T = (now - t0) / 1000, S = schoolOf(sel.school), W = cv.width, H = cv.height;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b0f3a'); bg.addColorStop(.6, '#b03a5a'); bg.addColorStop(1, '#ffb26a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,230,190,.9)'; g.beginPath(); g.arc(W * .72, H * .3, 22, 0, 6.3); g.fill();
    g.fillStyle = '#5e4c52'; g.fillRect(0, H * .8, W, H * .2);
    f.club = sel.club; f.sc = S; f.lk = sel.lk; f.look = null; KF.view.lookOf(f); f.st = 'idle'; f.atk = null; f.t = 0; f.n = 0;
    const c = T % 4.8, which = Math.floor(T / 4.8) % 3, ph = (c % 1.6) / 1.6, spin = c >= 3.2;
    if (c < 3.2 && ph > .2 && ph < .75) { f.st = 'atk'; f.atk = KF.ATK[ph < .45 ? 'p1' : 'kick']; f.t = ph < .45 ? (ph - .2) / .25 * .22 : (ph - .45) / .3 * .3; f.n = 1; }
    else if (spin && ph > .1 && ph < .8) { f.st = 'atk'; f.atk = KF.ATK.spin; f.t = (ph - .1) / .7 * .5; f.n = 1; }
    g.save(); g.translate(W / 2, H * .82); g.scale(2.35, 2.35);
    art.drawShadow(g, 0, 0, 0, 1);
    if (spin && ph > .1 && ph < .8) { g.save(); g.globalAlpha = .55; g.strokeStyle = S.col; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -4, 20 + ph * 16, 7 + ph * 5, 0, 0, 6.3); g.stroke(); g.restore(); }
    art.drawFighter(g, f, 0, 0, T); g.restore();
    pvRaf = requestAnimationFrame(loop);
  };
  pvRaf = requestAnimationFrame(loop);
}
function commitSel(){
  club = sel.club; rival = sel.rival; save.club = club; save.rival = rival; save.school = sel.school; save.look = sel.lk.slice(); persist();
}

/* ----- solo ----- */
function stageSelect(){
  let b = ''; for (let i = 0; i < KF.STAGES.length; i++) b += '<button class="btn" data-act="story" data-si="' + i + '"' + (i > save.cleared ? ' disabled' : '') + '>' + (i + 1) + '. ' + KF.STAGES[i].name + '</button>';
  show('<div class="card"><h2>ESCOLHA A FASE</h2><div class="stages">' + b + '</div><div class="row"><button class="btn alt" data-act="play">◀ VOLTAR</button></div></div>', 'solid');
}
function storyScreen(si, carry){
  const st = KF.STAGES[si]; UI.pending = {si, carry};
  show('<div class="card"><h3>FASE ' + st.id + ' DE ' + KF.STAGES.length + '</h3><h2>' + st.name.toUpperCase() + '</h2><p class="vs">' + clubTag(club) + ' <b>×</b> ' + clubTag(rival) + '</p><p>' + st.intro + '</p><p class="tip">💡 ' + st.tip + '</p>' +
    '<div class="row"><button class="btn big" data-act="fight">⚔ LUTAR!</button></div></div>', 'solid');
}
function showGameUI(online){
  hide(); $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden'); $('bPause').textContent = online ? '✕' : '❚❚';
  { const S = schoolOf(save.school); $('tbD').innerHTML = '<span>' + S.spMark + '</span><small>' + S.sp + '</small>'; $('hKiBar').querySelector('b').textContent = 'KI · ' + S.sp; }
  $('hName').textContent = KF.CLUBS[club].name.toUpperCase(); lastHud = {}; V.clearFx(); In.clear();
  try {
    if (navigator.maxTouchPoints > 0 && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {});
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) {}
}
function startStage(si, carry){
  UI.mode = 'solo'; UI.paused = false; showGameUI(false);
  $('hStage').textContent = 'FASE ' + (si + 1) + ' · ' + KF.STAGES[si].name.toUpperCase();
  $('hTeam').innerHTML = '';
  G.VW = view.VW; G.start(si, club, rival, {carry, mp: false, players: [{pid: 1, name: 'Você', sc: save.school, lk: save.look}]});
}
const rankOf = () => G.hitsTaken <= 3 ? 'S' : G.hitsTaken <= 8 ? 'A' : G.hitsTaken <= 15 ? 'B' : 'C';
function soloClear(){
  const si = G.si, lastSt = si >= KF.STAGES.length - 1, P = G.players[0];
  const bonus = P.lives * 500 + (rankOf() === 'S' ? 1500 : rankOf() === 'A' ? 800 : 0);
  G.score += bonus;
  save.cleared = Math.max(save.cleared, Math.min(si + 1, KF.STAGES.length - 1));
  const nb = G.score > save.best; if (nb) save.best = G.score; save.club = club; save.rival = rival; persist();
  hideGame();
  if (lastSt) { au.music('title'); show('<div class="card"><h3>FIM DE JOGO</h3><h2>🏆 PAZ NA ILHA! 🏆</h2><div class="rank">' + rankOf() + '</div><p>' + KF.TEXT.endWin + '</p>' +
    '<div class="stats"><div class="stat"><b>' + G.score + '</b><span>pontos</span></div><div class="stat"><b>' + save.best + '</b><span>recorde</span></div></div>' + (nb ? '<p>🏆 Novo recorde!</p>' : '') +
    '<div class="row"><button class="btn big" data-act="title">MENU</button></div></div>', 'solid'); return; }
  show('<div class="card"><h3>FASE ' + (si + 1) + ' COMPLETA!</h3><h2>' + KF.STAGES[si].name.toUpperCase() + '</h2><div class="rank">' + rankOf() + '</div>' +
    '<div class="stats"><div class="stat"><b>' + G.score + '</b><span>pontos</span></div><div class="stat"><b>' + G.kos + '</b><span>gols (KOs)</span></div><div class="stat"><b>x' + G.maxCombo + '</b><span>combo</span></div></div>' +
    '<p>Bônus: +' + bonus + ' (vidas e rank). ' + (nb ? '🏆 Novo recorde!' : '') + '</p><div class="row"><button class="btn big" data-act="next">PRÓXIMA FASE ▶</button></div></div>', 'solid');
}
function soloOver(){
  hideGame(); if (G.score > save.best) { save.best = G.score; persist(); }
  show('<div class="card"><h2>VOCÊ CAIU!</h2><p>' + KF.TEXT.endLose + '</p><div class="stats"><div class="stat"><b>' + G.score + '</b><span>pontos</span></div><div class="stat"><b>' + G.kos + '</b><span>KOs</span></div></div>' +
    '<div class="row"><button class="btn big" data-act="retry">↻ TENTAR DE NOVO</button><button class="btn alt" data-act="title">MENU</button></div></div>', 'solid');
}
UI.togglePause = function(){
  if (UI.mode === 'online') {
    if (UI.modal) { hide(); return; }
    show('<div class="card"><h2>MENU</h2><p>A partida continua rolando para os seus colegas.</p><div class="row" style="flex-direction:column;align-items:center"><button class="btn big" data-act="resume">▶ VOLTAR À LUTA</button>' +
      '<button class="btn alt" data-act="snd">' + sndLabel() + '</button><button class="btn alt" data-act="oleave">SAIR DA SALA</button></div></div>', 'solid'); return;
  }
  if (UI.mode !== 'solo' || G.state === 'clear' || G.state === 'over') return;
  if (UI.paused) { UI.paused = false; hide(); au.resume(); In.clear(); return; }
  UI.paused = true; In.clear();
  show('<div class="card"><h2>PAUSADO</h2><div class="row" style="flex-direction:column;align-items:center"><button class="btn big" data-act="resume">▶ CONTINUAR</button>' +
    '<button class="btn alt" data-act="snd">' + sndLabel() + '</button><button class="btn alt" data-act="retry">↻ REINICIAR FASE</button><button class="btn alt" data-act="title">SAIR PARA O MENU</button></div></div>', 'solid');
};

/* ----- online ----- */
let resultPending = false, lobbySi = 0, pendingCode = '';
const nameVal = () => { const el = $('nameIn'); const v = (el ? el.value : save.name) || ''; return v.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12) || 'Mestre'; };
function onlineMenu(msg){
  UI.mode = 'title'; hideGame();
  if (!N.url()) {
    show('<div class="card"><h2>JOGAR COM A TURMA</h2><p>Para jogar online, abra o jogo pelo endereço do servidor (por exemplo <b>http://localhost:3000</b> ou o link do seu site hospedado), e não pelo arquivo index.html.</p><div class="row"><button class="btn" data-act="title">◀ VOLTAR</button></div></div>', 'solid'); return;
  }
  show('<div class="card wide"><h2>JOGAR COM A TURMA</h2><div class="two"><div class="col">' +
    '<label class="lab">SEU NOME</label><input id="nameIn" class="inp" maxlength="12" autocomplete="off" value="' + esc(save.name) + '" placeholder="Seu nome">' +
    '<button class="btn big" data-act="ocreate">➕ CRIAR SALA</button><label class="lab">OU ENTRE COM O CÓDIGO</label><div class="row" style="margin:0"><input id="codeIn" class="inp code" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="ABCD" value="' + esc(pendingCode) + '"><button class="btn" data-act="ojoin">ENTRAR</button></div>' +
    '<p id="onMsg" class="hint" style="animation:none;min-height:16px">' + (msg ? esc(msg) : 'Conectando...') + '</p></div>' +
    '<div class="col"><label class="lab">PLACAR DA TURMA</label><div id="boardBox">' + boardHtml() + '</div></div></div>' +
    '<div class="row"><button class="btn alt" data-act="title">◀ VOLTAR</button></div></div>', 'solid');
  N.connect().then(() => { const m = $('onMsg'); if (m && !msg) m.textContent = 'Conectado! Crie uma sala ou digite um código.'; })
    .catch(() => { const m = $('onMsg'); if (m) m.textContent = 'Não consegui conectar ao servidor. Verifique se ele está no ar.'; });
}
function lobbyScreen(m){
  UI.mode = 'title'; hideGame(); au.music('title');
  const host = m.host === N.me; let slots = '';
  for (let i = 0; i < m.max; i++) { const p = m.players[i]; slots += '<div class="slot' + (p ? ' on' : '') + '">' + (p ? '<b>' + esc(p.name) + '</b>' + '<br><small class="sk"><i class="sw" style="background:' + swatch(p.club || m.club) + '"></i>' + esc(KF.CLUBS[p.club || m.club].name) + ' · ' + esc(schoolOf(p.sc).name) + '</small>' + (p.pid === m.host ? ' <small>host</small>' : '') + (p.pid === N.me ? ' <small>você</small>' : '') : '<span>vazio</span>') + '</div>'; }
  let sb = ''; for (let i = 0; i < KF.STAGES.length; i++) sb += '<button class="btn sm' + (i === lobbySi ? '' : ' alt') + '" data-act="lsi" data-si="' + i + '">' + (i + 1) + '. ' + esc(KF.STAGES[i].name) + '</button>';
  const MODES = [['coop', '🤝 COOPERATIVO', 'Todos juntos contra os torcedores'], ['teams', '⚔ TIME × TIME', 'Cada clube é um time; os times se enfrentam'], ['ffa', '🥊 TODOS × TODOS', 'Cada um por si: o último em pé vence']];
  const md = MODES.find(x => x[0] === (m.mode || 'coop')) || MODES[0];
  const modeRow = host ? '<div class="stages">' + MODES.map(x => '<button class="btn sm' + (x[0] === md[0] ? '' : ' alt') + '" data-act="lmode" data-m="' + x[0] + '">' + x[1] + '</button>').join('') + '</div><p class="hint" style="animation:none">' + md[2] + '</p>'
    : '<p class="hint" style="animation:none">Modo: <b>' + md[1] + '</b> — ' + md[2] + '</p>';
  if (md[0] !== 'coop') sb = '';
  club = m.club; rival = m.rival;
  show('<div class="card wide"><h3>CÓDIGO DA SALA</h3><div class="roomcode">' + esc(m.code) + '</div><p class="vs">' + clubTag(m.club) + ' <b>×</b> ' + clubTag(m.rival) + '</p>' +
    '<div class="slots">' + slots + '</div>' + modeRow +
    (host ? '<div class="stages">' + sb + '</div><div class="row"><button class="btn big" data-act="lstart">⚔ COMEÇAR (' + m.players.length + ')</button></div><p id="lMsg" class="hint" style="animation:none;min-height:16px"></p>' : '<p class="hint" style="animation:none">Aguardando o host começar...</p>') +
    '<div class="row"><button class="btn alt" data-act="lpick">🥋 MEU TIME / LUTADOR</button><button class="btn alt" data-act="oleave">SAIR DA SALA</button></div></div>', 'solid');
}
N.onroom = m => { if (UI.mode === 'online' || resultPending) return; lobbyScreen(m); };
N.onerr = msg => { onlineMenu(msg); };
N.onerr2 = msg => { const e = $('lMsg'); if (e) e.textContent = msg; };
N.onboard = () => { const b = $('boardBox'); if (b) b.innerHTML = boardHtml(); };
N.onbegin = m => {
  club = m.club; rival = m.rival; UI.mode = 'title'; hideGame(); au.music('title');
  show('<div class="card"><h3>PREPARE-SE!</h3><h2>' + esc(m.story.name.toUpperCase()) + '</h2><p class="vs">' + clubTag(m.club) + ' <b>×</b> ' + clubTag(m.rival) + '</p><p>' + m.story.intro + '</p><p class="tip">💡 ' + m.story.tip + '</p></div>', 'solid');
};
N.onlive = s => {
  UI.mode = 'online'; showGameUI(true); $('hStage').textContent = 'SALA ' + (N.room ? N.room.code : '') + ' · ' + (s.pv ? (s.pv === 2 ? 'TIME × TIME' : 'TODOS × TODOS') : 'FASE ' + (s.si + 1));
};
N.onevent = ev => applyEv(ev);
N.onend = m => {
  UI.mode = 'title'; hideGame(); resultPending = true; au.music('title');
  const rows = (m.players || []).slice().sort((a, b) => b.pts - a.pts).map((p, i) => '<div class="brow"><b>' + (i + 1) + '</b><span>' + esc(p.name) + '</span><em>' + p.pts + '</em></div>').join('');
  show('<div class="card"><h2>' + (m.pv ? '🏆 ' + (m.winner ? esc(m.winner.toUpperCase()) + ' VENCEU!' : 'EMPATE!') : m.win ? '🏆 PAZ NA ILHA!' : 'FIM DA LUTA') + '</h2><p>' + (m.pv ? 'Fim da briga em grupo!' : m.win ? KF.TEXT.endWin : KF.TEXT.endLose) + '</p>' +
    '<div class="stats"><div class="stat"><b>' + m.score + '</b><span>pontos da sala</span></div><div class="stat"><b>' + m.kos + '</b><span>KOs</span></div></div><div class="board">' + rows + '</div>' +
    '<div class="row"><button class="btn big" data-act="oback">VOLTAR PARA A SALA</button></div></div>', 'solid');
};
N.onclose = () => {
  if (!UI.modal || UI.mode === 'online') { UI.mode = 'title'; hideGame(); }
  show('<div class="card"><h2>CONEXÃO PERDIDA</h2><p>A conexão com o servidor caiu. Verifique a internet e tente entrar de novo.</p><div class="row"><button class="btn big" data-act="online">TENTAR DE NOVO</button><button class="btn alt" data-act="title">MENU</button></div></div>', 'solid');
};

/* ---------- ações dos botões ---------- */
const ACTIONS = {
  play(){ fighterScreen({team: true, back: 'title', ok(){ commitSel(); if (save.cleared > 0) stageSelect(); else storyScreen(0); }}); },
  selclub(el){ const L = KF.CLUB_LIST.map(c => c.id).filter(id => !selOpts.ban || id !== selOpts.ban), i = L.indexOf(sel.club); sel.club = L[cyc(i, L.length, +el.dataset.d)]; fighterScreen(selOpts); },
  selrival(el){ const r = KF.CLUB_LIST.map(c => c.id).filter(id => id !== sel.club), i = r.indexOf(sel.rival); sel.rival = r[cyc(i, r.length, +el.dataset.d)]; fighterScreen(selOpts); },
  clubgrid(){ const o = selOpts; pickScreen('ESCOLHA O TIME', KF.CLUB_LIST.map(c => c.id).filter(id => !o.ban || id !== o.ban), 'selback', id => { sel.club = id; fighterScreen(o); }); },
  rivalgrid(){ const o = selOpts; pickScreen('ESCOLHA O RIVAL', KF.CLUB_LIST.map(c => c.id).filter(id => id !== sel.club), 'selback', id => { sel.rival = id; fighterScreen(o); }); },
  selback(){ fighterScreen(selOpts); },
  selschool(el){ sel.school = el.dataset.id; fighterScreen(selOpts); },
  selskin(el){ sel.lk[0] = +el.dataset.i; fighterScreen(selOpts); },
  selhair(el){ sel.lk[1] = +el.dataset.i; fighterScreen(selOpts); },
  selsty(el){ sel.lk[2] = +el.dataset.i; fighterScreen(selOpts); },
  selok(){ if (selOpts && selOpts.ok) selOpts.ok(); },
  how(){ howScreen('title'); },
  title(){ UI.paused = false; if (N.room) { N.send({t: 'leave'}); N.room = null; } titleScreen(); },
  snd(){ au.setMuted(!au.muted); const b = scr.querySelector('[data-act=snd]'); if (b) b.textContent = sndLabel(); $('bMute').textContent = au.muted ? '🔇' : '🔊'; },
  club(el){ if (pickCb) { const cb = pickCb; cb(el.dataset.club); } },
  story(el){ storyScreen(+el.dataset.si); },
  fight(){ const p = UI.pending; startStage(p.si, p.carry); },
  next(){ storyScreen(G.si + 1, {score: G.score, ki: G.players[0].ki}); },
  retry(){ UI.paused = false; startStage(G.si, {score: G.startScore}); },
  resume(){ UI.togglePause(); },
  online(){ onlineMenu(); },
  ocreate(){
    save.name = nameVal(); persist(); const nm = save.name;
    fighterScreen({team: true, title: 'SEU LUTADOR E O TIME DA SALA', back: 'online', ok(){ commitSel(); N.connect().then(() => N.send({t: 'create', name: nm, club: sel.club, rival: sel.rival, sc: sel.school, lk: sel.lk})).catch(() => onlineMenu('Sem conexão com o servidor.')); }});
  },
  ojoin(){
    save.name = nameVal(); persist(); const code = ($('codeIn').value || '').toUpperCase().trim();
    if (code.length !== 4) { const m = $('onMsg'); if (m) m.textContent = 'O código tem 4 letras.'; return; }
    pendingCode = code;
    fighterScreen({team: true, noRival: true, title: 'SEU TIME E SEU LUTADOR', back: 'online', ok(){ commitSel(); N.connect().then(() => N.send({t: 'join', code, name: save.name, club: sel.club, sc: sel.school, lk: sel.lk})).catch(() => onlineMenu('Sem conexão com o servidor.')); }});
  },
  lpick(){
    const m = N.room; if (!m) return; const mine = m.players.find(p => p.pid === N.me);
    if (mine && mine.club) sel.club = mine.club;
    fighterScreen({team: true, noRival: true, ban: m.mode === 'coop' ? m.rival : null, title: 'MEU TIME E LUTADOR', back: 'oback', ok(){ commitSel(); N.send({t: 'pick', club: sel.club, sc: sel.school, lk: sel.lk}); if (N.room) lobbyScreen(N.room); }});
  },
  lsi(el){ lobbySi = +el.dataset.si; if (N.room) lobbyScreen(N.room); },
  lmode(el){ N.send({t: 'mode', m: el.dataset.m}); },
  lstart(){ N.send({t: 'start', si: lobbySi}); },
  oleave(){ N.send({t: 'leave'}); N.room = null; UI.mode = 'title'; resultPending = false; onlineMenu(); },
  oback(){ resultPending = false; if (N.room) lobbyScreen(N.room); else onlineMenu(); }
};
scr.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  au.init(); au.sfx('click'); const a = ACTIONS[b.dataset.act]; if (a) a(b);
});
scr.addEventListener('pointerdown', () => au.init());
$('bPause').addEventListener('click', () => { au.init(); UI.togglePause(); });
$('bMute').addEventListener('click', () => { au.init(); au.setMuted(!au.muted); $('bMute').textContent = au.muted ? '🔇' : '🔊'; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (UI.mode === 'solo' && !UI.paused) UI.togglePause(); au.suspend(); } else if (!UI.paused) au.resume();
});

/* ---------- eventos da simulação (solo e online) ---------- */
let goOn = false;
function applyEv(ev){
  switch (ev[0]) {
    case 'sfx': au.sfx(ev[1]); break;
    case 'music': au.music(ev[1]); break;
    case 'jingle': au.jingle(ev[1]); break;
    case 'banner': UI.banner(ev[1], ev[2]); break;
    case 'go': UI.setGo(!!ev[1]); break;
    case 'buzz': if (ev[1] === (UI.mode === 'online' ? N.me : 1)) In.buzz(ev[2]); break;
    case 'stageclear': if (UI.mode === 'solo') soloClear(); break;
    case 'gameover': if (UI.mode === 'solo') soloOver(); break;
    default: V.event(ev);
  }
}
UI.banner = function(txt, ms){
  const b = $('banner'); b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.style.setProperty('--bd', ((ms || 1400) / 1000) + 's'); b.classList.add('show');
};
UI.setGo = function(on){ if (goOn !== on) { goOn = on; $('goArrow').classList.toggle('hidden', !on); } };

/* ---------- HUD ---------- */
let lastHud = {};
const setT = (id, v) => { if (lastHud[id] !== v) { lastHud[id] = v; $(id).textContent = v; } };
function hud(S, pl, score){
  const me = pl.find(p => p.pid === S.me) || pl[0]; if (!me) return;
  const hp = Math.round(me.hp / me.max * 100);
  if (lastHud.hp !== hp) { lastHud.hp = hp; $('hHp').style.width = hp + '%'; }
  if (lastHud.ki !== me.ki) { lastHud.ki = me.ki; $('hKi').style.width = me.ki + '%'; $('hKiBar').classList.toggle('ready', me.ki >= 50); }
  setT('hScore', String(score)); setT('hLives', me.out ? 'FORA' : '♥'.repeat(Math.max(0, me.lives)));
  const cb = me.combo >= 2 ? 'COMBO x' + me.combo : '';
  if (lastHud.cb !== cb) { lastHud.cb = cb; const c = $('hCombo'); c.textContent = cb; if (cb) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
  let boss = null; for (const e of S.ents) if (e.boss || e.kind === 'boss') { if (!e.dead) boss = e; }
  const bb = $('bossbar'), bv = boss ? Math.round(boss.hp / boss.max * 100) : -1;
  if (lastHud.boss !== bv) { lastHud.boss = bv; bb.classList.toggle('hidden', !boss); if (boss) $('hBoss').style.width = bv + '%'; }
  if (S.online) {
    if (!$('hPing')) { const d = document.createElement('div'); d.id = 'hPing'; $('hud').appendChild(d); }
    if (N.ping !== lastHud.pg) { lastHud.pg = N.ping; const pe = $('hPing'); pe.textContent = N.ping + ' ms'; pe.style.color = N.ping < 90 ? '#8ff58f' : N.ping < 170 ? '#ffd23a' : '#ff6a4a'; }
    const mm = S.ents.find(e => e.pid === S.me); if (mm && lastHud.cl !== mm.club) { lastHud.cl = mm.club; setT('hName', KF.CLUBS[mm.club].name.toUpperCase()); }
    const h = pl.filter(p => p.pid !== S.me).map(p => '<div class="tm' + (p.out ? ' out' : '') + '"><span>' + esc(p.name) + '</span><div class="bar"><i style="width:' + Math.round(p.hp / p.max * 100) + '%"></i></div></div>').join('');
    if (lastHud.team !== h) { lastHud.team = h; $('hTeam').innerHTML = h; }
  }
}

/* ---------- loop ---------- */
let pending = [], lastSent = {x: 0, y: 0, t: 0};
const ACTS = ['punch', 'kick', 'jump', 'special'];
function sendInput(){
  const ax = In.axis(), p = []; for (const n of ACTS) if (In.take(n)) p.push(n);
  if (p.includes('punch') || p.includes('kick')) N.localAtk = {key: p.includes('punch') ? 'p1' : 'kick', t0: performance.now()};
  const now = performance.now(), ch = Math.abs(ax.x - lastSent.x) > .05 || Math.abs(ax.y - lastSent.y) > .05;
  if (p.length || ch || now - lastSent.t > 120) { N.send({t: 'in', x: +ax.x.toFixed(2), y: +ax.y.toFixed(2), p}); lastSent = {x: ax.x, y: ax.y, t: now}; }
}
function frame(ts){
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  const portrait = innerHeight > innerWidth * 1.1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0708'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.k, 0, 0, view.k, 0, view.offY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, view.VW, 270); ctx.clip();
  if (UI.mode === 'solo') {
    const run = !UI.paused && !portrait && !(UI.modal && G.state === 'play');
    if (run) {
      G.VW = view.VW;
      const ax = In.axis(); G.setAxis(1, ax.x, ax.y); for (const n of ACTS) if (In.take(n)) G.press(1, n);
      G.update(dt); for (const ev of G.drain()) applyEv(ev); V.update(dt);
    }
    const S = {ents: G.ents, proj: G.proj, items: G.items, cam: G.cam, VW: view.VW, t: G.t, theme: G.stage.theme, cA: club, cB: rival, me: 1, online: false, curtain: 0};
    V.render(ctx, S, run ? dt : 0); if (!UI.modal || G.state !== 'play') hud(S, G.info(), G.score);
  } else if (UI.mode === 'online' && N.live) {
    if (!portrait) sendInput();
    const S = N.state();
    if (S) {
      N.predict(S, dt, In.axis());
      const off = (view.VW - 440) / 2; S.simW = 440; S.VW = view.VW; S.cam = S.cam - off; S.curtain = Math.max(0, off);
      V.update(dt); V.render(ctx, S, dt); hud(S, S.pl, S.sc);
    }
  } else { tTitle += dt; V.renderTitle(ctx, dt, tTitle, view.VW, club, rival); }
  ctx.restore();
  requestAnimationFrame(frame);
}
KF.debug = {save: () => save, G, view, startSolo: (si, c, r) => { club = c || 'fig'; rival = r || KF.rivalOf(club); startStage(si || 0); }};

titleScreen();
requestAnimationFrame(frame);
})();
