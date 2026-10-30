const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (Math.round(n * 100) / 100).toString();
const TK = 'pd_token';
function token() { return localStorage.getItem(TK) || ''; }
async function api(path, opt = {}) {
  const o = { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json' } };
  if (token()) o.headers['X-Token'] = token();
  if (opt.body) o.body = JSON.stringify(opt.body);
  const r = await mockFetch(path, o); let j = {};
  try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && opt.auth !== false && !/order\.html/.test(location.pathname)) { localStorage.removeItem(TK); location.reload(); }
  if (!r.ok) throw new Error(j.error || ('出错了 ' + r.status));
  return j;
}
function toast(msg, ms = 2000) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
function sheet(html, onclose) {
  const m = document.createElement('div'); m.className = 'mask'; m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) { m.remove(); onclose && onclose(); } });
  document.body.appendChild(m); m.close = () => m.remove(); return m;
}
function closeSheets() { $$('.mask').forEach(m => m.remove()); }
function spicy(n) { return n ? ' <span title="辣">' + '🌶'.repeat(n) + '</span>' : ''; }
// price display shared
function priceHtml(d) {
  if (!d.is_market_price) return `<b class="red">¥${money(d.price)}</b><span class="mut">/${esc(d.unit)}</span>`;
  if (d.today_price_per_jin != null) return `<b class="red">¥${money(d.today_price_per_jin)}/${esc(d.unit)}</b><span class="mut">（今日价）</span>` + (d.process_fee ? `<span class="mut"> +加工费¥${money(d.process_fee)}</span>` : '');
  return `<b class="ora">时价，以称重为准</b>`;
}
// PIN login (kitchen/admin/qr)
async function requireLogin(title, onOk) {
  if (token()) { try { await api('/api/check'); return onOk(); } catch (e) {} }
  document.body.innerHTML = `<div class="topbar"><b style="font-size:1.3rem">${esc(title)}</b></div>
  <div class="pinbox"><h2 style="margin-top:0">请输入PIN</h2><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off">
  <div class="keypad">${[1,2,3,4,5,6,7,8,9,'清',0,'进'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
  const pin = $('#pin');
  const go = async () => { try { const j = await api('/api/login', { body: { pin: pin.value }, auth: false }); localStorage.setItem(TK, j.token); location.reload(); } catch (e) { toast(e.message); pin.value = ''; } };
  $$('.keypad button').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '清') pin.value = ''; else if (k === '进') go(); else pin.value += k; });
  pin.onkeydown = e => { if (e.key === 'Enter') go(); };
}
// sound
let AC;
function unlockAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) {} }
function beep(seq) {
  if (!AC) return; let t = AC.currentTime;
  for (const [f, d, v] of seq) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(v || .3, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); t += d + .05; }
}
const SND_ORDER = [[880, .18], [1175, .18], [880, .18], [1175, .3]];
const SND_CALL = [[1400, .25, .6], [900, .25, .6], [1400, .25, .6], [900, .25, .6], [1400, .25, .6], [900, .4, .6]];

// 桌号/包厢 显示
let ROOMS = [];
function setRooms(r) { if (Array.isArray(r)) ROOMS = r.map(String); }
function isRoom(t) { return ROOMS.includes(String(t)); }
function tl(t) { return isRoom(t) ? `包厢 ${esc(t)}` : `${esc(t)}桌`; }
function tlBig(t) { return isRoom(t) ? `<small>包厢</small> ${esc(t)}` : `${esc(t)} <small>号桌</small>`; }
