// 预览演示版：用浏览器 localStorage 模拟服务器 API（订单只存在本机）
(function () {
  const KEY = 'pd_demo_db_v2'; // v2：真实桌号 A1-A9(无A4)+包厢666/888
  try { localStorage.removeItem('pd_demo_db_v1'); } catch (e) {}
  const SEED = window.__SEED_MENU__ || [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pd_demo') : null;
  const listeners = [];
  function emit(type, data) {
    const msg = { type, data, at: Date.now() };
    if (bc) bc.postMessage(msg);
    listeners.forEach(fn => { try { fn(msg); } catch (e) {} });
    localStorage.setItem('pd_demo_ping', JSON.stringify(msg)); // storage event fallback for other tabs
  }
  window.addEventListener('storage', e => { if (e.key === 'pd_demo_ping' && e.newValue && !bc) { const m = JSON.parse(e.newValue); listeners.forEach(fn => fn(m)); } });
  if (bc) bc.onmessage = e => listeners.forEach(fn => fn(e.data));

  // ---------- helpers (Asia/Shanghai) ----------
  function sh(d = new Date()) { return new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000); }
  const pad = n => String(n).padStart(2, '0');
  function dayKey(d = new Date()) { const s = sh(d); return `${s.getFullYear()}${pad(s.getMonth() + 1)}${pad(s.getDate())}`; }
  function fmtTime(ts) { const s = sh(new Date(ts)); return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())} ${pad(s.getHours())}:${pad(s.getMinutes())}:${pad(s.getSeconds())}`; }
  function nowHM() { const s = sh(); return s.getHours() * 60 + s.getMinutes(); }
  function hmToMin(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function isAvailableNow(d) { const a = hmToMin(d.available_after); if (a == null) return true; const n = nowHM(); return n >= a || n < 5 * 60; }
  const r2 = x => Math.round(x * 100) / 100;
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  const rid = () => Math.random().toString(16).slice(2, 8);

  function normDish(i, cat) {
    const mk = !!(i.is_market_price || i.price == null || i.price === '');
    return {
      id: String(i.id || ('D' + rid())).trim(), category: (cat || i.category || '其他').trim(), name: String(i.name || '').trim(),
      price: mk ? null : num(i.price), unit: String(i.unit || (mk ? '斤' : '份')).trim(), is_market_price: mk,
      is_signature: !!i.is_signature && i.is_signature !== '否' && i.is_signature !== '0', spicy: Math.max(0, Math.min(2, parseInt(i.spicy) || 0)),
      desc: String(i.desc || ''), price_note: String(i.price_note || ''),
      today_price_per_jin: num(i.today_price_per_jin ?? i.today_price), process_fee: num(i.process_fee ?? i.processing_fee),
      sold_out: !!i.sold_out, available_after: i.available_after || (/21[:：]30/.test((i.name || '') + (i.price_note || '')) ? '21:30' : ''),
    };
  }
  function menuFromJson(arr) { const cats = [], dishes = []; for (const c of arr) { if (!cats.includes(c.category)) cats.push(c.category); for (const i of (c.items || [])) dishes.push(normDish(i, c.category)); } return { cats, dishes }; }
  function fresh() { const { cats, dishes } = menuFromJson(SEED); return { settings: { storeName: '老爹排档', tableCount: 20, tableList: 'A1,A2,A3,A5,A6,A7,A8,A9,666,888', roomList: '666,888', pin: '8888', baseUrl: '' }, categories: cats, dishes, orders: [], bills: [], calls: [], tokens: [], seq: {} }; }
  let db;
  function load() { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; } if (!db || !db.dishes) { db = fresh(); save(); } }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  window.demoReset = () => { localStorage.removeItem(KEY); Object.keys(localStorage).filter(k => k.startsWith('pd_cart_') || k.startsWith('pd_staffcart_')).forEach(k => localStorage.removeItem(k)); load(); emit('menu', {}); };

  function rooms() { const r = db.settings.roomList; return r == null ? [] : String(r).split(/[,，\s]+/).map(x => x.trim()).filter(Boolean); }
  function tables() { const s = db.settings; if (s.tableList && s.tableList.trim()) return s.tableList.split(/[,，\s]+/).map(x => x.trim()).filter(Boolean); return Array.from({ length: +s.tableCount || 0 }, (_, i) => String(i + 1)); }
  function baseUrl() { if (db.settings.baseUrl) return db.settings.baseUrl.replace(/\/+$/, ''); return location.href.split(/[?#]/)[0].replace(/\/[^/]*$/, ''); }
  function needsStaff(d) { return d.is_market_price && (/斤|两|公斤|kg/i.test(d.unit) || d.today_price_per_jin == null); }
  function lineAmount(it) { if (it.market) return it.amount != null ? it.amount : null; return r2(it.price * it.qty); }
  function orderTotals(o) { let sum = 0, pending = 0; for (const it of o.items) { const a = lineAmount(it); if (a == null) pending++; else sum += a; } return { sum: r2(sum), pending }; }
  function displayStatus(o, t = orderTotals(o)) { if (o.status === 'cancelled') return '已取消'; if (o.status === 'pending' && t.pending) return '待称重'; return { pending: '待接单', done: '已做', served: '已上' }[o.status] || o.status; }
  function orderView(o) { const t = orderTotals(o); return { ...o, total: t.sum, pendingItems: t.pending, status_label: displayStatus(o, t) }; }
  function billView(b) { const orders = db.orders.filter(o => o.billId === b.id).map(orderView); const live = orders.filter(o => o.status !== 'cancelled'); return { ...b, orders, total: r2(live.reduce((s, o) => s + o.total, 0)), pendingItems: live.reduce((s, o) => s + o.pendingItems, 0) }; }
  function openBill(t) { return db.bills.find(b => b.table === t && b.status === 'open'); }
  function stats(day = dayKey()) {
    const orders = db.orders.filter(o => o.day === day && o.status !== 'cancelled').map(orderView);
    const paid = db.bills.filter(b => b.status === 'paid' && dayKey(new Date(b.paidAt)) === day);
    const byMethod = {}; let received = 0; for (const b of paid) { byMethod[b.payMethod] = r2((byMethod[b.payMethod] || 0) + b.paidAmount); received += b.paidAmount; }
    const ob = db.bills.filter(b => b.status === 'open').map(billView);
    return { day, orderCount: orders.length, gross: r2(orders.reduce((s, o) => s + o.total, 0)), received: r2(received), paidBills: paid.length, byMethod, openCount: ob.length, openTotal: r2(ob.reduce((s, b) => s + b.total, 0)) };
  }
  class HttpErr extends Error { constructor(s, m) { super(m); this.status = s; } }
  const E = (s, m) => { throw new HttpErr(s, m); };

  const routes = [];
  const R = (method, re, fn, auth) => routes.push({ method, re, fn, auth });
  R('POST', /^\/api\/login$/, (b) => { if (String(b.pin || '') !== String(db.settings.pin)) E(401, 'PIN不对'); const t = 'demo' + rid() + rid(); db.tokens.push(t); db.tokens = db.tokens.slice(-50); return { token: t }; });
  R('GET', /^\/api\/check$/, () => ({ ok: true }), 1);
  R('GET', /^\/api\/menu$/, () => ({ storeName: db.settings.storeName, tables: tables(), rooms: rooms(), categories: db.categories, dishes: db.dishes.map(d => ({ ...d, available_now: isAvailableNow(d) })), now: fmtTime(Date.now()) }));
  R('GET', /^\/api\/table\/([^/]+)$/, (b, m) => { const t = decodeURIComponent(m[1]); if (!tables().includes(t)) E(404, '没有这个桌号'); const bl = openBill(t); return { table: t, bill: bl ? billView(bl) : null }; });
  R('POST', /^\/api\/order$/, (b, m, tok) => {
    const t = String(b.table || '').trim(); if (!tables().includes(t)) E(400, '桌号不存在：' + t);
    if (!Array.isArray(b.items) || !b.items.length) E(400, '还没有点菜');
    const lines = [];
    for (const x of b.items) {
      const d = db.dishes.find(d => d.id === x.id); const qty = parseInt(x.qty) || 0; if (!d || qty <= 0) continue;
      if (d.sold_out) E(400, `「${d.name}」已售罄，请去掉后再提交`); if (!isAvailableNow(d)) E(400, `「${d.name}」${d.available_after}后才供应`);
      const line = { id: d.id, name: d.name, unit: d.unit, qty, note: String(x.note || '').slice(0, 60), market: d.is_market_price, price: d.price };
      if (d.is_market_price) { line.unit_price = d.today_price_per_jin; line.fee = d.process_fee; line.needs_staff = needsStaff(d); line.weight = null; line.amount = null; if (!line.needs_staff) line.amount = r2((d.today_price_per_jin + (d.process_fee || 0)) * qty); }
      lines.push(line);
    }
    if (!lines.length) E(400, '还没有点菜');
    let bl = openBill(t); const isAdd = !!bl;
    if (!bl) { bl = { id: 'B' + Date.now().toString(36) + rid(), table: t, status: 'open', openedAt: Date.now(), people: null }; db.bills.push(bl); }
    if (b.people) bl.people = parseInt(b.people) || bl.people;
    const day = dayKey(); db.seq[day] = (db.seq[day] || 0) + 1;
    const o = { id: `${day}-${String(db.seq[day]).padStart(3, '0')}`, no: db.seq[day], day, billId: bl.id, table: t, createdAt: Date.now(), items: lines, people: parseInt(b.people) || null, note: String(b.note || '').slice(0, 200), isAdd, byStaff: !!tok, status: 'pending' };
    db.orders.push(o); return { _ev: ['order', { id: o.id }], ok: true, order: orderView(o), bill: billView(bl) };
  });
  R('POST', /^\/api\/call$/, (b) => {
    const t = String(b.table || ''), type = String(b.type || ''); if (!tables().includes(t) || !['加水', '催菜', '要称重', '买单'].includes(type)) E(400, '参数不对');
    if (db.calls.find(c => c.table === t && c.type === type && !c.handled && Date.now() - c.at < 30000)) return { ok: true, dup: true };
    const c = { id: 'C' + Date.now().toString(36) + rid(), table: t, type, at: Date.now(), handled: false }; db.calls.push(c); db.calls = db.calls.slice(-300); return { _ev: ['call', c], ok: true };
  });
  R('GET', /^\/api\/kitchen\/state$/, () => {
    const day = dayKey();
    return { storeName: db.settings.storeName, tables: tables(), rooms: rooms(), orders: db.orders.filter(o => o.day === day || db.bills.find(b => b.id === o.billId && b.status === 'open')).map(orderView),
      openBills: db.bills.filter(b => b.status === 'open').map(billView), paidBills: db.bills.filter(b => b.status === 'paid' && dayKey(new Date(b.paidAt)) === day).map(billView).reverse(),
      calls: db.calls.filter(c => !c.handled), stats: stats(), now: Date.now() };
  }, 1);
  R('POST', /^\/api\/order\/([^/]+)\/status$/, (b, m) => {
    const o = db.orders.find(o => o.id === m[1]) || E(404, '订单不存在'); const s = b.status; if (!['pending', 'done', 'served', 'cancelled'].includes(s)) E(400, '状态不对');
    if ((s === 'done' || s === 'served') && orderTotals(o).pending) E(400, '还有菜没称重/定价，先称重再做');
    o.status = s; o[s + 'At'] = Date.now(); return { _ev: ['update', {}], ok: true, order: orderView(o) };
  }, 1);
  R('POST', /^\/api\/order\/([^/]+)\/item\/(\d+)\/weigh$/, (b, m) => {
    const o = db.orders.find(o => o.id === m[1]); const it = o && o.items[+m[2]]; if (!it || !it.market) E(404, '找不到这道菜');
    const a = num(b.amount); if (a == null || a < 0) E(400, '请填金额'); it.weight = num(b.weight); it.amount = r2(a); it.weighedAt = Date.now(); return { _ev: ['update', {}], ok: true, order: orderView(o) };
  }, 1);
  R('POST', /^\/api\/call\/([^/]+)\/handle$/, (b, m) => { const c = db.calls.find(c => c.id === m[1]); if (c) { c.handled = true; } return { _ev: ['update', {}], ok: true }; }, 1);
  R('POST', /^\/api\/bill\/([^/]+)\/checkout$/, (b, m) => {
    const bl = db.bills.find(x => x.id === m[1]); if (!bl || bl.status !== 'open') E(404, '这桌已结账或不存在'); const v = billView(bl);
    if (v.pendingItems && !b.force) E(400, `还有${v.pendingItems}道时价菜没称重/定价`);
    if (!['微信', '支付宝', '现金'].includes(b.method)) E(400, '请选付款方式'); const paid = num(b.paid); if (paid == null || paid < 0) E(400, '请填实收金额');
    Object.assign(bl, { status: 'paid', paidAt: Date.now(), payMethod: b.method, paidAmount: r2(paid), due: v.total, payNote: String(b.note || '').slice(0, 100) });
    db.calls.filter(c => c.table === bl.table && !c.handled).forEach(c => { c.handled = true; }); return { _ev: ['update', {}], ok: true, bill: billView(bl) };
  }, 1);
  R('POST', /^\/api\/bill\/([^/]+)\/reopen$/, (b, m) => {
    const bl = db.bills.find(x => x.id === m[1]); if (!bl || bl.status !== 'paid') E(404, '不存在'); if (openBill(bl.table)) E(400, '这桌已有新单，不能撤销结账');
    bl.status = 'open'; delete bl.paidAt; delete bl.payMethod; delete bl.paidAmount; return { _ev: ['update', {}], ok: true };
  }, 1);
  R('GET', /^\/api\/admin\/data$/, () => { const { pin, ...s } = db.settings; return { settings: s, effectiveBaseUrl: baseUrl(), categories: db.categories, dishes: db.dishes, tables: tables(), rooms: rooms() }; }, 1);
  R('POST', /^\/api\/admin\/settings$/, (b, m, tok) => {
    const s = db.settings; if (b.storeName != null) s.storeName = String(b.storeName).trim() || s.storeName;
    if (b.tableCount != null) s.tableCount = Math.max(1, Math.min(300, parseInt(b.tableCount) || s.tableCount)); if (b.tableList != null) s.tableList = String(b.tableList).trim(); if (b.roomList != null) s.roomList = String(b.roomList).trim(); if (b.baseUrl != null) s.baseUrl = String(b.baseUrl).trim();
    if (b.newPin != null && b.newPin !== '') { if (!/^\d{4,8}$/.test(b.newPin)) E(400, 'PIN需4-8位数字'); s.pin = b.newPin; db.tokens = [tok]; }
    return { _ev: ['menu', {}], ok: true };
  }, 1);
  R('POST', /^\/api\/admin\/dish$/, (x) => {
    if (!x.name) E(400, '请填菜名'); const d = normDish(x, x.category); if (!db.categories.includes(d.category)) db.categories.push(d.category);
    if (x.origId) { const i = db.dishes.findIndex(y => y.id === x.origId); if (i < 0) E(404, '菜不存在'); d.sold_out = db.dishes[i].sold_out; db.dishes[i] = d; }
    else { if (db.dishes.some(y => y.id === d.id)) d.id = 'D' + rid(); db.dishes.push(d); }
    return { _ev: ['menu', {}], ok: true, dish: d };
  }, 1);
  R('POST', /^\/api\/admin\/dish\/([^/]+)\/quick$/, (b, m) => {
    const d = db.dishes.find(d => d.id === decodeURIComponent(m[1])) || E(404, '菜不存在');
    if ('sold_out' in b) d.sold_out = !!b.sold_out; if ('price' in b && !d.is_market_price) { const p = num(b.price); if (p != null) d.price = p; }
    if ('today_price_per_jin' in b || 'today_price' in b) d.today_price_per_jin = num(b.today_price_per_jin ?? b.today_price);
    if ('process_fee' in b || 'processing_fee' in b) d.process_fee = num(b.process_fee ?? b.processing_fee);
    return { _ev: ['menu', {}], ok: true, dish: d };
  }, 1);
  R('DELETE', /^\/api\/admin\/dish\/([^/]+)$/, (b, m) => { db.dishes = db.dishes.filter(d => d.id !== decodeURIComponent(m[1])); return { _ev: ['menu', {}], ok: true }; }, 1);
  R('POST', /^\/api\/admin\/category$/, (b) => {
    const n = String(b.name || '').trim();
    if (b.action === 'add') { if (n && !db.categories.includes(n)) db.categories.push(n); }
    else if (b.action === 'rename') { const nn = String(b.newName || '').trim(); const i = db.categories.indexOf(n); if (i < 0 || !nn) E(400, '参数不对'); db.categories[i] = nn; db.dishes.forEach(d => { if (d.category === n) d.category = nn; }); }
    else if (b.action === 'delete') { if (db.dishes.some(d => d.category === n)) E(400, '分类下还有菜，先删菜或移走'); db.categories = db.categories.filter(c => c !== n); }
    else if (b.action === 'move') { const i = db.categories.indexOf(n), j = i + (b.dir < 0 ? -1 : 1); if (i >= 0 && j >= 0 && j < db.categories.length) [db.categories[i], db.categories[j]] = [db.categories[j], db.categories[i]]; }
    else E(400, '参数不对');
    return { _ev: ['menu', {}], ok: true, categories: db.categories };
  }, 1);
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false; text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) { const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    if (cur || row.length) { row.push(cur); rows.push(row); } return rows.filter(r => r.some(c => c.trim()));
  }
  const yes = v => /^(是|y|yes|true|1|√|✓)$/i.test(String(v || '').trim());
  R('POST', /^\/api\/admin\/import$/, (b) => {
    let cats = [], dishes = [];
    try {
      if (b.format === 'json') ({ cats, dishes } = menuFromJson(JSON.parse(b.text)));
      else { const rows = parseCsv(String(b.text || '')); if (rows.length && /分类/.test(rows[0][0])) rows.shift();
        for (const r of rows) { const [cat, name, price, unit, mk, sig] = r.map(x => (x || '').trim()); if (!cat || !name) continue; if (!cats.includes(cat)) cats.push(cat);
          dishes.push(normDish({ name, price: yes(mk) ? null : price, unit, is_market_price: yes(mk) || price === '' || price === '时价', is_signature: yes(sig) }, cat)); } }
    } catch (e) { E(400, '格式解析失败：' + e.message); }
    if (!dishes.length) E(400, '没读到任何菜品'); if (b.mode === 'replace') { db.categories = cats; db.dishes = []; }
    let added = 0, updated = 0;
    for (const d of dishes) { if (!db.categories.includes(d.category)) db.categories.push(d.category);
      const i = db.dishes.findIndex(y => y.id === d.id || (y.name === d.name && y.category === d.category));
      if (i >= 0) { d.id = db.dishes[i].id; d.sold_out = db.dishes[i].sold_out; db.dishes[i] = d; updated++; } else { if (db.dishes.some(y => y.id === d.id)) d.id = 'D' + rid(); db.dishes.push(d); added++; } }
    return { _ev: ['menu', {}], ok: true, added, updated, total: db.dishes.length };
  }, 1);
  R('GET', /^\/api\/admin\/qrcards$/, async () => {
    const base = baseUrl(); const cards = [];
    for (const t of tables()) { const url = `${base}/order.html?t=${encodeURIComponent(t)}`; cards.push({ table: t, room: rooms().includes(t), url, svg: await window.QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) }); }
    return { storeName: db.settings.storeName, base, rooms: rooms(), cards };
  }, 1);

  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  window.mockExport = function () {
    load(); const day = dayKey(); const orders = db.orders.filter(o => o.day === day && o.status !== 'cancelled');
    const rows = [['订单号', '桌号', '下单时间', '菜品明细', '应收', '实收', '付款方式', '结账状态']]; const alloc = {};
    for (const b of db.bills.filter(b => b.status === 'paid')) { const os = db.orders.filter(o => o.billId === b.id && o.status !== 'cancelled'); const tot = os.reduce((s, o) => s + orderTotals(o).sum, 0); let left = b.paidAmount;
      os.forEach((o, i) => { const a = i === os.length - 1 ? r2(left) : r2(tot ? b.paidAmount * orderTotals(o).sum / tot : 0); alloc[o.id] = a; left -= a; }); }
    for (const o of orders) { const b = db.bills.find(b => b.id === o.billId); const t = orderTotals(o);
      const detail = o.items.map(it => { let s = `${it.name}x${it.qty}`; if (it.market) s += it.amount != null ? `(${it.weight != null ? it.weight + it.unit + ' ' : ''}¥${it.amount})` : '(待称重)'; else s += `(¥${r2(it.price * it.qty)})`; if (it.note) s += `[${it.note}]`; return s; }).join('；') + (o.isAdd ? ' 〔加菜〕' : '') + (o.note ? ` 备注:${o.note}` : '');
      const paid = b && b.status === 'paid';
      rows.push([o.id, o.table, fmtTime(o.createdAt), detail, t.sum + (t.pending ? `(+${t.pending}道待称重)` : ''), paid ? alloc[o.id] : '', paid ? b.payMethod : '', paid ? '已结账' : '未结账']); }
    const st = stats(day); rows.push([]); rows.push(['汇总', '', '', '付款方式', '笔数', '实收合计', '', '']);
    for (const m of ['微信', '支付宝', '现金']) rows.push(['汇总', '', '', m, db.bills.filter(b => b.status === 'paid' && b.payMethod === m && dayKey(new Date(b.paidAt)) === day).length, st.byMethod[m] || 0, '', '']);
    rows.push(['汇总', '', '', '已收合计', st.paidBills, st.received, '', '']); rows.push(['汇总', '', '', '未结账(应收)', st.openCount, st.openTotal, '', '']); rows.push(['汇总', '', '', '今日订单应收', st.orderCount, st.gross, '', '']);
    const body = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `老爹排档订单-${day}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    window.__lastCsv = body; return body;
  };

  window.mockFetch = async function (path, o = {}) {
    load();
    const [p, qs] = path.split('?'); const method = o.method || 'GET'; const tok = (o.headers && o.headers['X-Token']) || '';
    let status = 200, out;
    try {
      const r = routes.find(r => r.method === method && r.re.test(p)); if (!r) E(404, '演示版不支持：' + p);
      if (r.auth && !db.tokens.includes(tok)) E(401, '请先输入PIN');
      out = await r.fn(o.body ? JSON.parse(o.body) : {}, p.match(r.re), db.tokens.includes(tok) ? tok : '');
      save(); if (out && out._ev) { const ev = out._ev; delete out._ev; setTimeout(() => emit(ev[0], ev[1]), 0); }
    } catch (e) { status = e.status || 500; out = { error: e.message }; }
    return { status, ok: status < 400, json: async () => JSON.parse(JSON.stringify(out)) };
  };
  // fake EventSource → BroadcastChannel/storage events
  window.EventSource = class { constructor() { this.h = {}; listeners.push(m => (this.h[m.type] || []).forEach(fn => fn({ data: JSON.stringify(m.data) }))); setTimeout(() => this.onopen && this.onopen(), 50); } addEventListener(t, fn) { (this.h[t] = this.h[t] || []).push(fn); } close() {} };
  load();
  // demo banner
  function banner() { if (document.getElementById('demo-banner')) return; const d = document.createElement('div'); d.id = 'demo-banner';
    d.innerHTML = '预览演示版：订单只存在本机，不会真的发到后厨 · <a href="index.html">目录</a>'; document.documentElement.appendChild(d); }
  const css = document.createElement('style'); css.textContent = '#demo-banner{position:fixed;top:0;left:0;right:0;z-index:1000;background:#fff59d;color:#5d4037;font-size:13px;line-height:26px;height:26px;text-align:center;font-weight:700;white-space:nowrap;overflow:hidden;font-family:sans-serif}#demo-banner a{color:#c62828}body{padding-top:26px}.tabs{top:26px!important}.mask{top:26px}';
  document.documentElement.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner); else banner();
})();
