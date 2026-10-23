/* 老爹学古诗 365 —— 主程序 */
"use strict";

const POEMS = [].concat(POEMS_1, POEMS_2, POEMS_3, POEMS_4);

/* ================= 数据存储 ================= */
const STORE_KEY = "shi365-v1";
function defaultState(){
  return {
    currentDay: 1,
    streak: 0,
    lastStudyDate: null,
    completedDays: {},   // day -> {date, score}
    review: {},          // poemIdx -> {stage,next,hits,misses,day}
    errors: [],          // {id,cat,front,note,options,answer,qtext,day,date,count,done}
    tests: [],           // {type,day,score,total,pct,date}
    catScores: {},       // ability -> [100|0,...]
    daily: {},
    settings: { ratePct: 80, repeat: 1 },
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(STORE_KEY)) || defaultState(); }
catch(e){ S = defaultState(); }
S = Object.assign(defaultState(), S);
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }

/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
function esc(t){ return String(t==null?"":t).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function todayStr(){
  const now = new Date(Date.now() + (8*60 + new Date().getTimezoneOffset())*60000);
  return now.toISOString().slice(0,10);
}
function cnDate(dstr){
  const d = dstr ? new Date(dstr+"T00:00:00") : new Date();
  const wk = ["日","一","二","三","四","五","六"][d.getDay()];
  return `${d.getMonth()+1} 月 ${d.getDate()} 日 · 星期${wk}`;
}
function addDays(dstr, n){
  const d = new Date(dstr+"T00:00:00");
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function toast(msg){
  let t = document.querySelector(".toast");
  if(!t){ t = document.createElement("div"); t.className="toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 2200);
}
function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
function shuffle(a){ return a.slice().sort(()=>Math.random()-.5); }

/* ================= 语音合成（中文） ================= */
let VOICE = null;
function pickVoice(){
  /* 自动：不指定声音，跟随系统默认朗读声音（老爹 2026-09-22 在系统设置里重选了声音）。
     只设 u.lang=zh，由浏览器用该语言的系统默认声音朗读 */
  VOICE = null;
}
if("speechSynthesis" in window){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function repeatTimes(){ return (S.settings && S.settings.repeat) || 1; }
function ratePct(){ return (S.settings && typeof S.settings.ratePct==="number") ? S.settings.ratePct : 80; }
function rateFactor(){ return ratePct() / 100; }

let __gen = 0;
let __followTimers = [];
function clearReading(){ document.querySelectorAll(".reading").forEach(el=>el.classList.remove("reading")); }
/* 朗读高亮时把页面向上滚动，让当前行固定在屏幕上方的锚点位置 */
function scrollToReading(el){
  const r = el.getBoundingClientRect();
  const topbarH = (document.querySelector(".topbar") || {offsetHeight:0}).offsetHeight;
  const anchor = Math.max(topbarH + 24, window.innerHeight * 0.3);
  if(r.top > anchor || r.bottom < topbarH){
    window.scrollBy({ top: r.top - anchor, behavior: "smooth" });
  }
}
function stopSpeaking(){
  __gen++;
  /* 安卓 Chrome 适配：cancel 后立即 speak 会被系统丢弃，先 resume 再 cancel */
  try{ if(speechSynthesis.paused) speechSynthesis.resume(); }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
  __followTimers.forEach(clearTimeout); __followTimers = [];
  clearReading();
}
function speak(text, rate, btn){
  if(!("speechSynthesis" in window)){ toast("当前浏览器不支持朗读"); return; }
  stopSpeaking();
  const gen = __gen;
  const c = btn ? btn.closest(".sound-item,.row-item,.poem-lines,.ex-row,.card") : null;
  if(btn) btn.classList.add("speaking");
  if(c) c.classList.add("reading");
  if(c) scrollToReading(c);
  let left = repeatTimes();
  const play = () => {
    /* 安卓 Chrome 适配：稍等片刻再发声，避免被系统丢弃 */
    setTimeout(() => {
      if(gen !== __gen) return;
      try{
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        if(VOICE) u.voice = VOICE;
        u.rate = (rate || 0.9) * rateFactor();
        u.onend = u.onerror = () => {
          if(--left > 0 && gen === __gen){ setTimeout(()=>{ if(gen === __gen) play(); }, 450); }
          else { btn && btn.classList.remove("speaking"); c && c.classList.remove("reading"); }
        };
        speechSynthesis.speak(u);
      }catch(err){ btn && btn.classList.remove("speaking"); c && c.classList.remove("reading"); }
    }, 60);
  };
  play();
}
/* 整段朗读 + 逐句高亮（分段用空格连接，中文无空格所以天然按句分） */
function speakFollow(text, rate, btn, targets, left){
  if(!("speechSynthesis" in window)){ toast("当前浏览器不支持朗读"); return; }
  left = left == null ? repeatTimes() : left;
  stopSpeaking();
  const gen = __gen;
  const segs = text.split(" ");
  let pos = 0;
  const ranges = segs.map(s=>{ const r=[pos, pos+s.length]; pos += s.length + 1; return r; });
  const targetOf = i => {
    if(!targets.length) return null;
    if(targets.length === ranges.length) return targets[i];
    return targets[Math.min(targets.length-1, i)];
  };
  const showAt = i => {
    clearReading();
    const el = targetOf(i);
    if(el){
      el.classList.add("reading");
      scrollToReading(el);
    }
  };
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  if(VOICE) u.voice = VOICE;
  u.rate = (rate || 0.9) * rateFactor();
  /* 光标推进：估算计时器打底，boundary 事件每来一次就从当前句重排计时器。
     事件完全不来（手机常见）或只来一两次（桌面 Chrome 常见）都不会卡死。 */
  const segDur = i => 500 + segs[i].length * (260 / (u.rate || 0.9)) + 500;
  const clearTimers = () => { __followTimers.forEach(clearTimeout); __followTimers = []; };
  const scheduleFrom = (i, delay) => {
    clearTimers();
    let t = (delay || 0) + segDur(i);
    for(let j = i + 1; j < segs.length; j++){
      __followTimers.push(setTimeout(()=>showAt(j), t));
      t += segDur(j);
    }
  };
  u.onboundary = ev => {
    if(ev.charIndex == null) return;
    let idx = ranges.findIndex(r => ev.charIndex < r[1]);
    if(idx < 0) idx = ranges.length - 1;
    showAt(idx);
    scheduleFrom(idx);
  };
  u.onend = u.onerror = () => {
    clearTimers();
    clearReading();
    if(--left > 0 && gen === __gen){
      setTimeout(()=>{ if(gen === __gen) speakFollow(text, rate, btn, targets, left); }, 700);
    } else {
      btn && btn.classList.remove("speaking");
    }
  };
  if(btn) btn.classList.add("speaking");
  showAt(0);
  scheduleFrom(0, 1000);
  speechSynthesis.speak(u);
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-say]");
  if(!b) return;
  const followSel = b.getAttribute("data-follow");
  if(followSel){
    const scope = b.closest(".card,.lesson-sec");
    let targets = scope ? Array.from(scope.querySelectorAll(followSel)) : [];
    if(!targets.length) targets = Array.from(document.querySelectorAll(followSel));
    if(b.classList.contains("speaking")){ stopSpeaking(); b.classList.remove("speaking"); return; }
    speakFollow(b.getAttribute("data-say"), b.getAttribute("data-rate") ? +b.getAttribute("data-rate") : 0.9, b, targets);
  }else{
    speak(b.getAttribute("data-say"), b.getAttribute("data-rate") ? +b.getAttribute("data-rate") : 0.9, b);
  }
});
function speakBtn(text, rate){
  return `<button class="speak-btn" data-say="${esc(text)}"${rate?` data-rate="${rate}"`:""} title="点击朗读"><i data-lucide="volume-2"></i></button>`;
}
function poemSayText(p){ return p.t + "。" + p.d + "代，" + p.a + "。 " + p.l.join(" "); }

/* ================= 复习算法（1/2/4/7/15/30/60 天，7 轮毕业） ================= */
const REVIEW_INTERVALS = [1,2,4,7,15,30,60];
function addToReview(idx){
  if(S.review[idx]) return;
  S.review[idx] = { stage:0, next:addDays(todayStr(),1), hits:0, misses:0, day:idx+1 };
}
function duePoems(){
  const t = todayStr();
  return Object.entries(S.review)
    .filter(([,v])=>v.stage < REVIEW_INTERVALS.length && v.next <= t)
    .map(([i,v])=>({ idx:+i, ...v }))
    .sort((a,b)=>a.idx-b.idx);
}
function advanceReview(idx, ok){
  const v = S.review[idx]; if(!v) return;
  if(ok){
    v.hits++; v.stage++;
    if(v.stage >= REVIEW_INTERVALS.length){ toast(`《${POEMS[idx].t}》复习毕业！`); }
    else { v.next = addDays(todayStr(), REVIEW_INTERVALS[v.stage]); toast(`背得好！${REVIEW_INTERVALS[v.stage]} 天后再复习`); }
  }else{
    v.misses++; v.stage = 0; v.next = addDays(todayStr(), 1);
    toast("没关系，明天再复习这首");
  }
  save(); updateBadges();
}

/* ================= 错题本 ================= */
function activeErrors(){ return S.errors.filter(e=>!e.done); }
function addError(cat, front, note, q, day){
  const exist = S.errors.find(e=>!e.done && e.front===front && e.cat===cat);
  if(exist){ exist.count++; exist.date = todayStr(); return; }
  S.errors.push({
    id: Date.now()+Math.random(), cat, front, note,
    options: q && q.options ? q.options.slice() : null,
    answer: q ? q.answer : null,
    qtext: q && q.q ? q.q : null,
    day, date: todayStr(), count:1, done:false,
  });
}

/* ================= 能力记录 ================= */
const CAT_TO_ABILITY = { "背诵":"recite", "作者":"author", "朝代":"dynasty", "理解":"understand" };
const ABILITIES = [["recite","背诵记忆"],["author","诗人"],["dynasty","朝代"],["understand","理解"],["review","复习巩固"],["persist","坚持打卡"]];
function recordTest(type, day, questions, results){
  const total = questions.length;
  const score = results.filter(Boolean).length;
  const pct = Math.round(score/total*100);
  S.tests.push({ type, day, score, total, pct, date: todayStr() });
  questions.forEach((q,i)=>{
    const ab = CAT_TO_ABILITY[q.cat]; if(!ab) return;
    if(!S.catScores[ab]) S.catScores[ab] = [];
    S.catScores[ab].push(results[i]?100:0);
    if(S.catScores[ab].length>20) S.catScores[ab].shift();
  });
  save();
  return { score, total, pct };
}
function abilityValue(key){
  if(key==="review"){
    const vs = Object.values(S.review);
    const hits = vs.reduce((a,v)=>a+v.hits,0), miss = vs.reduce((a,v)=>a+v.misses,0);
    if(!hits && !miss) return 5;
    return Math.round(5 + hits/(hits+miss)*95);
  }
  if(key==="persist"){
    const done = Object.keys(S.completedDays).length;
    if(!done) return 5;
    return Math.round(5 + Math.min(done/S.currentDay,1)*95);
  }
  const arr = S.catScores[key];
  if(!arr || !arr.length) return 5;
  const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.round(5 + avg*0.95);
}
function abilityAll(){
  const o = {};
  ABILITIES.forEach(([k])=> o[k]=abilityValue(k));
  return o;
}

/* ================= 打卡 ================= */
function completeDay(day, scoreInfo){
  const today = todayStr();
  if(!S.completedDays[day]){
    S.completedDays[day] = { date: today, score: scoreInfo ? scoreInfo.pct : null };
    if(S.lastStudyDate !== today){
      S.streak = (S.lastStudyDate === addDays(today,-1)) ? S.streak+1 : 1;
      S.lastStudyDate = today;
    }
  }
  S.daily[day] = { date: today };
  addToReview(day-1);   // 当天的诗进入间隔复习队列
  if(day === S.currentDay && day < 365) S.currentDay = day+1;
  save();
  updateBadges();
}

/* ================= 路由 ================= */
let VIEW = "dashboard";
let LESSON_DAY = null;
const VIEW_TITLES = { dashboard:"今日学习", map:"365 天诗词地图", review:"复习中心", errors:"错题本", lib:"诗词库", stats:"学习报告", lesson:"课程" };

function go(view, arg){
  VIEW = view;
  if(view==="lesson") LESSON_DAY = arg;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  $("#topbarTitle").textContent = view==="lesson" ? `Day ${arg} · ${esc(POEMS[arg-1].t)}` : VIEW_TITLES[view];
  $("#sidebar").classList.remove("open");
  window.scrollTo(0,0);
  render();
}
function render(){
  const v = $("#view");
  if("speechSynthesis" in window) speechSynthesis.cancel();
  if(VIEW==="dashboard") v.innerHTML = renderDashboard();
  else if(VIEW==="map") v.innerHTML = renderMap();
  else if(VIEW==="lesson") v.innerHTML = renderLesson(LESSON_DAY);
  else if(VIEW==="review") v.innerHTML = renderReview();
  else if(VIEW==="errors") v.innerHTML = renderErrors();
  else if(VIEW==="lib") v.innerHTML = renderLib();
  else if(VIEW==="stats") v.innerHTML = renderStats();
  refreshIcons();
  updateBadges();
}
function updateBadges(){
  const due = duePoems().length, errs = activeErrors().length;
  const rb = $("#reviewBadge"), eb = $("#errorBadge");
  rb.hidden = !due; rb.textContent = due;
  eb.hidden = !errs; eb.textContent = errs;
  $("#streakNum").textContent = S.streak;
  const done = Object.keys(S.completedDays).length;
  $("#footDay").textContent = `Day ${S.currentDay}`;
  $("#footPct").textContent = Math.round(done/365*100)+"%";
  $("#footBar").style.width = (done/365*100)+"%";
  $("#dateChip").textContent = cnDate();
}

/* ================= 仪表盘 ================= */
const PLAN = [["听读跟读",10],["理解诗意",15],["背诵闯关",20],["复习旧诗",10],["今日测试",5]];
function renderDashboard(){
  const day = S.currentDay;
  const p = POEMS[day-1];
  const info = DAY_MAP[day-1];
  const stage = STAGES[info.stage-1];
  const due = duePoems();
  const errs = activeErrors();
  const done = Object.keys(S.completedDays).length;
  const ab = abilityAll();
  const avgTest = S.tests.length ? Math.round(S.tests.reduce((a,t)=>a+t.pct,0)/S.tests.length) : null;
  const planChips = PLAN.map(([k,m])=>`<span class="plan-chip"><i data-lucide="clock"></i>${esc(k)} <b>${m} 分钟</b></span>`).join("");

  const dueList = due.slice(0,6).map(v=>{
    const dp = POEMS[v.idx];
    return `<div class="row-item">
      <div class="row-main">
        <div class="row-title">《${esc(dp.t)}》 <span class="vocab-ipa">${esc(dp.d)} · ${esc(dp.a)}</span></div>
        <div class="row-sub">Day ${v.idx+1} 学习 · 第 ${v.stage+1} 轮复习</div>
      </div>
      <div class="row-side">${speakBtn(poemSayText(dp),0.85)}</div>
    </div>`;
  }).join("");

  return `
  <div class="hero">
    <div class="hero-day">${esc(stage.name)} · ${esc(stage.title)} · 已完成 ${done}/365 天</div>
    <div class="hero-title">Day ${day} · 《${esc(p.t)}》 ${esc(p.d)} · ${esc(p.a)}</div>
    <div class="hero-goal">今天学会并背诵这首诗：读准字音、弄懂意思、争取背下来，最后通过今日测试。</div>
    <div class="hero-actions">
      <button class="btn btn-primary" onclick="go('lesson',${day})"><i data-lucide="play"></i>开始今天的诗</button>
      <button class="btn btn-ghost" onclick="go('review')"><i data-lucide="repeat"></i>今日复习 ${due.length?`(${due.length})`:""}</button>
    </div>
  </div>

  <div class="mt14 plan-row">${planChips}</div>

  <div class="grid grid-4 mt14">
    <div class="card stat"><div class="stat-label"><i data-lucide="flame"></i>连续学习</div><div class="stat-value">${S.streak} <span class="stat-sub">天</span></div><div class="stat-sub">断了也没关系，接着 Day ${day} 继续</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成课程</div><div class="stat-value">${done} <span class="stat-sub">/ 365</span></div><div class="stat-sub">第 ${stage.range[0]}–${stage.range[1]} 天为当前阶段</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="book-open"></i>已学诗词</div><div class="stat-value">${Object.keys(S.review).length}</div><div class="stat-sub">到期待复习 ${due.length} 首</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="target"></i>测试平均分</div><div class="stat-value">${avgTest==null?"—":avgTest}</div><div class="stat-sub">共 ${S.tests.length} 次测试 · 错题 ${errs.length} 条</div></div>
  </div>

  <div class="grid grid-2 mt14">
    <div class="card card-pad">
      <div class="sec-title"><i data-lucide="activity"></i>六项能力<span class="tag brand">能力曲线</span></div>
      ${renderRadar(ab)}
    </div>
    <div class="card">
      <div class="card-pad" style="padding-bottom:8px">
        <div class="sec-title"><i data-lucide="repeat"></i>今日待复习<span class="tag ${due.length?"amber":"green"}">${due.length?due.length+" 首到期":"全部完成"}</span></div>
      </div>
      ${due.length ? dueList + `<div class="card-pad" style="padding-top:10px"><button class="btn btn-brand btn-sm" onclick="go('review')"><i data-lucide="arrow-right"></i>去复习</button></div>`
                  : `<div class="empty"><i data-lucide="check-circle-2"></i><div>今天没有到期的复习任务</div><div class="small muted">完成今日课程后，这首诗会自动进入复习队列</div></div>`}
    </div>
  </div>`;
}

function renderRadar(ab){
  const N = ABILITIES.length, R = 88, cx = 110, cy = 105;
  const pt = (i,val)=>{ const a = -Math.PI/2 + i*2*Math.PI/N; const r = R*val/100;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; };
  const ring = f => ABILITIES.map((_,i)=>{ const a=-Math.PI/2+i*2*Math.PI/N;
    return (i?"L":"M")+(cx+R*f*Math.cos(a)).toFixed(1)+","+(cy+R*f*Math.sin(a)).toFixed(1); }).join("")+"Z";
  const poly = ABILITIES.map((_,i)=>{ const [x,y]=pt(i,Math.max(ab[ABILITIES[i][0]],4)); return (i?"L":"M")+x.toFixed(1)+","+y.toFixed(1); }).join("")+"Z";
  const axes = ABILITIES.map((_,i)=>{ const [x,y]=pt(i,100); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e4e8ee"/>`; }).join("");
  const labels = ABILITIES.map(([k,name],i)=>{ const [x,y]=pt(i,126);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="10.5" fill="#667085" text-anchor="middle" dominant-baseline="middle">${name}</text>`; }).join("");
  const legend = ABILITIES.map(([k,name])=>{
    const v = ab[k];
    return `<div class="rl-row"><span class="rl-name">${name}</span><span class="rl-bar"><span class="rl-fill" style="width:${v}%"></span></span><span class="rl-val">${v}</span></div>`;
  }).join("");
  return `<div class="radar-wrap">
    <svg width="220" height="210" viewBox="0 0 220 210">
      ${[0.33,0.66,1].map(f=>`<path d="${ring(f)}" fill="none" stroke="#e4e8ee"/>`).join("")}
      ${axes}
      <path d="${poly}" fill="rgba(13,148,136,.18)" stroke="#0d9488" stroke-width="2"/>
      ${labels}
    </svg>
    <div class="radar-legend">${legend}</div>
  </div>`;
}

/* ================= 诗词地图 ================= */
let MAP_STAGE = 0;
function renderMap(){
  if(!MAP_STAGE) MAP_STAGE = DAY_MAP[S.currentDay-1].stage;
  const tabs = STAGES.map(s=>`
    <button class="stage-tab ${s.id===MAP_STAGE?"active":""}" onclick="setMapStage(${s.id})">
      <span class="dot" style="background:${s.color}"></span>${s.name} · ${s.title}
    </button>`).join("");
  const s = STAGES[MAP_STAGE-1];
  const cells = DAY_MAP.filter(m=>m.stage===MAP_STAGE).map(m=>{
    const p = POEMS[m.poem];
    const done = !!S.completedDays[m.day];
    const cur = m.day===S.currentDay;
    return `<div class="day-cell ${done?"done":""} ${cur?"current":""} ${m.day>S.currentDay?"locked":""}"
      title="Day ${m.day} · ${esc(p.t)} · ${esc(p.d)}·${esc(p.a)}" onclick="go('lesson',${m.day})">
      <div class="d">${done?"✓ ":""}Day ${m.day}</div>
      <div class="t">${esc(shortTitle(p.t))}</div>
    </div>`;
  }).join("");
  const doneInStage = DAY_MAP.filter(m=>m.stage===MAP_STAGE && S.completedDays[m.day]).length;
  return `
  <div class="page-head"><h1>365 天诗词地图</h1><p>六个阶段循序渐进，一年读完三百六十五首。点击任意一天查看课程。</p></div>
  <div class="stage-tabs">${tabs}</div>
  <div class="card card-pad">
    <div class="flex-between">
      <div>
        <div style="font-weight:600;font-size:15px">${s.name} · ${s.title} <span class="tag" style="margin-left:6px">Day ${s.range[0]}–${s.range[1]}</span></div>
        <div class="muted small mt8">${esc(s.desc)}</div>
      </div>
      <div class="tag brand">${doneInStage}/${s.range[1]-s.range[0]+1} 天完成</div>
    </div>
    <div class="map-legend">
      <span><span class="lg" style="background:#e8f7ee"></span>已完成</span>
      <span><span class="lg" style="border-color:#0d9488"></span>今天该学</span>
      <span><span class="lg" style="background:#f3f4f6"></span>未解锁</span>
    </div>
    <div class="day-grid">${cells}</div>
  </div>`;
}
function shortTitle(t){ return t.length>9 ? t.slice(0,9) : t; }
function setMapStage(id){ MAP_STAGE = id; render(); }

/* ================= 课程页 ================= */
let RECITE_LEVEL = "hint";
function renderLesson(day){
  const p = POEMS[day-1];
  const info = DAY_MAP[day-1];
  const stage = STAGES[info.stage-1];
  const done = S.completedDays[day];

  const steps = [["目标","sec-goal"],["听读","sec-listen"],["理解","sec-understand"],["背诵","sec-recite"],["复习","sec-review"],["测试","sec-quiz"]];
  const nav = steps.map(([t,id],i)=>`<button class="lesson-step" onclick="document.getElementById('${id}').scrollIntoView({behavior:'smooth'})">${i+1}. ${t}</button>`).join("");

  const linesHtml = p.l.map(ln=>`<span class="ln" onclick="speak('${ln.replace(/'/g,"")}',0.8,this)">${esc(ln)}</span>`).join("");
  const notesHtml = (p.n||[]).length
    ? `<div class="rule-box"><b>注 释</b><br>${p.n.map(x=>`<span class="note-item"><b>${esc(x[0])}</b>：${esc(x[1])}</span>`).join("　")}</div>`
    : "";

  const due = duePoems();
  const reviewHtml = due.length ? `
    <p class="muted small" style="margin-top:0">按间隔重复算法（1/2/4/7/15/30/60 天），今天有 ${due.length} 首旧诗到期。先去复习中心背一遍，再回来做今日测试。</p>
    ${due.slice(0,6).map(v=>{ const dp=POEMS[v.idx]; return `<div class="row-item" style="padding-left:0;padding-right:0">
      <div class="row-main"><div class="row-title">《${esc(dp.t)}》 <span class="vocab-ipa">${esc(dp.d)} · ${esc(dp.a)}</span></div>
      <div class="row-sub">第 ${v.stage+1} 轮 · 对 ${v.hits} 错 ${v.misses}</div></div>
      <div class="row-side">${speakBtn(poemSayText(dp),0.85)}</div></div>`; }).join("")}
    <div class="mt14"><button class="btn btn-brand btn-sm" onclick="go('review')"><i data-lucide="repeat"></i>开始今日背诵复习</button></div>`
    : `<p class="muted" style="margin:0">今天没有到期的复习内容。今天学的这首诗会在明天进入复习队列。</p>`;

  const sayAll = poemSayText(p) + " 白话译文。" + p.y;

  return `
  <div class="lesson-nav">${nav}</div>

  <div class="card card-pad lesson-sec" id="sec-goal">
    <div class="muted small">${esc(stage.name)} · ${esc(stage.title)} ${done?`· <span class="tag green">已完成${done.score!=null?" · 得分 "+done.score:""}</span>`:""}</div>
    <h1 style="font-size:22px;margin:4px 0 6px">Day ${day} · 《${esc(p.t)}》</h1>
    <div class="muted">${esc(p.d)}代 · ${esc(p.a)} ${p.g.map(x=>`<span class="poem-tag">${esc(x)}</span>`).join("")}</div>
    <div class="plan-row mt14">${PLAN.map(([k,m])=>`<span class="plan-chip"><i data-lucide="clock"></i>${esc(k)} <b>${m} 分钟</b></span>`).join("")}</div>
    <div class="mt14">
      <button class="btn btn-brand" data-say="${esc(sayAll)}" data-rate="0.85" data-follow="#sec-listen .poem-title-big, #listen-lines .ln, #sec-understand .yiwen-box" onclick="if(this.classList.contains('speaking'))return"><i data-lucide="audio-lines"></i>整首慢读（跟读高亮，再点一次停止）</button>
    </div>
  </div>

  <div class="card lesson-sec" id="sec-listen">
    <div class="lesson-sec-head"><span class="lesson-sec-num">1</span><span class="lesson-sec-title">听读跟读</span><span class="lesson-sec-min">约10分钟 · 点任意一句单独朗读，跟读 3 遍</span></div>
    <div class="lesson-sec-body">
      <div class="poem-title-big">${esc(p.t)}</div>
      <div class="poem-meta">${esc(p.d)} · ${esc(p.a)}</div>
      <div class="poem-lines" id="listen-lines">${linesHtml}</div>
    </div>
  </div>

  <div class="card lesson-sec" id="sec-understand">
    <div class="lesson-sec-head"><span class="lesson-sec-num">2</span><span class="lesson-sec-title">理解诗意</span><span class="lesson-sec-min">约15分钟 · 看注释和白话译文，逐句弄懂</span></div>
    <div class="lesson-sec-body">
      ${notesHtml}
      <div class="yiwen-box"><b>白话译文</b>${esc(p.y)}</div>
      <div class="shangxi-box"><b>赏 析</b>${esc(p.s)}</div>
    </div>
  </div>

  <div class="card lesson-sec" id="sec-recite">
    <div class="lesson-sec-head"><span class="lesson-sec-num">3</span><span class="lesson-sec-title">背诵闯关</span><span class="lesson-sec-min">约20分钟 · 由易到难三级，点诗句可提示</span></div>
    <div class="lesson-sec-body">
      <div class="recite-bar">
        ${[["hint","① 开头提示"],["half","② 遮一半"],["all","③ 全遮"],["show","全部显示"]].map(([l,label])=>
          `<button class="btn ${RECITE_LEVEL===l?"btn-brand":"btn-outline"} btn-sm" onclick="setReciteLevel('${l}')">${label}</button>`).join("")}
      </div>
      <div class="poem-title-big">${esc(p.t)}</div>
      <div class="poem-meta">${esc(p.d)} · ${esc(p.a)}</div>
      <div class="poem-lines" id="recite-lines">${p.l.map((ln,i)=>reciteLine(ln,RECITE_LEVEL,i)).join("")}</div>
      <div class="muted small" style="text-align:center">想不起来，点一下那句就有提示</div>
      <div class="recite-self">
        <div class="muted small" style="margin-bottom:8px">把屏幕扣下，不看手机完整背一遍——</div>
        <button class="btn btn-brand" onclick="reciteSelf(true)"><i data-lucide="check"></i>我能完整背出来了</button>
        <button class="btn btn-outline" onclick="reciteSelf(false)">还背不出</button>
      </div>
    </div>
  </div>

  <div class="card lesson-sec" id="sec-review">
    <div class="lesson-sec-head"><span class="lesson-sec-num">4</span><span class="lesson-sec-title">复习旧诗（间隔重复）</span><span class="lesson-sec-min">约10分钟 · 昨天 → 3 天前 → 7 天前 → 30 天前</span></div>
    <div class="lesson-sec-body">${reviewHtml}</div>
  </div>

  <div class="card lesson-sec" id="sec-quiz">
    <div class="lesson-sec-head"><span class="lesson-sec-num">5</span><span class="lesson-sec-title">今日测试</span><span class="lesson-sec-min">约5分钟 · 考今天这首诗 · 错题自动进错题本</span></div>
    <div class="lesson-sec-body" id="quizBox">
      <div class="flex" style="justify-content:space-between">
        <p class="muted" style="margin:0">学完以上内容后开始测试。提交后自动完成今日打卡。</p>
        <button class="btn btn-brand" onclick="startQuiz(${day})"><i data-lucide="play"></i>开始测试</button>
      </div>
    </div>
  </div>`;
}

/* 背诵模式：按级别渲染每一行 */
function reciteLine(ln, level, idx){
  if(level==="show") return `<span class="ln">${esc(ln)}</span>`;
  if(level==="hint"){
    const head = ln.slice(0,2), rest = ln.slice(2);
    return `<span class="ln" onclick="toggleLn(this)"><span>${esc(head)}</span><span class="blur">${esc(rest)}</span></span>`;
  }
  if(level==="half" && idx%2===1) return `<span class="ln">${esc(ln)}</span>`;
  return `<span class="ln hide" onclick="this.classList.toggle('hide')">${esc(ln)}</span>`;
}
function toggleLn(el){
  const b = el.querySelector(".blur");
  if(b) b.classList.toggle("blur"); else el.classList.toggle("hide");
}
function setReciteLevel(l){
  RECITE_LEVEL = l;
  render();
  const el = document.getElementById("sec-recite");
  if(el) el.scrollIntoView({behavior:"smooth"});
}
function reciteSelf(ok){
  if(!S.catScores.recite) S.catScores.recite = [];
  S.catScores.recite.push(ok?100:0);
  if(S.catScores.recite.length>20) S.catScores.recite.shift();
  save();
  toast(ok ? "太棒了！接着做今日测试，巩固一下" : "没关系，从「① 开头提示」再来一遍");
}

/* ================= 测试引擎 ================= */
let QUIZ = null;
function allLinesFlat(){
  const out = [];
  POEMS.forEach((p,pi)=>p.l.forEach(ln=>out.push({pi, ln})));
  return out;
}
function buildDayQuiz(day){
  const p = POEMS[day-1];
  const qs = [];
  const flat = allLinesFlat();
  // 1. 上句接下句（最多 3 组）
  const pairs = [];
  for(let li=0; li<p.l.length-1; li++) pairs.push([p.l[li], p.l[li+1]]);
  shuffle(pairs).slice(0,3).forEach(([q,a])=>{
    const distract = shuffle(flat.filter(x=>x.ln!==a)).slice(0,3).map(x=>x.ln);
    if(distract.length<3) return;
    const opts = shuffle([a, ...distract]);
    qs.push({ type:"choice", cat:"背诵", q:`「${q}」的下一句是？`, options:opts, answer:opts.indexOf(a),
      explain:`出自《${p.t}》（${p.d}·${p.a}）：${q}${a}` });
  });
  // 2. 作者
  const sameDynAuthors = [...new Set(POEMS.filter(x=>x.d===p.d && x.a!==p.a).map(x=>x.a))];
  const otherAuthors = [...new Set(POEMS.filter(x=>x.d!==p.d && x.a!==p.a).map(x=>x.a))];
  const authors = shuffle(sameDynAuthors).concat(shuffle(otherAuthors)).slice(0,3);
  if(authors.length>=3){
    const opts = shuffle([p.a, ...authors]);
    qs.push({ type:"choice", cat:"作者", q:`《${p.t}》的作者是？`, options:opts, answer:opts.indexOf(p.a),
      explain:`《${p.t}》是${p.d}代诗人${p.a}的作品。` });
  }
  // 3. 朝代
  const dynAll = [...new Set(POEMS.map(x=>x.d))].filter(d=>d!==p.d);
  const dys = shuffle(dynAll).slice(0,3);
  if(dys.length>=3){
    const opts = shuffle([p.d, ...dys]);
    qs.push({ type:"choice", cat:"朝代", q:`《${p.t}》是哪个朝代的作品？`, options:opts, answer:opts.indexOf(p.d),
      explain:`《${p.t}》是${p.d}代作品，作者${p.a}。` });
  }
  // 4. 主题
  const tagAll = [...new Set(POEMS.reduce((a,x)=>a.concat(x.g),[]))].filter(t=>!p.g.includes(t));
  const tags = shuffle(tagAll).slice(0,3);
  if(tags.length>=3){
    const t0 = p.g[0];
    const opts = shuffle([t0, ...tags]);
    qs.push({ type:"choice", cat:"理解", q:`《${p.t}》的主题最接近哪一项？`, options:opts, answer:opts.indexOf(t0),
      explain:`《${p.t}》的主题：${p.g.join("、")}。` });
  }
  return qs;
}

function startQuiz(day){
  const qs = buildDayQuiz(day);
  if(!qs.length){ toast("这首诗没有可出的题目"); return; }
  QUIZ = { day, type:"daily", questions: qs, answers: new Array(qs.length).fill(null) };
  renderQuiz();
}
function startReviewQuiz(){
  const due = duePoems();
  const pool = (due.length>=2 ? due : Object.keys(S.review).map(i=>({idx:+i})));
  if(pool.length < 2){ toast("先完成今天的课程，明天就有复习题了"); return; }
  const flat = allLinesFlat();
  const qs = [];
  shuffle(pool).slice(0,8).forEach(v=>{
    const p = POEMS[v.idx];
    if(!p || p.l.length<2) return;
    const li = Math.floor(Math.random()*(p.l.length-1));
    const a = p.l[li+1];
    const distract = shuffle(flat.filter(x=>x.ln!==a)).slice(0,3).map(x=>x.ln);
    if(distract.length<3) return;
    const opts = shuffle([a, ...distract]);
    qs.push({ type:"choice", cat:"背诵", q:`「${p.l[li]}」的下一句是？`, options:opts, answer:opts.indexOf(a),
      explain:`出自《${p.t}》（${p.d}·${p.a}）。`, poemIdx: v.idx });
  });
  if(qs.length<2){ toast("复习内容不足，先完成今日课程吧"); return; }
  QUIZ = { day: S.currentDay, type:"review", questions: qs, answers: new Array(qs.length).fill(null) };
  renderQuiz();
}
function startErrorQuiz(){
  const errs = activeErrors().filter(e=>e.options && e.answer!=null).slice(0,10);
  if(!errs.length){ toast("没有可重练的错题"); return; }
  const qs = errs.map(e=>({ type:"choice", cat:e.cat, q:e.qtext||e.front, options:e.options, answer:e.answer, explain:e.note, errId:e.id }));
  QUIZ = { day: S.currentDay, type:"error", questions: qs, answers: new Array(qs.length).fill(null) };
  renderQuiz();
}

function renderQuiz(){
  const box = $("#quizBox") || $("#view");
  const qs = QUIZ.questions;
  box.innerHTML = qs.map((q,i)=>`
    <div class="quiz-q" id="qq-${i}">
      <div class="quiz-q-head">
        <span class="quiz-num">第 ${i+1}/${qs.length} 题</span>
        <span class="quiz-cat">${esc(q.cat)}</span>
      </div>
      <div class="quiz-text" style="margin-bottom:10px">${esc(q.q)}</div>
      <div class="quiz-opts">
        ${q.options.map((o,j)=>`<button class="quiz-opt" onclick="answerQuiz(${i},${j},this)"><span class="quiz-letter">${"ABCD"[j]}</span><span>${esc(o)}</span></button>`).join("")}
      </div>
      <div class="quiz-explain">${esc(q.explain||"")}</div>
    </div>`).join("") +
    `<div class="flex mt14" style="justify-content:flex-end">
       <span class="muted small" style="margin-right:auto">点选后仍可改选，全部答完再提交</span>
       <button class="btn btn-brand" id="submitQuizBtn" onclick="submitQuiz()" disabled></button>
     </div>`;
  refreshIcons();
  updateSubmitBtn();
  box.scrollIntoView({behavior:"smooth"});
}
function updateSubmitBtn(){
  const btn = $("#submitQuizBtn");
  if(!btn || !QUIZ) return;
  const total = QUIZ.questions.length;
  const done = QUIZ.answers.filter(a=>a!==null).length;
  btn.innerHTML = `<i data-lucide="check"></i>${done < total ? `还剩 ${total-done} 题未答（${done}/${total}）` : "提交答案"}`;
  btn.disabled = done < total;
  refreshIcons();
}
function answerQuiz(i, j, btn){
  QUIZ.answers[i] = j;
  btn.closest(".quiz-opts").querySelectorAll(".quiz-opt").forEach((b,k)=>b.classList.toggle("sel", k===j));
  updateSubmitBtn();
}
function submitQuiz(){
  const results = QUIZ.questions.map((q,i)=>QUIZ.answers[i]===q.answer);
  QUIZ.questions.forEach((q,i)=>{
    const el = $("#qq-"+i);
    el.classList.add("done");
    el.querySelectorAll(".quiz-opt").forEach((b,j)=>{
      b.disabled = true;
      if(j===q.answer) b.classList.add("correct");
      else if(j===QUIZ.answers[i]) b.classList.add("wrong");
    });
    if(!results[i]){
      addError(q.cat, (q.q||"")+" → "+q.options[q.answer], q.explain||"正确答案："+q.options[q.answer], q, QUIZ.day);
    }
  });
  const r = recordTest(QUIZ.type, QUIZ.day, QUIZ.questions, results);
  QUIZ.questions.forEach((q,i)=>{
    if(q.errId && results[i]){
      const e = S.errors.find(x=>x.id===q.errId);
      if(e) e.done = true;
    }
    // 复习测验里答对的诗，复习推进一步
    if(q.poemIdx!=null && S.review[q.poemIdx] && QUIZ.type==="review"){
      if(results[i]){ /* 复习测验不直接推进，背诗才算 */ }
    }
  });
  const verdict = r.pct>=80 ? "掌握 ✅ 可以进入下一天" : r.pct>=60 ? "部分掌握 ⚠️ 建议明天先复习错题" : "未掌握 ❗ 今天内容需要重学";
  const isLessonQuiz = QUIZ.type==="daily";
  if(isLessonQuiz) completeDay(QUIZ.day, { pct: r.pct });
  save();
  const nextDay = Math.min(QUIZ.day+1, 365);
  $("#quizBox").insertAdjacentHTML("beforeend", `
    <div class="card quiz-result mt14" style="border:1px solid ${r.pct>=80?"#c4e8d0":r.pct>=60?"#f3ddba":"#f5c8c8"}">
      <div class="quiz-score" style="color:${r.pct>=80?"var(--green)":r.pct>=60?"var(--amber)":"var(--red)"}">${r.pct}<small> 分</small></div>
      <div class="quiz-verdict">${r.score}/${r.total} 题正确 · ${verdict}</div>
      ${isLessonQuiz?`<div class="small muted mt8">Day ${QUIZ.day} 已完成打卡</div>`:""}
      <div class="mt14 flex" style="justify-content:center;flex-wrap:wrap">
        ${isLessonQuiz && QUIZ.day<365?`<button class="btn btn-brand" onclick="go('lesson',${nextDay})"><i data-lucide="arrow-right"></i>进入 Day ${nextDay}</button>`:""}
        <button class="btn btn-outline" onclick="go('errors')"><i data-lucide="x-circle"></i>查看错题本</button>
        <button class="btn btn-outline" onclick="go('dashboard')"><i data-lucide="home"></i>回到首页</button>
      </div>
    </div>`);
  refreshIcons();
  const sb = $("#submitQuizBtn"); if(sb) sb.disabled = true;
  window.scrollTo({top:document.body.scrollHeight, behavior:"smooth"});
}

/* ================= 复习中心 ================= */
function renderReview(){
  const due = duePoems();
  const errs = activeErrors();
  const graduated = Object.values(S.review).filter(v=>v.stage>=REVIEW_INTERVALS.length).length;
  const upcoming = Object.entries(S.review)
    .filter(([,v])=>v.stage<REVIEW_INTERVALS.length && v.next>todayStr())
    .map(([i,v])=>({ idx:+i, ...v }))
    .sort((a,b)=>a.next<b.next?-1:1).slice(0,8);

  const dueCards = due.map(v=>{
    const p = POEMS[v.idx];
    return `
    <div class="card card-pad">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:17px">《${esc(p.t)}》 <span class="vocab-ipa">${esc(p.d)} · ${esc(p.a)}</span></div>
          <div class="muted small">第 ${v.stage+1} 轮复习 · 背出 ${v.hits} 次 · 卡壳 ${v.misses} 次</div>
        </div>
        ${speakBtn(poemSayText(p),0.85)}
      </div>
      <div class="poem-lines" style="margin-top:10px">${p.l.map(ln=>`<span class="ln hide" onclick="this.classList.toggle('hide')">${esc(ln)}</span>`).join("")}</div>
      <div class="muted small" style="text-align:center">先别看，心里默背；想不起来，点那句看一眼</div>
      <div class="flex mt14" style="justify-content:center">
        <button class="btn btn-brand" onclick="advanceReview(${v.idx},true);render()"><i data-lucide="check"></i>背出来了</button>
        <button class="btn btn-outline" onclick="advanceReview(${v.idx},false);render()">没背出来</button>
      </div>
    </div>`;
  }).join("");

  return `
  <div class="page-head"><h1>复习中心</h1><p>间隔重复节奏：学完 → 1 天后 → 2 天后 → 4 天后 → 7 天后 → 15 天后 → 30 天后 → 60 天后毕业。卡壳自动回到第一轮。</p></div>
  <div class="grid grid-3">
    <div class="card stat"><div class="stat-label"><i data-lucide="bell"></i>今日到期</div><div class="stat-value">${due.length}</div><div class="stat-sub">首旧诗等你背</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="x-circle"></i>待重练错题</div><div class="stat-value">${errs.length}</div><div class="stat-sub">来自历次测试</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="award"></i>已毕业</div><div class="stat-value">${graduated}</div><div class="stat-sub">首完成全部 7 轮复习</div></div>
  </div>
  <div class="card card-pad mt14">
    <div class="sec-title"><i data-lucide="play"></i>快速测验<span class="tag brand">从复习队列自动出题</span></div>
    <div class="flex" style="flex-wrap:wrap">
      <button class="btn btn-brand" onclick="startReviewQuiz()"><i data-lucide="repeat"></i>接下句测验</button>
      <button class="btn btn-outline" onclick="startErrorQuiz()" ${errs.filter(e=>e.options).length?"":"disabled"}><i data-lucide="rotate-ccw"></i>错题重练</button>
      ${Object.keys(S.review).length<2?'<span class="muted small">完成 Day 1 后，明天就有复习题了</span>':""}
    </div>
  </div>
  <div class="sec-title mt14" style="padding:0 2px;margin-bottom:10px"><i data-lucide="bell"></i>今日背诵复习（${due.length}）</div>
  ${due.length ? `<div class="grid grid-2">${dueCards}</div>`
    : `<div class="card"><div class="empty"><i data-lucide="check-circle-2"></i><div>今天没有到期的诗</div><div class="small muted">每天学完的课程，会按上面的节奏自动回来找你</div></div></div>`}
  <div class="card mt14">
    <div class="card-pad" style="padding-bottom:6px"><div class="sec-title"><i data-lucide="calendar"></i>即将到期</div></div>
    ${upcoming.length ? upcoming.map(v=>{ const p=POEMS[v.idx]; return `
      <div class="row-item"><div class="row-main">
        <div class="row-title">《${esc(p.t)}》 <span class="vocab-ipa">${esc(p.d)} · ${esc(p.a)}</span></div>
        <div class="row-sub">第 ${v.stage+1} 轮 · ${v.next} 到期</div></div>
        <div class="row-side">${speakBtn(poemSayText(p),0.85)}</div></div>`; }).join("")
      : `<div class="empty"><i data-lucide="calendar"></i><div>暂无排期</div></div>`}
  </div>
  <div class="card lesson-sec mt14">
    <div class="lesson-sec-head"><span class="lesson-sec-num">✓</span><span class="lesson-sec-title">测验区</span><span class="lesson-sec-min">测验会显示在这里</span></div>
    <div class="lesson-sec-body" id="quizBox"><p class="muted" style="margin:0">点上方「接下句测验」或「错题重练」开始。</p></div>
  </div>`;
}

/* ================= 错题本 ================= */
let ERR_FILTER = "全部";
function renderErrors(){
  const cats = ["全部","背诵","作者","朝代","理解"];
  const chips = cats.map(c=>{
    const n = c==="全部" ? activeErrors().length : activeErrors().filter(e=>e.cat===c).length;
    return `<button class="filter-chip ${ERR_FILTER===c?"active":""}" onclick="setErrFilter('${c}')">${c}${n?` (${n})`:""}</button>`;
  }).join("");
  const tagCls = { "背诵":"amber", "作者":"blue", "朝代":"violet", "理解":"green" };
  const list = activeErrors().filter(e=>ERR_FILTER==="全部"||e.cat===ERR_FILTER);
  const rows = list.length ? list.map(e=>`
    <div class="row-item">
      <div class="row-main">
        <div class="row-title"><span class="tag ${tagCls[e.cat]||"amber"}">${esc(e.cat)}</span>${esc(e.front)}</div>
        <div class="row-sub">${esc(e.note)} · Day ${e.day} · 错 ${e.count} 次 · ${e.date}</div>
      </div>
      <div class="row-side">
        <button class="btn btn-outline btn-sm" onclick="resolveError(${e.id})"><i data-lucide="check"></i>已掌握</button>
      </div>
    </div>`).join("")
    : `<div class="empty"><i data-lucide="check-circle-2"></i><div>太棒了，没有待处理的错题</div><div class="small muted">测试中答错的题目会自动分类记录到这里</div></div>`;
  return `
  <div class="page-head"><h1>错题本</h1><p>每次测试犯错自动分类记录。定期重练，确认掌握后点「已掌握」。</p></div>
  <div class="filter-row">${chips}</div>
  <div class="flex" style="margin-bottom:14px">
    <button class="btn btn-brand btn-sm" onclick="startErrorQuiz()" ${activeErrors().filter(e=>e.options).length?"":"disabled"}><i data-lucide="rotate-ccw"></i>重练全部错题</button>
  </div>
  <div class="card">${rows}</div>`;
}
function setErrFilter(c){ ERR_FILTER=c; render(); }
function resolveError(id){
  const e = S.errors.find(x=>x.id===id);
  if(e){ e.done = true; save(); render(); toast("已标记为掌握"); }
}

/* ================= 诗词库 ================= */
let LIB_Q = "", LIB_D = "全部", LIB_G = "全部";
const DYNASTY_ORDER = ["先秦","战国","秦末","汉","东汉","东晋","南朝","北朝","唐","五代","宋","元","明","清","现代"];
const LIB_TAGS = ["写景","抒怀","咏物","山水","言志","田园","思乡","哲理","爱国","思念"];
function renderLib(){
  const q = LIB_Q.trim();
  const list = POEMS.map((p,i)=>({ p, day:i+1 })).filter(({p})=>{
    if(LIB_D!=="全部" && p.d!==LIB_D) return false;
    if(LIB_G!=="全部" && !p.g.includes(LIB_G)) return false;
    if(q && !(p.t.includes(q) || p.a.includes(q) || p.l.some(ln=>ln.includes(q)))) return false;
    return true;
  });
  const dChips = ["全部", ...DYNASTY_ORDER.filter(d=>POEMS.some(p=>p.d===d))]
    .map(c=>`<button class="filter-chip ${LIB_D===c?"active":""}" onclick="setLibD('${c}')">${c}</button>`).join("");
  const gChips = ["全部", ...LIB_TAGS]
    .map(c=>`<button class="filter-chip ${LIB_G===c?"active":""}" onclick="setLibG('${c}')">${c}</button>`).join("");
  const rows = list.length ? list.map(({p,day})=>{
    const rv = S.review[day-1];
    const dots = rv ? `<span class="mastery" title="复习进度">${REVIEW_INTERVALS.map((_,i)=>`<i class="${i<rv.stage?"on":""}"></i>`).join("")}</span>` : "";
    const done = S.completedDays[day];
    return `
    <div class="row-item" style="cursor:pointer" onclick="go('lesson',${day})">
      <div class="row-main">
        <div class="row-title">《${esc(p.t)}》 ${done?'<span class="tag green">已学</span>':""}${dots}</div>
        <div class="row-sub">${esc(p.d)} · ${esc(p.a)} · 第 ${day} 天 · ${p.g.map(esc).join("、")}</div>
      </div>
      <div class="row-side">${speakBtn(poemSayText(p),0.85)}</div>
    </div>`;
  }).join("")
    : `<div class="empty"><i data-lucide="search-x"></i><div>没有找到匹配的诗</div><div class="small muted">换个关键词试试，可以搜诗名、诗人或诗句</div></div>`;
  return `
  <div class="page-head"><h1>诗词库 · 365 首</h1><p>点任意一首直接进入那一天的课程。竖条是复习进度，7 条全绿即毕业。</p></div>
  <input class="search-input" placeholder="搜诗名 / 诗人 / 诗句…" value="${esc(LIB_Q)}" oninput="setLibQ(this.value)">
  <div class="filter-row">${dChips}</div>
  <div class="filter-row">${gChips}</div>
  <div class="muted small" style="margin-bottom:8px">共 ${list.length} 首</div>
  <div class="card">${rows}</div>`;
}
function setLibQ(v){ LIB_Q=v; render(); const el=$(".search-input"); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
function setLibD(c){ LIB_D=c; render(); }
function setLibG(c){ LIB_G=c; render(); }

/* ================= 学习报告 ================= */
function renderStats(){
  const ab = abilityAll();
  const tests = S.tests.slice().reverse();
  const rows = tests.slice(0,30).map(t=>{
    const cls = t.pct>=80 ? "good" : t.pct>=60 ? "mid" : "low";
    const typeName = { daily:"每日", review:"复习", error:"错题" }[t.type] || t.type;
    return `<tr><td>${t.date}</td><td>${typeName}测试</td><td>Day ${t.day}</td><td>${t.score}/${t.total}</td><td><span class="score-pill ${cls}">${t.pct}</span></td></tr>`;
  }).join("");
  const graduated = Object.values(S.review).filter(v=>v.stage>=REVIEW_INTERVALS.length).length;
  return `
  <div class="page-head"><h1>学习报告</h1><p>不只用天数衡量进度——六项能力随每次测试动态更新。</p></div>
  <div class="card card-pad">
    <div class="sec-title"><i data-lucide="activity"></i>六项能力</div>
    ${renderRadar(ab)}
  </div>
  <div class="grid grid-3 mt14">
    <div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成天数</div><div class="stat-value">${Object.keys(S.completedDays).length}</div><div class="stat-sub">当前 Day ${S.currentDay}</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="award"></i>复习毕业</div><div class="stat-value">${graduated}</div><div class="stat-sub">首完成全部 7 轮复习</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="x-circle"></i>累计错题</div><div class="stat-value">${S.errors.length}</div><div class="stat-sub">待处理 ${activeErrors().length} 条</div></div>
  </div>
  <div class="card card-pad mt14">
    <div class="sec-title"><i data-lucide="clipboard-list"></i>测试记录<span class="tag">最近 ${Math.min(tests.length,30)} 次</span></div>
    ${tests.length?`<table class="tbl"><thead><tr><th>日期</th><th>类型</th><th>课程</th><th>题数</th><th>得分</th></tr></thead><tbody>${rows}</tbody></table>`
      :`<div class="empty"><i data-lucide="clipboard-list"></i><div>还没有测试记录</div><div class="small muted">完成 Day 1 测试后开始记录</div></div>`}
  </div>
  <div class="card card-pad mt14">
    <div class="sec-title"><i data-lucide="database"></i>数据管理</div>
    <div class="flex" style="flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="exportData()"><i data-lucide="download"></i>导出学习档案 (JSON)</button>
      <button class="btn btn-outline btn-sm" onclick="importData()"><i data-lucide="upload"></i>导入档案</button>
      <span class="muted small">学习档案保存在本机浏览器，不会丢失、不会因为换窗口而重置。</span>
    </div>
  </div>`;
}
function exportData(){
  const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `shi365-档案-${todayStr()}.json`;
  a.click();
  toast("学习档案已导出");
}
function importData(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json";
  inp.onchange = ()=>{
    const f = inp.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = ()=>{
      try{
        const data = JSON.parse(rd.result);
        S = Object.assign(defaultState(), data);
        save(); render();
        toast("档案导入成功");
      }catch(e){ toast("导入失败：文件格式不正确"); }
    };
    rd.readAsText(f);
  };
  inp.click();
}

/* ================= 启动 ================= */
$("#menuBtn").addEventListener("click", ()=>$("#sidebar").classList.toggle("open"));
$("#nav").addEventListener("click", e=>{
  const b = e.target.closest(".nav-item");
  if(b) go(b.dataset.view);
});
/* 语速滑块：40%–110% 自由调，实时显示，松手试听一句并记住 */
function syncRateSlider(){
  const r = $("#rateRange"), p = $("#ratePct");
  if(!r) return;
  r.value = ratePct();
  p.textContent = ratePct() + "%";
}
(function initRateSlider(){
  const r = $("#rateRange");
  if(!r) return;
  r.addEventListener("input", ()=>{ $("#ratePct").textContent = r.value + "%"; });
  r.addEventListener("change", ()=>{
    S.settings = S.settings || {};
    S.settings.ratePct = +r.value;
    save();
    speak("白日依山尽，黄河入海流。", 0.9);  // 用新语速试听一句
    toast(`语速已调到 ${r.value}%`);
  });
})();
/* 朗读遍数开关 ×1/×2/×3，记住选择 */
function syncRepeatToggle(){
  document.querySelectorAll("#repeatToggle button").forEach(b=>
    b.classList.toggle("active", +b.dataset.repeat === repeatTimes()));
}
$("#repeatToggle").addEventListener("click", e=>{
  const b = e.target.closest("[data-repeat]");
  if(!b) return;
  S.settings = S.settings || {};
  S.settings.repeat = +b.dataset.repeat;
  save(); syncRepeatToggle();
  toast(`朗读遍数设为 ${b.dataset.repeat} 遍`);
});
document.addEventListener("click", e=>{
  if(window.innerWidth<=760 && !e.target.closest(".sidebar") && !e.target.closest("#menuBtn"))
    $("#sidebar").classList.remove("open");
});

updateBadges();
syncRateSlider();
syncRepeatToggle();
go("dashboard");

/* lucide 为 defer 加载，首屏渲染后再补一次图标替换 */
window.addEventListener("load", ()=>{ refreshIcons(); setTimeout(refreshIcons, 500); });

/* ================= 云端同步（换浏览器/换手机不丢学习记录） ================= */
(function(){
  if(!window.fetch) return;
  const APP = "gushi";
  function hasProgress(st){
    return !!(st && (st.currentDay > 1
      || Object.keys(st.completedDays || {}).length
      || (st.tests || []).length
      || (st.errors || []).length
      || Object.keys(st.review || {}).length));
  }
  let timer = null;
  function push(){
    clearTimeout(timer);
    timer = setTimeout(()=>{
      try{
        S.updatedAt = Date.now();
        try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){}
        fetch("/.netlify/functions/progress?app=" + APP, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(S)
        }).catch(()=>{});
      }catch(e){}
    }, 800);
  }
  const _save = save;
  save = function(){ _save(); push(); };
  fetch("/.netlify/functions/progress?app=" + APP)
    .then(r => r.ok ? r.json() : null)
    .then(cloud => {
      if(!cloud){ if(hasProgress(S)) push(); return; }
      const lt = S.updatedAt || 0, ct = cloud.updatedAt || 0;
      const lp = hasProgress(S), cp = hasProgress(cloud);
      if(!lp && cp || (lp && cp && ct > lt)){
        try{ localStorage.setItem(STORE_KEY, JSON.stringify(cloud)); }catch(e){}
        if(!sessionStorage.getItem("cloudReloaded")){
          sessionStorage.setItem("cloudReloaded", "1");
          location.reload();
        }
      } else if(lp && (!cp || lt > ct)){ push(); }
    })
    .catch(()=>{});
})();
