/* 美式英语 365 —— 主程序 */
"use strict";

/* ================= 数据存储 ================= */
const STORE_KEY = "eng365-v1";

function defaultState(){
  return {
    currentDay: 1,
    streak: 0,
    lastStudyDate: null,
    completedDays: {},      // day -> {date, score, total}
    vocab: {},              // word -> {w,ipa,cn,ex,exCn,day,stage,next,hits,misses}
    errors: [],             // {id,cat,front,note,options,answer,say,day,date,count,done}
    tests: [],              // {type,day,score,total,pct,date}
    catScores: {},          // cat -> [pct,...]
    daily: {},              // day -> {date, minutes}
    settings: { rate: "slow", repeat: 1 },  // 语速偏好；朗读遍数 ×1/×2/×3
    version: 2,             // 数据结构版本（旧版 eng365-v1 自动迁移，不丢记录）
    lessonProgress: {},     // day -> 六环节完成情况/听写成绩/开口次数（js/lesson6.js）
    speakingLog: [],        // 跟读自检记录（仅本机）
  };
}

let S;
try { S = JSON.parse(localStorage.getItem(STORE_KEY)) || defaultState(); }
catch(e){ S = defaultState(); }
S = Object.assign(defaultState(), S);
/* 旧版本数据迁移：eng365-v1 学习记录全部保留，只补齐新增字段 */
if(!S.version){ S.version = 2; }
if(!S.lessonProgress) S.lessonProgress = {};
if(!S.speakingLog) S.speakingLog = [];

let __saveWarnTimer = null;
function save(){
  try{
    S.updatedAt = Date.now();
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  }catch(e){
    /* 隐私模式/存储已满：进度这次可能没存上，明确提示，绝不假装保存成功 */
    clearTimeout(__saveWarnTimer);
    __saveWarnTimer = setTimeout(()=>toast("学习记录保存失败：请退出浏览器无痕模式，或在「能力报告」里导出档案"), 300);
  }
}

/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
function esc(t){ return String(t==null?"":t).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function todayStr(){ // 北京时间
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
function bindViewEvents(){ /* 交互均通过全局事件委托与内联处理器绑定 */ }

/* ================= 语音合成（美式发音） ================= */
let VOICE = null;
function pickVoice(){
  /* 自动：不指定声音，跟随系统默认朗读声音（老爹 2026-09-22 在系统设置里重选了声音）。
     只设 u.lang=en-US，由浏览器用该语言的系统默认声音朗读 */
  VOICE = null;
}
if("speechSynthesis" in window){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text, rate, btn){
  if(!("speechSynthesis" in window)){ toast("当前浏览器不支持语音合成"); return; }
  stopSpeaking();
  const gen = __gen;
  const factor = rateFactor();
  const c = btn ? btn.closest(".sound-item,.vocab-card,.ex-row,.drill,.qa-card") : null;
  if(btn) btn.classList.add("speaking");
  if(c) c.classList.add("reading");
  let left = repeatTimes();
  showPauseFab();
  const play = () => {
    const u = new SpeechSynthesisUtterance(fixLetterCase(text));
    u.lang = "en-US";
    if(VOICE) u.voice = VOICE;
    u.rate = (rate || 0.9) * factor;
    let audioFailed = false;
    u.onerror = (ev)=>{
      if(audioFailed) return;
      audioFailed = true;
      btn && btn.classList.remove("speaking"); c && c.classList.remove("reading"); hidePauseFab();
      const why = ev && ev.error;
      if(why && why!=="canceled" && why!=="interrupted")
        toast("音频播放失败：可到 系统设置→辅助功能→朗读内容 里添加英语声音，或换 Chrome/Safari 重试");
    };
    u.onend = () => {
      if(audioFailed) return;
      if(--left > 0 && gen === __gen){ setTimeout(()=>{ if(gen === __gen) play(); }, 450); }
      else { btn && btn.classList.remove("speaking"); c && c.classList.remove("reading"); hidePauseFab(); }
    };
    speechSynthesis.speak(u);
  };
  play();
}

function repeatTimes(){ return (S.settings && S.settings.repeat) || 1; }

/* 语速百分比 40–110；旧设置 slow→72 / normal→100 自动迁移 */
function ratePct(){
  const st = S.settings || {};
  if(typeof st.ratePct === "number") return st.ratePct;
  return st.rate === "normal" ? 100 : 70;
}
function rateFactor(){ return ratePct() / 100; }

/* 停止一切朗读：递增代次让所有待重复的旧任务失效 */
let __gen = 0;
function stopSpeaking(){
  __gen++;
  try{ if(speechSynthesis.paused) speechSynthesis.resume(); }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
  __followTimers.forEach(clearTimeout); __followTimers = [];
  clearReading();
  hidePauseFab();
}

/* 暂停/继续悬浮键：朗读时自动出现在页面底部中央，点一下暂停、再点继续 */
let __pauseFab = null;
function ensurePauseFab(){
  if(__pauseFab) return __pauseFab;
  const b = document.createElement("button");
  b.className = "pause-fab";
  b.type = "button";
  b.onclick = togglePause;
  document.body.appendChild(b);
  __pauseFab = b;
  setPauseFabState(false);
  return b;
}
function setPauseFabState(paused){
  if(!__pauseFab) return;
  __pauseFab.innerHTML = paused
    ? '<i data-lucide="play"></i><span>继续</span>'
    : '<i data-lucide="pause"></i><span>暂停</span>';
  __pauseFab.classList.toggle("paused", paused);
  refreshIcons();
}
function showPauseFab(){
  const b = ensurePauseFab();
  setPauseFabState(false);
  b.classList.add("show");
}
function hidePauseFab(){
  if(__pauseFab) __pauseFab.classList.remove("show");
}
function togglePause(){
  if(!("speechSynthesis" in window)) return;
  try{
    if(speechSynthesis.paused){ speechSynthesis.resume(); setPauseFabState(false); }
    else { speechSynthesis.pause(); setPauseFabState(true); }
  }catch(e){}
}

/* 整段慢读 + 跟读高亮：
   朗读时按" … "分段，用语音边界事件（charIndex）定位当前段并高亮对应页面元素；
   浏览器不支持边界事件时，按文本长度估算时间做兜底 */
let __followTimers = [];
function clearReading(){ document.querySelectorAll(".reading").forEach(el=>el.classList.remove("reading")); }

/* 整页慢读：把当天课程全部英文按区块顺序串起来一次读完，
   跟读高亮从发音区一路走到口语区；再点一次停止 */
function readWholePage(btn){
  if(btn && btn.classList.contains("speaking")){
    stopSpeaking();
    btn.classList.remove("speaking");
    return;
  }
  const pairs = [];
  const grab = sel => document.querySelectorAll(sel).forEach(el=>{
    const b = el.querySelector(".speak-btn");
    const say = b && b.getAttribute("data-say");
    if(say) pairs.push([say, el]);
  });
  grab("#sec-phonics .sound-item");
  document.querySelectorAll("#sec-vocab .vocab-card").forEach(el=>{
    const texts = Array.from(el.querySelectorAll(".speak-btn")).map(b=>b.getAttribute("data-say")).filter(Boolean);
    if(texts.length) pairs.push([texts.join(", "), el]);   // 单词 + 例句为一段
  });
  grab("#sec-grammar .ex-row");
  grab("#sec-listening .drill");
  grab("#sec-speaking .qa-card");
  if(!pairs.length){ toast("本页没有可朗读的内容"); return; }
  speakFollow(pairs.map(p=>p[0]).join(" … "), 0.8, btn, pairs.map(p=>p[1]));
}

function speakFollow(text, rate, btn, targets, left){
  if(!("speechSynthesis" in window)){ toast("当前浏览器不支持语音合成"); return; }
  left = left == null ? repeatTimes() : left;
  stopSpeaking();
  const gen = __gen;
  const segs = text.split(" … ");
  let pos = 0;
  const ranges = segs.map(s=>{ const r=[pos, pos+s.length]; pos += s.length + 3; return r; });
  const targetOf = i => {
    if(!targets.length) return null;
    if(targets.length === ranges.length) return targets[i];
    if(targets.length*2 === ranges.length) return targets[Math.floor(i/2)];
    return targets[Math.min(targets.length-1, Math.floor(i*targets.length/ranges.length))];
  };
  const showAt = i => {
    clearReading();
    const el = targetOf(i);
    if(el){
      el.classList.add("reading");
      // 跟读光标保持在屏幕上方约 1/3 处：一到第二三行就提前翻页，不等到底部
      const r = el.getBoundingClientRect();
      const anchor = window.innerHeight * 0.35;
      if(r.top > anchor || r.bottom < 0){
        window.scrollBy({ top: r.top - anchor, behavior: "smooth" });
      }
    }
  };
  const u = new SpeechSynthesisUtterance(fixLetterCase(text));
  u.lang = "en-US";
  if(VOICE) u.voice = VOICE;
  const factor = rateFactor();
  u.rate = (rate || 0.9) * factor;
  let gotBoundary = false;
  u.onboundary = ev => {
    if(ev.charIndex == null) return;
    gotBoundary = true;
    let idx = ranges.findIndex(r => ev.charIndex < r[1]);
    if(idx < 0) idx = ranges.length - 1;
    showAt(idx);
  };
  u.onstart = () => {
    showAt(0);
    __followTimers.push(setTimeout(()=>{
      if(gotBoundary) return;
      let t = 0;
      segs.forEach((s,i)=>{
        __followTimers.push(setTimeout(()=>showAt(i), t));
        t += 350 + s.length * (90 / (u.rate || 0.9)) + 620;
      });
    }, 800));
  };
  u.onend = u.onerror = () => {
    __followTimers.forEach(clearTimeout); __followTimers = [];
    clearReading();
    if(--left > 0 && gen === __gen){
      setTimeout(()=>{ if(gen === __gen) speakFollow(text, rate, btn, targets, left); }, 700);
    } else {
      btn && btn.classList.remove("speaking");
      hidePauseFab();
    }
  };
  if(btn) btn.classList.add("speaking");
  showPauseFab();
  speechSynthesis.speak(u);
}
/* 单个/序列大写字母转小写再朗读：
   macOS「朗读大写字母」辅助功能会在每个大写字母前加报 "capital"（听起来像"开配累"），
   小写字母读音相同且不会触发 */
function fixLetterCase(t){
  if(/[a-z]/.test(t)) return t;                 // 含小写 = 正常单词/句子，不动
  const runs = t.match(/[A-Za-z]+/g) || [];
  // 所有字母段都是孤立单个大写字母（A、A … B … C、W-A-N-G 等）才转小写
  if(runs.length && runs.every(r => r.length === 1 && r === r.toUpperCase()))
    return t.toLowerCase();
  return t;
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-say]");
  if(!b) return;
  const followSel = b.getAttribute("data-follow");
  if(followSel){
    const scope = b.closest(".sound-group,.lesson-sec,.card") || document;
    const targets = Array.from(scope.querySelectorAll(followSel));
    speakFollow(b.getAttribute("data-say"), b.getAttribute("data-rate") ? +b.getAttribute("data-rate") : 0.9, b, targets);
  }else{
    speak(b.getAttribute("data-say"), b.getAttribute("data-rate") ? +b.getAttribute("data-rate") : 0.9, b);
  }
});
function speakBtn(text, rate){
  return `<button class="speak-btn" data-say="${esc(text)}"${rate?` data-rate="${rate}"`:""} title="点击播放美式发音"><i data-lucide="volume-2"></i></button>`;
}

