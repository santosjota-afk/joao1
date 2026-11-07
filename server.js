/* ===== SERVIDOR: serve o jogo e gerencia as salas (WebSocket) =====
   Uso: npm install && npm start   (porta: variável PORT, padrão 3000)
   Cada sala tem código de 4 letras, até 6 jogadores e roda a simulação no servidor.
   O placar geral (pontos por clube) fica na memória e também em board.json (se o disco permitir). */
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
globalThis.KF = globalThis.KF || {};
require('./data.js'); require('./sim.js');
const KF = globalThis.KF;

const PORT = process.env.PORT || 3000, MAXP = 6, TICK = 1 / 60;
const ROOT = __dirname;
const MIME = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8'};

/* ---------- arquivos estáticos (só o jogo) ---------- */
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/health') { res.writeHead(200); return res.end('ok'); }
  if (u === '/') u = '/index.html';
   const ok = u === '/index.html' || u === '/style.css' || (/^\/(js\/)?[a-z0-9_]+\.js$/.test(u) && u !== '/server.js');
  const file = path.normalize(path.join(ROOT, u.replace('/js/', '/')));
  if (!ok || !file.startsWith(ROOT + path.sep)) { res.writeHead(404); return res.end('not found'); }
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-cache'}); res.end(d);
  });
});

/* ---------- placar geral por clube ---------- */
const BOARD_FILE = path.join(ROOT, 'board.json');
let board = {};
try { board = JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8')); } catch (e) {}
let boardDirty = false;
function boardRows(){ return Object.keys(board).map(id => ({club: id, pts: board[id].pts, runs: board[id].runs})).sort((a, b) => b.pts - a.pts).slice(0, 12); }
function addBoard(club, pts){
  if (!KF.CLUBS[club] || pts <= 0) return;
  const b = board[club] || (board[club] = {pts: 0, runs: 0}); b.pts += Math.round(pts); boardDirty = true; pushBoard();
}
setInterval(() => { if (boardDirty) { boardDirty = false; fs.writeFile(BOARD_FILE, JSON.stringify(board), () => {}); } }, 15000);

/* ---------- salas ---------- */
const clients = new Set(), rooms = new Map();
let nextPid = 1;
const send = (c, m) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); };
const toRoom = (r, m) => { const s = JSON.stringify(m); for (const c of r.players.values()) if (c.ws.readyState === 1) c.ws.send(s); };
function pushBoard(){ const m = {t: 'board', rows: boardRows()}; for (const c of clients) send(c, m); }
const clean = n => (String(n || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12)) || 'Mestre';
const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(){ for (let i = 0; i < 50; i++) { let c = ''; for (let k = 0; k < 4; k++) c += CH[Math.floor(Math.random() * CH.length)]; if (!rooms.has(c)) return c; } return null; }

function roomInfo(r){
  return {t: 'room', code: r.code, club: r.club, rival: r.rival, host: r.host, phase: r.phase, max: MAXP,
    players: [...r.players.values()].map(c => ({pid: c.pid, name: c.name, sc: c.sc, lk: c.lk}))};
}
function sendInfo(r){ for (const c of r.players.values()) send(c, Object.assign(roomInfo(r), {you: c.pid})); }

function leave(c){
  const r = c.room; if (!r) return; c.room = null; r.players.delete(c.pid);
  if (r.sim && r.phase === 'play') r.sim.removePlayer(c.pid);
  if (!r.players.size) { clearTimeout(r.timer); rooms.delete(r.code); return; }
  if (r.host === c.pid) r.host = r.players.keys().next().value;
  sendInfo(r);
}

