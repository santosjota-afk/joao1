/* ===== ENTRADA: joystick virtual + 4 botões (toque) e teclado ===== */
(function(){
const KF = window.KF = window.KF || {};
const In = KF.input = {x: 0, y: 0, buf: {}, down: {}, vibrate: true};
const NAMES = ['punch', 'kick', 'jump', 'special'];
const now = () => performance.now();

In.press = function(n){ In.buf[n] = now(); In.down[n] = true; if (KF.audio) KF.audio.init(); };
In.release = function(n){ In.down[n] = false; };
In.take = function(n){ const t = In.buf[n]; if (t && now() - t < 190) { In.buf[n] = 0; return true; } return false; };
In.clear = function(){ In.x = In.y = 0; In.buf = {}; In.down = {}; };
In.buzz = function(ms){ if (In.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

/* ---------- teclado ---------- */
const keys = {};
const MAP = {ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D'};
const ACT = {KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', KeyL: 'jump', KeyC: 'jump', Space: 'jump', KeyU: 'special', KeyV: 'special'};
function kbAxis(){ In.kx = (keys.R ? 1 : 0) - (keys.L ? 1 : 0); In.ky = (keys.D ? 1 : 0) - (keys.U ? 1 : 0); }
addEventListener('keydown', e => {
  if (MAP[e.code]) { keys[MAP[e.code]] = true; kbAxis(); e.preventDefault(); }
  else if (ACT[e.code]) { if (!e.repeat) In.press(ACT[e.code]); e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (!e.repeat && KF.ui) KF.ui.togglePause(); }
});
addEventListener('keyup', e => {
  if (MAP[e.code]) { keys[MAP[e.code]] = false; kbAxis(); }
  else if (ACT[e.code]) In.release(ACT[e.code]);
});
In.kx = In.ky = 0;
In.axis = function(){
  const x = In.x || In.kx, y = In.y || In.ky;
  return {x: x, y: y};
};

/* ---------- joystick flutuante ---------- */
function setup(){
  const zone = document.getElementById('stickZone'), base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob');
  if (!zone) return;
  let pid = null, ox = 0, oy = 0; const R = 50;
  const baseHome = () => { base.style.left = ''; base.style.top = ''; base.style.bottom = ''; knob.style.transform = 'translate(0,0)'; };
  zone.addEventListener('pointerdown', e => {
    if (pid !== null) return; pid = e.pointerId; try { zone.setPointerCapture(pid); } catch (er) {}
    if (KF.audio) KF.audio.init();
    const r = zone.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
    base.style.left = (ox - r.left - 62) + 'px'; base.style.top = (oy - r.top - 62) + 'px'; base.style.bottom = 'auto';
    base.classList.add('on'); e.preventDefault();
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    let ax = dx / R, ay = dy / R; const m = Math.hypot(ax, ay);
    if (m < .22) { ax = ay = 0; } else { const k = (m - .22) / .78 / m; ax *= k; ay *= k; }
    In.x = ax; In.y = ay; e.preventDefault();
  });
  const end = e => { if (e.pointerId !== pid) return; pid = null; In.x = In.y = 0; base.classList.remove('on'); baseHome(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
  document.querySelectorAll('#btns .tb').forEach(b => {
    const n = b.dataset.a; let id = null;
    b.addEventListener('pointerdown', e => { id = e.pointerId; try { b.setPointerCapture(id); } catch (er) {} b.classList.add('on'); In.press(n); In.buzz(8); e.preventDefault(); });
    const up = e => { if (id !== null && e.pointerId !== id) return; id = null; b.classList.remove('on'); In.release(n); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  /* evita rolagem/zoom por toque no jogo */
  document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, {passive: false});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