/* 从音标条目中挑出真正可朗读的英文：
   音标符号本身无法合成语音，要读示例单词 */
function isPlainEnglish(t){
  return /^[A-Za-z][A-Za-z'’\s?!.,-]*$/.test(t) && /[a-z]/i.test(t);
}
function pickSpeakText(w, rest){
  const cands = w.includes("→")
    ? [w.split("→").pop().trim(), rest||"", w.split("→")[0].trim()]
    : [w.trim(), rest||""];
  for(const c of cands){ if(c && isPlainEnglish(c)) return c; }
  // 兜底：从字符串里提取第一个英文词
  const m = ((w||"")+" "+(rest||"")).match(/[A-Za-z'’]+/);
  return m ? m[0] : "a";
}
/* 清理参考回答文本：去中文、去省略号 */
function cleanRefText(t){
  const c = t.replace(/（.*?）/g,"").replace(/\.\.\.|…/g,"").replace(/[^\x00-\x7F]/g," ").replace(/\s+/g," ").trim();
  return c || "OK";
}

/* ================= 语音识别（口语跟读） ================= */
function makeRecognizer(onResult, onEnd){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = e => onResult(e.results[0][0].transcript);
  r.onend = ()=>onEnd && onEnd();
  r.onerror = ()=>onEnd && onEnd();
  return r;
}
function normWords(t){ return t.toLowerCase().replace(/[^a-z\s']/g," ").split(/\s+/).filter(w=>w && w!=="a" && w!=="the"); }
function matchScore(target, said){
  const t = normWords(target); if(!t.length) return 0;
  const s = new Set(normWords(said));
  let hit = 0; t.forEach(w=>{ if(s.has(w)) hit++; });
  return hit / t.length;
}

/* ================= 复习算法（1/2/3/7/14/30 天） ================= */
function learnVocabFromLesson(day){
  const L = getLesson(day); if(!L) return;
  const today = todayStr();
  (L.vocab||[]).forEach(v=>{
    if(!S.vocab[v.w]){
      S.vocab[v.w] = { w:v.w, ipa:v.ipa, cn:v.cn, ex:v.ex, exCn:v.exCn, day, stage:0, next:addDays(today, REVIEW_INTERVALS[1]), hits:0, misses:0 };
    }
  });
}
function dueVocab(){
  const today = todayStr();
  return Object.values(S.vocab).filter(v => v.stage < REVIEW_INTERVALS.length && v.next <= today);
}
function activeErrors(){ return S.errors.filter(e=>!e.done); }

function addError(cat, front, note, q, day){
  // 同类错误合并计数
  const exist = S.errors.find(e=>!e.done && e.front===front && e.cat===cat);
  if(exist){ exist.count++; exist.date = todayStr(); return; }
  S.errors.push({
    id: Date.now()+Math.random(), cat, front, note,
    options: q && q.options ? q.options.slice() : null,
    answer: q ? q.answer : null,
    say: q && q.say ? q.say : null,
    qtext: q && q.q ? q.q : null,
    day, date: todayStr(), count:1, done:false,
  });
}

/* ================= 能力记录 ================= */
const CAT_TO_ABILITY = { "发音":"pronunciation","听力":"listening","词汇":"vocabulary","语法":"grammar","句型":"grammar","口语":"speaking","阅读":"reading" };
function recordTest(type, day, questions, results){
  const total = questions.length;
  const score = results.filter(Boolean).length;
  const pct = Math.round(score/total*100);
  S.tests.push({ type, day, score, total, pct, date: todayStr() });
  // 分类能力
  questions.forEach((q,i)=>{
    const ab = CAT_TO_ABILITY[q.cat]; if(!ab) return;
    if(!S.catScores[ab]) S.catScores[ab] = [];
    S.catScores[ab].push(results[i]?100:0);
    if(S.catScores[ab].length>20) S.catScores[ab].shift();
  });
  // 词汇命中记录
  questions.forEach((q,i)=>{
    if(q.vocabWord && S.vocab[q.vocabWord]){
      const v = S.vocab[q.vocabWord];
      if(results[i]){ v.hits++; v.stage = Math.min(v.stage+1, REVIEW_INTERVALS.length-1); }
      else { v.misses++; v.stage = 0; }
      v.next = addDays(todayStr(), REVIEW_INTERVALS[Math.min(v.stage+1, REVIEW_INTERVALS.length-1)]);
    }
  });
  save();
  return { score, total, pct };
}
function abilityValue(key){
  const arr = S.catScores[key];
  if(!arr || !arr.length) return key==="reading" && Object.keys(S.completedDays).length ? 20 : 5;
  const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.round(5 + avg*0.95);
}
function abilityAll(){
  const o = {};
  ABILITIES.forEach(([k])=> o[k]=abilityValue(k));
  o.communication = Math.round((o.listening*0.4 + o.speaking*0.4 + o.vocabulary*0.2));
  return o;
}

/* ================= 打卡 ================= */
function completeDay(day, scoreInfo){
  const today = todayStr();
  if(!S.completedDays[day]){
    S.completedDays[day] = { date: today, score: scoreInfo ? scoreInfo.pct : null };
    // 连续天数
    if(S.lastStudyDate !== today){
      S.streak = (S.lastStudyDate === addDays(today,-1)) ? S.streak+1 : 1;
      S.lastStudyDate = today;
    }
  }
  S.daily[day] = { date: today };
  if(day === S.currentDay && day < 365) S.currentDay = day+1;
  save();
  updateBadges();
}

/* ================= 路由 ================= */
let VIEW = "dashboard";
let LESSON_DAY = null;
const VIEW_TITLES = { dashboard:"今日学习", map:"365 天课程地图", review:"复习中心", errors:"错题本", vocab:"词汇库", stats:"能力报告", lesson:"课程" };

function go(view, arg){
  VIEW = view;
  if(view==="lesson") LESSON_DAY = arg;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  $("#topbarTitle").textContent = view==="lesson" ? `Day ${arg} · ${esc((LESSONS[arg]||DAY_MAP[arg-1]).title)}` : VIEW_TITLES[view];
  $("#sidebar").classList.remove("open");
  window.scrollTo(0,0);
  render();
}

function render(){
  const v = $("#view");
  speechSynthesis && speechSynthesis.cancel();
  if(VIEW==="dashboard") v.innerHTML = renderDashboard();
  else if(VIEW==="map") v.innerHTML = renderMap();
  else if(VIEW==="lesson") v.innerHTML = renderLesson(LESSON_DAY);
  else if(VIEW==="review") v.innerHTML = renderReview();
  else if(VIEW==="errors") v.innerHTML = renderErrors();
  else if(VIEW==="vocab") v.innerHTML = renderVocab();
  else if(VIEW==="stats") v.innerHTML = renderStats();
  refreshIcons();
  bindViewEvents();
  updateBadges();
}

function updateBadges(){
  const due = dueVocab().length, errs = activeErrors().length;
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
function renderDashboard(){
  const day = S.currentDay;
  const info = DAY_MAP[day-1];
  const lesson = getLesson(day);
  const stage = STAGES[info.stage-1];
  const due = dueVocab();
  const errs = activeErrors();
  const done = Object.keys(S.completedDays).length;
  const ab = abilityAll();
  const avgTest = S.tests.length ? Math.round(S.tests.reduce((a,t)=>a+t.pct,0)/S.tests.length) : null;

  const planChips = lesson ? lesson.plan.map(([k,m])=>
    `<span class="plan-chip"><i data-lucide="clock"></i>${esc(k)} <b>${m} 分钟</b></span>`).join("")
    : `<span class="plan-chip"><i data-lucide="clock"></i>发音/听力 <b>15 分钟</b></span>
       <span class="plan-chip"><i data-lucide="clock"></i>主题学习 <b>20 分钟</b></span>
       <span class="plan-chip"><i data-lucide="clock"></i>口语输出 <b>15 分钟</b></span>
       <span class="plan-chip"><i data-lucide="clock"></i>间隔复习 <b>10 分钟</b></span>`;

  const dueList = due.slice(0,6).map(v=>`
    <div class="row-item">
      <div class="row-main">
        <div class="row-title">${esc(v.w)} <span class="vocab-ipa">${esc(v.ipa||"")}</span></div>
        <div class="row-sub">${esc(v.cn)} · Day ${v.day} 学习 · 第 ${v.stage+1} 轮复习</div>
      </div>
      <div class="row-side">${speakBtn(v.w)}</div>
    </div>`).join("");

  return `
  <div class="hero">
    <div class="hero-day">${esc(stage.name)} · ${esc(stage.title)} · 已完成 ${done}/365 天</div>
    <div class="hero-title">Day ${day} · ${esc(info.title)}</div>
    <div class="hero-goal">${esc(lesson ? lesson.goal : "今日主题："+info.title+"。按照阶段框架学习，并完成间隔复习与打卡。")}</div>
    <div class="hero-actions">
      <button class="btn btn-primary" onclick="go('lesson',${day})"><i data-lucide="play"></i>开始今天英语</button>
      <button class="btn btn-ghost" onclick="go('review')"><i data-lucide="repeat"></i>今日复习 ${due.length?`(${due.length})`:""}</button>
    </div>
  </div>

  <div class="mt14 plan-row">${planChips}</div>

  <div class="grid grid-4 mt14">
    <div class="card stat"><div class="stat-label"><i data-lucide="flame"></i>连续学习</div><div class="stat-value">${S.streak} <span class="stat-sub">天</span></div><div class="stat-sub">断了也没关系，接着 Day ${day} 继续</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成课程</div><div class="stat-value">${done} <span class="stat-sub">/ 365</span></div><div class="stat-sub">第 ${stage.range[0]}–${stage.range[1]} 天为当前阶段</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="book-open"></i>已学词汇</div><div class="stat-value">${Object.keys(S.vocab).length}</div><div class="stat-sub">到期待复习 ${due.length} 个</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="target"></i>测试平均分</div><div class="stat-value">${avgTest==null?"—":avgTest}</div><div class="stat-sub">共 ${S.tests.length} 次测试 · 错题 ${errs.length} 条</div></div>
  </div>

  <div class="grid grid-2 mt14">
    <div class="card card-pad">
      <div class="sec-title"><i data-lucide="activity"></i>七项能力<span class="tag brand">能力曲线</span></div>
      ${renderRadar(ab)}
    </div>
    <div class="card">
      <div class="card-pad" style="padding-bottom:8px">
        <div class="sec-title"><i data-lucide="repeat"></i>今日待复习<span class="tag ${due.length?"amber":"green"}">${due.length?due.length+" 个到期":"全部完成"}</span></div>
      </div>
      ${due.length ? dueList + `<div class="card-pad flex" style="padding-top:10px;gap:8px">
          <button class="btn btn-outline btn-sm" data-say="${esc(due.slice(0,6).map(v=>v.w).join(" … "))}" data-rate="0.85" data-follow=".row-item"><i data-lucide="play"></i>朗读全部</button>
          <button class="btn btn-brand btn-sm" onclick="go('review')"><i data-lucide="arrow-right"></i>去复习</button></div>`
                  : `<div class="empty"><i data-lucide="check-circle-2"></i><div>今天没有到期的复习任务</div><div class="small muted">完成今日课程后，新单词会自动进入复习队列</div></div>`}
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

/* ================= 课程地图 ================= */
let MAP_STAGE = 0; // 0 = 当前阶段
function renderMap(){
  if(!MAP_STAGE) MAP_STAGE = DAY_MAP[S.currentDay-1].stage;
  const tabs = STAGES.map(s=>`
    <button class="stage-tab ${s.id===MAP_STAGE?"active":""}" onclick="setMapStage(${s.id})">
      <span class="dot" style="background:${s.color}"></span>${s.name} · ${s.title}
    </button>`).join("");
  const s = STAGES[MAP_STAGE-1];
  const cells = DAY_MAP.filter(m=>m.stage===MAP_STAGE).map(m=>{
    const done = !!S.completedDays[m.day];
    const cur = m.day===S.currentDay;
    const isTest = m.kind.includes("test");
    return `<div class="day-cell ${done?"done":""} ${cur?"current":""} ${isTest?"test":""} ${m.day>S.currentDay?"locked":""}"
      title="Day ${m.day} · ${esc(m.title)}" onclick="go('lesson',${m.day})">
      <div class="d">${done?"✓ ":""}Day ${m.day}</div>
      <div class="t">${isTest?"★ ":""}${esc(shortTitle(m.title))}</div>
    </div>`;
  }).join("");
  const doneInStage = DAY_MAP.filter(m=>m.stage===MAP_STAGE && S.completedDays[m.day]).length;
  return `
  <div class="page-head"><h1>365 天课程地图</h1><p>六个阶段循序渐进。点击任意一天查看课程；灰色是尚未解锁的天数（也可以提前浏览）。</p></div>
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
      <span style="color:#d97706">★ 测试日</span>
    </div>
    <div class="day-grid">${cells}</div>
  </div>`;
}
function shortTitle(t){ return t.length>10 ? t.slice(0,10) : t; }
function setMapStage(id){ MAP_STAGE = id; render(); }

/* ================= 课程页 ================= */
function renderLesson(day){
  const info = DAY_MAP[day-1];
  const L = getLesson(day);
  const stage = STAGES[info.stage-1];
  const done = S.completedDays[day];

  if(!L) return renderOutlineLesson(day, info, stage, done);

  const steps = [["目标","sec-goal"],["发音","sec-phonics"],["单词","sec-vocab"],["句型","sec-grammar"],["听力","sec-listening"],["口语","sec-speaking"],["复习","sec-review"],["测试","sec-quiz"]];
  const nav = steps.map(([t,id],i)=>`<button class="lesson-step" onclick="document.getElementById('${id}').scrollIntoView({behavior:'smooth'})">${i+1}. ${t}</button>`).join("");

  const phonicsGroups = (L.phonics.groups||[]).map(g=>`
    <div class="sound-group">
      <div class="sound-group-head">${esc(g.name)}
        <button class="btn btn-outline btn-sm" style="margin-left:auto" data-say="${esc(g.items.map(it=>pickSpeakText(it[0],it[1])).join(" … "))}" data-rate="0.85" data-follow=".sound-item"><i data-lucide="play"></i>整组慢读</button>
      </div>
      <div class="sound-items">${g.items.map(it=>{
        const [w,rest,sub,sub2] = it;
        const sayText = pickSpeakText(w, rest);
        if(sub !== undefined){
          return `<span class="sound-item wide"><span class="si-top"><b>${esc(w)}</b><span class="ipa">${esc(rest||"")}</span>${speakBtn(sayText,0.7)}</span><span class="si-sub pos">${esc(sub)}</span>${sub2!==undefined?`<span class="si-sub">${esc(sub2)}</span>`:""}</span>`;
        }
        return `<span class="sound-item"><b>${esc(w)}</b>${rest?`<span class="ipa">${esc(rest)}</span>`:""}${speakBtn(sayText,0.7)}</span>`;
      }).join("")}</div>
    </div>`).join("");
  const phonicsTips = (L.phonics.tips||[]).map(t=>`<div class="tip-box"><b>提示</b> · ${esc(t)}</div>`).join("");

  const vocabCards = (L.vocab||[]).map(v=>{
    const learned = S.vocab[v.w] ? `<span class="tag green">已入库</span>` : "";
    return `<div class="vocab-card">
        <div class="vocab-top"><span class="vocab-word">${esc(v.w)}</span><span class="vocab-ipa">${esc(v.ipa)}</span><span class="vocab-cn">${esc(v.cn)}</span>${learned}${speakBtn(v.w,0.8)}</div>
        <div class="vocab-tip">发音提示 · ${esc(v.tip)}</div>
        <div class="vocab-ex">
          <div class="vocab-ex-en">${esc(v.ex)}${speakBtn(v.ex,0.8)}</div>
        <div class="vocab-ex-cn">${esc(v.exCn)}</div>
      </div>
    </div>`;
  }).join("");

  const grammarRows = (L.grammar.examples||[]).map(([en,cn])=>`
    <div class="ex-row"><div><div class="ex-en">${esc(en)}</div><div class="ex-cn">${esc(cn)}</div></div>${speakBtn(en.includes("→")?en.split("→").pop().trim():en,0.85)}</div>`).join("");

  const drills = (L.listening||[]).map((d,i)=>`
    <div class="drill" id="drill-${day}-${i}">
      <div class="drill-top">
        ${speakBtn(d.say,0.78)}
        <span class="muted small">${esc(d.cn)}</span>
        <button class="reveal-btn" style="margin-left:auto" onclick="this.closest('.drill').classList.toggle('open')">显示答案</button>
      </div>
      <div class="drill-answer"><b>${esc(d.show)}</b></div>
    </div>`).join("");

  const qas = (L.speaking||[]).map((q,i)=>`
    <div class="qa-card">
      <div class="qa-q">${speakBtn(q.q,0.8)}${esc(q.q)}</div>
      <div class="qa-hint">参考回答 · <b>${esc(q.hint)}</b></div>
      <div class="qa-actions">
        <button class="mic-btn" data-mic="${esc(q.hint)}" data-qid="${day}-${i}"><i data-lucide="mic"></i>我说一遍</button>
        <button class="mic-btn" data-say="${esc(cleanRefText(q.hint))}" data-rate="0.78"><i data-lucide="volume-2"></i>听参考回答</button>
      </div>
      <div class="mic-result" id="mic-result-${day}-${i}"></div>
    </div>`).join("");

  const due = dueVocab();
  const reviewHtml = due.length ? `
    <p class="muted small" style="margin-top:0">按间隔重复算法（1/2/3/7/14/30 天），今天有 ${due.length} 个旧词到期。先去复习中心过一遍，再回来做今日测试。</p>
    ${due.slice(0,8).map(v=>`<div class="row-item" style="padding-left:0;padding-right:0">
      <div class="row-main"><div class="row-title">${esc(v.w)} <span class="vocab-ipa">${esc(v.ipa||"")}</span></div>
      <div class="row-sub">${esc(v.cn)}</div></div>
      <div class="row-side">${speakBtn(v.w)}</div></div>`).join("")}
    ${due.length>8?`<div class="muted small mt8">还有 ${due.length-8} 个…</div>`:""}
    <div class="mt14"><button class="btn btn-brand btn-sm" onclick="go('review')"><i data-lucide="repeat"></i>开始今日复习测验</button></div>`
    : `<p class="muted" style="margin:0">今天没有到期的复习内容。新学的单词会在明天进入复习队列。</p>`;

  // 各区块「整段慢读」：把区块内所有英文串起来一次读完，方便跟读
  const joinPause = arr => arr.filter(Boolean).join(" … ");
  const phonicsSayAll = joinPause((L.phonics.groups||[]).flatMap(g=>g.items.map(it=>pickSpeakText(it[0],it[1]))));
  const vocabSayAll = joinPause((L.vocab||[]).map(v=>`${v.w} … ${v.ex}`));
  const grammarSayAll = joinPause((L.grammar.examples||[]).map(([en])=>en.includes("→")?en.split("→").pop().trim():en));
  const listenSayAll = joinPause((L.listening||[]).map(d=>d.say));
  const speakSayAll = joinPause((L.speaking||[]).map(q=>q.q));
  const reviewSayAll = joinPause(due.slice(0,8).map(v=>v.w));
  const playFollowBtn = (text, rate, sel) =>
    `<button class="btn btn-outline btn-sm" data-say="${esc(text)}" data-rate="${rate}" data-follow="${sel}"><i data-lucide="play"></i>整段慢读</button>`;

  return `
  <div class="lesson-nav">${nav}</div>

  <div class="card card-pad lesson-sec" id="sec-goal">
    <div class="flex-between">
      <div>
        <div class="muted small">${esc(stage.name)} · ${esc(stage.title)} · ${done?`<span class="tag green">已完成 · ${done.score!=null?"得分 "+done.score:"已打卡"}</span>`:""}</div>
        <h1 style="font-size:22px;margin:4px 0 6px">Day ${day} · ${esc(L.title)}</h1>
        <div class="muted">${esc(L.goal)}</div>
      </div>
    </div>
    <div class="plan-row mt14">${L.plan.map(([k,m])=>`<span class="plan-chip"><i data-lucide="clock"></i>${esc(k)} <b>${m} 分钟</b></span>`).join("")}</div>
    <div class="mt14">
      <button class="btn btn-brand" onclick="readWholePage(this)"><i data-lucide="audio-lines"></i>整页慢读（跟读高亮，再点一次停止）</button>
    </div>
  </div>

  <div class="card lesson-sec" id="sec-phonics">
    <div class="lesson-sec-head"><span class="lesson-sec-num">1</span><span class="lesson-sec-title">今日发音</span>${phonicsSayAll?playFollowBtn(phonicsSayAll,0.8,".sound-item"):""}<span class="lesson-sec-min">点击喇叭听美式发音 · 跟读 3 遍</span></div>
    <div class="lesson-sec-body">
      <p class="phonics-intro">${esc(L.phonics.intro)}</p>
      ${phonicsGroups}
      ${phonicsTips}
    </div>
  </div>

  <div class="card lesson-sec" id="sec-vocab">
    <div class="lesson-sec-head"><span class="lesson-sec-num">2</span><span class="lesson-sec-title">今日单词</span>${playFollowBtn(vocabSayAll,0.8,".vocab-card")}<span class="lesson-sec-min">${(L.vocab||[]).length} 个高频词 · 音标 + 例句 + 搭配</span></div>
    <div class="lesson-sec-body"><div class="grid grid-2">${vocabCards}</div></div>
  </div>

  <div class="card lesson-sec" id="sec-grammar">
    <div class="lesson-sec-head"><span class="lesson-sec-num">3</span><span class="lesson-sec-title">今日句型</span>${playFollowBtn(grammarSayAll,0.8,".ex-row")}<span class="lesson-sec-min">规则 → 例句 → 模仿 → 自己造句</span></div>
    <div class="lesson-sec-body">
      <div class="rule-box"><b>${esc(L.grammar.title)}</b><br>${esc(L.grammar.rule)}</div>
      ${grammarRows}
    </div>
  </div>

  <div class="card lesson-sec" id="sec-listening">
    <div class="lesson-sec-head"><span class="lesson-sec-num">4</span><span class="lesson-sec-title">今日听力</span>${playFollowBtn(listenSayAll,0.78,".drill")}<span class="lesson-sec-min">先听不看，猜完再显示答案</span></div>
    <div class="lesson-sec-body">${drills}</div>
  </div>

  <div class="card lesson-sec" id="sec-speaking">
    <div class="lesson-sec-head"><span class="lesson-sec-num">5</span><span class="lesson-sec-title">今日口语</span>${playFollowBtn(speakSayAll,0.8,".qa-card")}<span class="lesson-sec-min">必须开口 · 可用麦克风自检</span></div>
    <div class="lesson-sec-body">${qas}</div>
  </div>

  <div class="card lesson-sec" id="sec-review">
    <div class="lesson-sec-head"><span class="lesson-sec-num">6</span><span class="lesson-sec-title">今日复习（间隔重复）</span>${reviewSayAll?playFollowBtn(reviewSayAll,0.8,".row-item"):""}<span class="lesson-sec-min">昨天 → 3 天前 → 7 天前 → 30 天前</span></div>
    <div class="lesson-sec-body">${reviewHtml}</div>
  </div>

  <div class="card lesson-sec" id="sec-quiz">
    <div class="lesson-sec-head"><span class="lesson-sec-num">7</span><span class="lesson-sec-title">${info.kind==="monthly-test"?"月度测试":info.kind==="weekly-test"?"本周测试":"今日测试"}</span><span class="lesson-sec-min">${L.quiz.length} 题 · 错题自动进入错题本</span></div>
    <div class="lesson-sec-body" id="quizBox">
      <div class="flex" style="justify-content:space-between">
        <p class="muted" style="margin:0">学完以上内容后开始测试。成绩会计入能力曲线，词汇掌握度会同步更新。</p>
        <button class="btn btn-brand" onclick="startQuiz(${day})"><i data-lucide="play"></i>开始测试</button>
      </div>
    </div>
  </div>`;
}

/* 31–365 天：框架课程（大纲 + 复习测验 + 打卡） */
function renderOutlineLesson(day, info, stage, done){
  const typeLabel = { "weekly-test":"本周测试日","monthly-test":"月度测试日","stage-test":"阶段测试日","final-test":"毕业总测试日" }[info.kind] || "主题学习日";
  const outline = [
    ["发音/听力", `围绕「${info.title}」进行 15–20 分钟听辨与跟读。第四阶段起重点：连读、弱读、Flap T、语调。`],
    ["词汇", "学习本主题 6–10 个高频词：英文 + 美式音标 + 中文 + 例句 + 搭配，学完口头造句。"],
    ["语法/句型", `按阶段框架推进：${stage.id===2?"be 动词、一般现在时、疑问句、there be、have/has、can、代词冠词、介词":stage.id===3?"一般过去时、将来时、进行时、不规则动词、比较级、情态动词、短语动词":"高频口语表达与惯用句型"}。`],
    ["口语", `围绕「${info.theme}」场景进行问答对话：主动输出，用自己的话回答 5–10 个问题。`],
    ["复习", "完成复习中心今天到期的所有单词与错题（间隔重复 1/2/3/7/14/30 天）。"],
  ].map(([k,v])=>`<li><span class="k">${k}</span><span>${esc(v)}</span></li>`).join("");

  return `
  <div class="card card-pad lesson-sec">
    <div class="muted small">${esc(stage.name)} · ${esc(stage.title)} · ${typeLabel} ${done?`· <span class="tag green">已完成</span>`:""}</div>
    <h1 style="font-size:22px;margin:4px 0 6px">Day ${day} · ${esc(info.title)}</h1>
    <p class="muted">本周主题：${esc(info.theme)}。第 31 天起按阶段框架学习——本页给出今天的学习任务单，单词与错题复习由系统自动安排。</p>
    <div class="plan-row">
      <span class="plan-chip"><i data-lucide="clock"></i>发音/听力 <b>15–20 分钟</b></span>
      <span class="plan-chip"><i data-lucide="clock"></i>主题学习 <b>20 分钟</b></span>
      <span class="plan-chip"><i data-lucide="clock"></i>口语输出 <b>15 分钟</b></span>
      <span class="plan-chip"><i data-lucide="clock"></i>间隔复习 <b>10 分钟</b></span>
    </div>
  </div>
  <div class="card lesson-sec">
    <div class="lesson-sec-head"><span class="lesson-sec-num">1</span><span class="lesson-sec-title">今日任务单（60 分钟）</span></div>
    <div class="lesson-sec-body"><ul class="outline-list">${outline}</ul></div>
  </div>
  <div class="card lesson-sec">
    <div class="lesson-sec-head"><span class="lesson-sec-num">2</span><span class="lesson-sec-title">今日复习测验 + 打卡</span><span class="lesson-sec-min">从你的词库与错题自动生成</span></div>
    <div class="lesson-sec-body" id="quizBox">
      <div class="flex" style="justify-content:space-between;flex-wrap:wrap">
        <p class="muted" style="margin:0">完成主题学习后，用复习测验检验记忆，然后打卡完成今天。</p>
        <div class="flex">
          <button class="btn btn-outline" onclick="startReviewQuiz(${day})"><i data-lucide="repeat"></i>复习测验</button>
          <button class="btn btn-brand" onclick="checkIn(${day})"><i data-lucide="check"></i>完成打卡</button>
        </div>
      </div>
    </div>
  </div>`;
}

function checkIn(day){
  completeDay(day, null);
  toast(`Day ${day} 打卡完成！明天是 Day ${S.currentDay}`);
  go("dashboard");
}

/* ================= 测试引擎 ================= */
let QUIZ = null; // {day,type,questions,answers}

function startQuiz(day){
  const L = getLesson(day); if(!L) return;
  learnVocabFromLesson(day); save();
  QUIZ = { day, type: DAY_MAP[day-1].kind==="monthly-test"?"monthly":DAY_MAP[day-1].kind==="weekly-test"?"weekly":"daily",
           questions: L.quiz, answers: new Array(L.quiz.length).fill(null) };
  renderQuiz();
}

function startReviewQuiz(day){
  const qs = buildReviewQuestions();
  if(qs.length < 3){ toast("复习内容不足 3 题，先完成今日打卡吧"); return; }
  QUIZ = { day: day || S.currentDay, type:"review", questions: qs, answers: new Array(qs.length).fill(null) };
  renderQuiz();
}

function buildReviewQuestions(){
  const all = Object.values(S.vocab);
  if(all.length < 4) return [];
  const due = dueVocab();
  const pool = (due.length>=4?due:all).slice().sort(()=>Math.random()-.5).slice(0,10);
  const qs = [];
  pool.forEach((v,i)=>{
    const distract = all.filter(o=>o.w!==v.w).sort(()=>Math.random()-.5).slice(0,3);
    if(distract.length<3) return;
    const kind = i%3;
    if(kind===0){
      const opts = shuffle([v, ...distract]).map(o=>o.cn);
      qs.push({ type:"listen", cat:"词汇", say:v.w, options:opts, answer:opts.indexOf(v.cn), explain:`${v.w} ${v.ipa||""} = ${v.cn}`, vocabWord:v.w });
    }else if(kind===1){
      const opts = shuffle([v, ...distract]).map(o=>o.w);
      qs.push({ type:"choice", cat:"词汇", q:`“${v.cn}”的英文是？`, options:opts, answer:opts.indexOf(v.w), explain:`${v.w} ${v.ipa||""}`, vocabWord:v.w });
    }else{
      const opts = shuffle([v, ...distract]).map(o=>o.cn);
      qs.push({ type:"choice", cat:"词汇", q:`${v.w} ${v.ipa||""} 的中文意思是？`, options:opts, answer:opts.indexOf(v.cn), explain:v.ex||"", vocabWord:v.w });
    }
  });
  return qs;
}
function shuffle(a){ return a.slice().sort(()=>Math.random()-.5); }

function renderQuiz(){
  const box = $("#quizBox") || $("#view");
  const qs = QUIZ.questions;
  box.innerHTML = qs.map((q,i)=>`
    <div class="quiz-q" id="qq-${i}">
      <div class="quiz-q-head">
        <span class="quiz-num">第 ${i+1}/${qs.length} 题</span>
        <span class="quiz-cat">${esc(q.cat)}</span>
        ${q.type==="listen"?speakBtn(q.say,0.82)+'<span class="muted small">听音选择</span>':""}
      </div>
      ${q.q?`<div class="quiz-text" style="margin-bottom:10px">${esc(q.q)}</div>`:""}
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

/* 提交按钮实时提示作答进度，未答完时说明原因 */
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
  // 提交前允许随时改选
  QUIZ.answers[i] = j;
  btn.closest(".quiz-opts").querySelectorAll(".quiz-opt").forEach((b,k)=>b.classList.toggle("sel", k===j));
  updateSubmitBtn();
}

function submitQuiz(){
  const results = QUIZ.questions.map((q,i)=>QUIZ.answers[i]===q.answer);
  // 标色 + 展开解析
  QUIZ.questions.forEach((q,i)=>{
    const el = $("#qq-"+i);
    el.classList.add("done");
    el.querySelectorAll(".quiz-opt").forEach((b,j)=>{
      b.disabled = true;
      if(j===q.answer) b.classList.add("correct");
      else if(j===QUIZ.answers[i]) b.classList.add("wrong");
    });
    if(!results[i]){
      const front = q.say ? `听音：${q.say}` : (q.q||"")+" → "+q.options[q.answer];
      addError(q.cat, front, q.explain||"正确答案："+q.options[q.answer], q, QUIZ.day);
    }
  });
  const r = recordTest(QUIZ.type, QUIZ.day, QUIZ.questions, results);
  // 错题重练：答对的错题自动标记为已掌握
  QUIZ.questions.forEach((q,i)=>{
    if(q.errId && results[i]){
      const e = S.errors.find(x=>x.id===q.errId);
      if(e) e.done = true;
    }
  });
  // 只有课程测验（daily/weekly/monthly）才推进天数；复习/错题测验只巩固旧词
  const isLessonQuiz = ["daily","weekly","monthly"].includes(QUIZ.type);
  const verdict = !isLessonQuiz
    ? (QUIZ.type==="review"
        ? "复习完成 ✅ 旧单词已安排下一轮复习，去完成今日测试才能进入下一天"
        : "错题重练完成 ✅ 去完成今日测试才能进入下一天")
    : r.pct>=80 ? "掌握 ✅ 可以进入下一天" : r.pct>=60 ? "部分掌握 ⚠️ 建议明天先复习错题" : "未掌握 ❗ 今天内容需要重学";
  // 课程测试提交即自动完成当天课程，推进到下一天
  if(isLessonQuiz){
    completeDay(QUIZ.day, { pct: r.pct });
  }
  save();
  const nextDay = Math.min(QUIZ.day+1, 365);
  ($("#quizBox") || $("#view")).insertAdjacentHTML("beforeend", `
    <div class="card quiz-result mt14" style="border:1px solid ${r.pct>=80?"#c4e8d0":r.pct>=60?"#f3ddba":"#f5c8c8"}">
      <div class="quiz-score" style="color:${r.pct>=80?"var(--green)":r.pct>=60?"var(--amber)":"var(--red)"}">${r.pct}<small> 分</small></div>
      <div class="quiz-verdict">${r.score}/${r.total} 题正确 · ${verdict}</div>
      ${isLessonQuiz?`<div class="small muted mt8">Day ${QUIZ.day} 已完成打卡</div>`:""}
      <div class="mt14 flex" style="justify-content:center;flex-wrap:wrap">
        ${isLessonQuiz && QUIZ.day<365?`<button class="btn btn-brand" onclick="go('lesson',${nextDay})"><i data-lucide="arrow-right"></i>进入 Day ${nextDay}</button>`:""}
        ${!isLessonQuiz && S.currentDay<=365 && !S.completedDays[S.currentDay]?`<button class="btn btn-brand" onclick="go('lesson',${S.currentDay})"><i data-lucide="book-open"></i>去学今天的课 Day ${S.currentDay} →</button>`:""}
        <button class="btn btn-outline" onclick="go('errors')"><i data-lucide="x-circle"></i>查看错题本</button>
        <button class="btn btn-outline" onclick="go('dashboard')"><i data-lucide="home"></i>回到首页</button>
      </div>
    </div>`);
  refreshIcons();
  $("#submitQuizBtn").disabled = true;
  window.scrollTo({top:document.body.scrollHeight, behavior:"smooth"});
}

function finishLesson(day, pct){
  completeDay(day, { pct });
  toast(`Day ${day} 完成！得分 ${pct}，明天是 Day ${S.currentDay}`);
  go("dashboard");
}

/* ================= 复习中心 ================= */
function renderReview(){
  const due = dueVocab();
  const errs = activeErrors();
  const upcoming = Object.values(S.vocab).filter(v=>v.stage<REVIEW_INTERVALS.length && v.next>todayStr())
    .sort((a,b)=>a.next<b.next?-1:1).slice(0,8);
  return `
  <div class="page-head"><h1>复习中心</h1><p>间隔重复节奏：学习当天 → 第 1 天 → 第 2 天 → 第 3 天 → 第 7 天 → 第 14 天 → 第 30 天。答错自动回到第一轮。</p></div>
  <div class="grid grid-3">
    <div class="card stat"><div class="stat-label"><i data-lucide="bell"></i>今日到期单词</div><div class="stat-value">${due.length}</div><div class="stat-sub">需要今天复习</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="x-circle"></i>待重练错题</div><div class="stat-value">${errs.length}</div><div class="stat-sub">来自历次测试</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已毕业单词</div><div class="stat-value">${Object.values(S.vocab).filter(v=>v.stage>=REVIEW_INTERVALS.length-1).length}</div><div class="stat-sub">完成全部 7 轮复习</div></div>
  </div>
  <div class="card card-pad mt14">
    <div class="sec-title"><i data-lucide="play"></i>开始复习<span class="tag brand">测验从到期单词自动生成</span></div>
    <div class="flex" style="flex-wrap:wrap">
      <button class="btn btn-brand" onclick="startReviewQuiz()" ${Object.keys(S.vocab).length<4?"disabled":""}><i data-lucide="repeat"></i>单词复习测验（10 题）</button>
      <button class="btn btn-outline" onclick="startErrorQuiz()" ${errs.filter(e=>e.options).length<1?"disabled":""}><i data-lucide="rotate-ccw"></i>错题重练</button>
      ${Object.keys(S.vocab).length<4?'<span class="muted small">学完 Day 1 后解锁复习测验</span>':""}
    </div>
  </div>
  <div class="grid grid-2 mt14">
    <div class="card">
      <div class="card-pad" style="padding-bottom:6px"><div class="sec-title"><i data-lucide="bell"></i>今日到期（${due.length}）${due.length?`<button class="btn btn-outline btn-sm" style="margin-left:auto" data-say="${esc(due.slice(0,10).map(v=>v.w).join(" … "))}" data-rate="0.85" data-follow=".row-item"><i data-lucide="play"></i>整组慢读</button>`:""}</div></div>
      ${due.length ? due.slice(0,10).map(v=>`
        <div class="row-item"><div class="row-main">
          <div class="row-title">${esc(v.w)} <span class="vocab-ipa">${esc(v.ipa||"")}</span></div>
          <div class="row-sub">${esc(v.cn)} · 第 ${v.stage+1} 轮 · 对 ${v.hits} 错 ${v.misses}</div></div>
          <div class="row-side">${speakBtn(v.w)}</div></div>`).join("")
        : `<div class="empty"><i data-lucide="check-circle-2"></i><div>没有到期内容</div></div>`}
    </div>
    <div class="card">
      <div class="card-pad" style="padding-bottom:6px"><div class="sec-title"><i data-lucide="calendar"></i>即将到期${upcoming.length?`<button class="btn btn-outline btn-sm" style="margin-left:auto" data-say="${esc(upcoming.map(v=>v.w).join(" … "))}" data-rate="0.85" data-follow=".row-item"><i data-lucide="play"></i>整组慢读</button>`:""}</div></div>
      ${upcoming.length ? upcoming.map(v=>`
        <div class="row-item"><div class="row-main">
          <div class="row-title">${esc(v.w)} <span class="vocab-ipa">${esc(v.ipa||"")}</span></div>
          <div class="row-sub">${esc(v.cn)} · ${v.next} 到期</div></div>
          <div class="row-side">${speakBtn(v.w)}</div></div>`).join("")
        : `<div class="empty"><i data-lucide="calendar"></i><div>暂无排期</div></div>`}
    </div>
  </div>
  <div class="card lesson-sec mt14" id="quizHost">
    <div class="lesson-sec-head"><span class="lesson-sec-num">✓</span><span class="lesson-sec-title">复习测验区</span><span class="lesson-sec-min">测验会显示在这里</span></div>
    <div class="lesson-sec-body" id="quizBox"><p class="muted" style="margin:0">点击上方「单词复习测验」或「错题重练」开始。</p></div>
  </div>`;
}

function startErrorQuiz(){
  const errs = activeErrors().filter(e=>e.options && e.answer!=null).slice(0,10);
  if(!errs.length){ toast("没有可重练的错题"); return; }
  const qs = errs.map(e=>({ type: e.say?"listen":"choice", cat:e.cat, q:e.qtext||(e.say?null:e.front),
    say:e.say, options:e.options, answer:e.answer, explain:e.note, errId:e.id }));
  QUIZ = { day: S.currentDay, type:"error", questions: qs, answers: new Array(qs.length).fill(null) };
  renderQuiz();
}

/* ================= 错题本 ================= */
let ERR_FILTER = "全部";
function renderErrors(){
  const cats = ["全部","发音","听力","词汇","语法","口语"];
  const chips = cats.map(c=>{
    const n = c==="全部"?activeErrors().length:activeErrors().filter(e=>e.cat===c).length;
    return `<button class="filter-chip ${ERR_FILTER===c?"active":""}" onclick="setErrFilter('${c}')">${c}${n?` (${n})`:""}</button>`;
  }).join("");
  const list = activeErrors().filter(e=>ERR_FILTER==="全部"||e.cat===ERR_FILTER);
  const rows = list.length ? list.map(e=>`
    <div class="row-item">
      <div class="row-main">
        <div class="row-title"><span class="tag ${e.cat==="发音"||e.cat==="听力"?"blue":e.cat==="语法"?"violet":"amber"}">${esc(e.cat)}</span>${esc(e.front)}</div>
        <div class="row-sub">${esc(e.note)} · Day ${e.day} · 错 ${e.count} 次 · ${e.date}</div>
      </div>
      <div class="row-side">
        ${e.say?speakBtn(e.say):""}
        <button class="btn btn-outline btn-sm" onclick="resolveError(${e.id})"><i data-lucide="check"></i>已掌握</button>
      </div>
    </div>`).join("")
    : `<div class="empty"><i data-lucide="check-circle-2"></i><div>太棒了，没有待处理的错题</div><div class="small muted">测试中答错的题目会自动分类记录到这里</div></div>`;
  return `
  <div class="page-head"><h1>错题本 · 我的英语错误数据库</h1><p>每次测试犯错自动分类记录。定期重练，确认掌握后点「已掌握」。</p></div>
  <div class="filter-row">${chips}</div>
  <div class="flex mb" style="margin-bottom:14px">
    <button class="btn btn-brand btn-sm" onclick="startErrorQuiz()"><i data-lucide="rotate-ccw"></i>重练全部错题</button>
  </div>
  <div class="card">${rows}</div>`;
}
function setErrFilter(c){ ERR_FILTER=c; render(); }
function resolveError(id){
  const e = S.errors.find(x=>x.id===id);
  if(e){ e.done = true; save(); render(); toast("已标记为掌握"); }
}

/* ================= 词汇库 ================= */
let VOCAB_FILTER = "全部";
function renderVocab(){
  const all = Object.values(S.vocab).sort((a,b)=>a.day-b.day);
  const chips = ["全部","复习中","已毕业"].map(c=>`<button class="filter-chip ${VOCAB_FILTER===c?"active":""}" onclick="setVocabFilter('${c}')">${c}</button>`).join("");
  const list = all.filter(v=>VOCAB_FILTER==="全部"||(VOCAB_FILTER==="已毕业"?v.stage>=REVIEW_INTERVALS.length-1:v.stage<REVIEW_INTERVALS.length-1));
  const rows = list.length ? list.map(v=>`
    <div class="row-item">
      <div class="row-main">
        <div class="row-title">${esc(v.w)} <span class="vocab-ipa">${esc(v.ipa||"")}</span>
          <span class="mastery">${REVIEW_INTERVALS.map((_,i)=>`<i class="${i<=v.stage?"on":""}"></i>`).join("")}</span>
        </div>
        <div class="row-sub">${esc(v.cn)} · Day ${v.day} 学习 · 对 ${v.hits} 错 ${v.misses}${v.stage<REVIEW_INTERVALS.length-1?` · ${v.next} 复习`:" · 已毕业"}</div>
      </div>
      <div class="row-side">${speakBtn(v.w)}</div>
    </div>`).join("")
    : `<div class="empty"><i data-lucide="book-open"></i><div>词汇库还是空的</div><div class="small muted">完成每日课程的测试后，当天单词自动入库并进入复习队列</div></div>`;
  return `
  <div class="page-head"><h1>词汇库</h1><p>只学高频词，通过句型掌握词汇。掌握度 = 间隔重复完成轮数（7 轮毕业）。</p></div>
  <div class="filter-row">${chips}${list.length?`<button class="btn btn-outline btn-sm" data-say="${esc(list.map(v=>v.w).join(" … "))}" data-rate="0.85" data-follow=".row-item"><i data-lucide="play"></i>朗读全部（${list.length} 词）</button>`:""}</div>
  <div class="card">${rows}</div>`;
}
function setVocabFilter(c){ VOCAB_FILTER=c; render(); }

/* ================= 能力报告 ================= */
function renderStats(){
  const ab = abilityAll();
  const tests = S.tests.slice().reverse();
  const rows = tests.slice(0,30).map(t=>{
    const cls = t.pct>=80?"good":t.pct>=60?"mid":"low";
    const typeName = {daily:"每日",weekly:"每周",monthly:"每月",review:"复习",error:"错题",stage:"阶段",final:"总测"}[t.type]||t.type;
    return `<tr><td>${t.date}</td><td>${typeName}测试</td><td>Day ${t.day}</td><td>${t.score}/${t.total}</td><td><span class="score-pill ${cls}">${t.pct}</span></td></tr>`;
  }).join("");
  const weeklyDone = [7,14,21,28].filter(d=>S.completedDays[d]).length;
  return `
  <div class="page-head"><h1>能力报告 · 学习进度数据库</h1><p>不只用天数衡量进度——七项能力随每次测试动态更新，最终形成 365 天能力曲线。</p></div>
  <div class="card card-pad">
    <div class="sec-title"><i data-lucide="activity"></i>七项能力</div>
    ${renderRadar(ab)}
  </div>
  <div class="grid grid-3 mt14">
    <div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成天数</div><div class="stat-value">${Object.keys(S.completedDays).length}</div><div class="stat-sub">当前 Day ${S.currentDay}</div></div>
    <div class="card stat"><div class="stat-label"><i data-lucide="clipboard-check"></i>周测试完成</div><div class="stat-value">${weeklyDone}/4</div><div class="stat-sub">第一阶段周测试</div></div>
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
  a.download = `eng365-档案-${todayStr()}.json`;
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

/* 口语麦克风交互已升级到 js/lesson6.js（可录音对照、识别失败有兜底、不虚构发音评分） */

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
    delete S.settings.rate;
    save();
    speak("How are you today?", 0.9);  // 用新语速试听一句
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