function beginStage(r, si, carry){
  r.phase = 'play'; r.si = si; r.tick = 0;
  r.sim.VW = 440; r.hold = 3.5;
  r.sim.start(si, r.club, r.rival, {mp: true, carry, players: [...r.players.values()].map(c => ({pid: c.pid, name: c.name, sc: c.sc, lk: c.lk}))});
  r.reported = carry ? carry.score : 0;
  toRoom(r, {t: 'begin', si, club: r.club, rival: r.rival, story: {name: KF.STAGES[si].name, intro: KF.STAGES[si].intro, tip: KF.STAGES[si].tip}});
}
function finish(r, win){
  if (board[r.club]) board[r.club].runs++;
  const sim = r.sim; addBoard(r.club, sim.score - r.reported); r.reported = sim.score;
  toRoom(r, {t: 'end', win, score: sim.score, kos: sim.kos, players: sim.info().map(p => ({name: p.name, pts: p.pts}))});
  r.phase = 'lobby'; sendInfo(r);
}
function handleEvents(r, evs){
  for (const e of evs) {
    if (e[0] === 'stageclear') {
      const sim = r.sim; addBoard(r.club, sim.score - r.reported); r.reported = sim.score;
      if (r.si < KF.STAGES.length - 1) { const carry = {score: sim.score}; r.timer = setTimeout(() => { if (r.players.size && r.phase === 'wait') beginStage(r, r.si + 1, carry); }, 2500); r.phase = 'wait'; }
      else { r.phase = 'wait'; r.reported = sim.score; r.timer = setTimeout(() => { if (r.players.size) finish(r, true); }, 1500); }
    } else if (e[0] === 'gameover') { r.phase = 'wait'; r.timer = setTimeout(() => { if (r.players.size) finish(r, false); }, 800); }
  }
}
/* o laço roda a 60 Hz; snapshots a 30 Hz */
let last = Date.now(), acc = 0;
setInterval(() => {
  const now = Date.now(); acc += Math.min(.25, (now - last) / 1000); last = now;
  while (acc >= TICK) {
    acc -= TICK;
    for (const r of rooms.values()) {
      if (r.phase !== 'play' && r.phase !== 'wait') continue;
      if (r.hold > 0) { r.hold -= TICK; continue; }
      r.sim.update(TICK); r.tick++;
      if (r.tick % 2 === 0) {
        const evs = r.sim.drain(); const ph = r.phase;
        toRoom(r, {t: 'snap', s: r.sim.snapshot(), ev: evs});
        if (ph === 'play') handleEvents(r, evs);
      }
    }
  }
}, 8);

/* ---------- conexões ---------- */
const wss = new WebSocketServer({server, maxPayload: 2048});
wss.on('connection', ws => {
  const c = {ws, pid: nextPid++, name: 'Mestre', room: null, bucket: 100, bt: Date.now(), alive: true};
  clients.add(c);
  send(c, {t: 'hi', pid: c.pid}); send(c, {t: 'board', rows: boardRows()});
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', raw => {
    const now = Date.now(); c.bucket = Math.min(100, c.bucket + (now - c.bt) / 10); c.bt = now;
    if (--c.bucket < 0) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    const r = c.room;
    switch (m.t) {
      case 'in': if (r && r.phase === 'play' && Array.isArray(m.p || [])) { r.sim.setAxis(c.pid, m.x, m.y); for (const n of (m.p || []).slice(0, 4)) r.sim.press(c.pid, n); } break;
      case 'create': {
        if (c.room) leave(c); c.name = clean(m.name); c.sc = KF.SCHOOL_IDS.includes(m.sc) ? m.sc : 'kf'; c.lk = Array.isArray(m.lk) ? m.lk.slice(0, 3).map(n => n | 0) : null;
        const club = KF.CLUBS[m.club] && m.club !== 'ref' ? m.club : 'fig';
        const rv = KF.CLUBS[club].rivals; const rival = rv.includes(m.rival) ? m.rival : rv[0];
        const code = newCode(); if (!code) return send(c, {t: 'err', msg: 'Servidor cheio, tente de novo.'});
        const room = {code, club, rival, host: c.pid, phase: 'lobby', players: new Map(), sim: KF.createGame(), si: 0, tick: 0, reported: 0};
        rooms.set(code, room); room.players.set(c.pid, c); c.room = room; sendInfo(room); break;
      }
      case 'join': {
        const room = rooms.get(String(m.code || '').toUpperCase().trim());
        c.name = clean(m.name); c.sc = KF.SCHOOL_IDS.includes(m.sc) ? m.sc : 'kf'; c.lk = Array.isArray(m.lk) ? m.lk.slice(0, 3).map(n => n | 0) : null;
        if (!room) return send(c, {t: 'err', msg: 'Sala não encontrada. Confira o código.'});
        if (room.phase !== 'lobby') return send(c, {t: 'err', msg: 'A partida dessa sala já começou. Espere ela terminar.'});
        if (room.players.size >= MAXP) return send(c, {t: 'err', msg: 'Sala cheia (6 jogadores).'});
        if (c.room) leave(c);
        room.players.set(c.pid, c); c.room = room; sendInfo(room); break;
      }
      case 'start': if (r && r.phase === 'lobby' && r.host === c.pid) { const si = Math.max(0, Math.min(KF.STAGES.length - 1, m.si | 0)); beginStage(r, si, null); } break;
      case 'leave': leave(c); break;
      case 'ping': send(c, {t: 'pong', ts: m.ts}); break;
    }
  });
  ws.on('close', () => { leave(c); clients.delete(c); });
  ws.on('error', () => {});
});
setInterval(() => { for (const c of clients) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; try { c.ws.ping(); } catch (e) {} } }, 25000);

server.listen(PORT, () => console.log('Kung Fu da Ilha no ar: http://localhost:' + PORT));
