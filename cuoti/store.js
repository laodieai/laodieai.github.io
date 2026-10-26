/* ============================================================
 * store.js —— 数据层 v2
 * localStorage key 保持 cuoti_b8x_state_v1 不变（旧数据自动迁移，不清空）
 * 照片仍存 IndexedDB；state 增加：变式题、复测记录、掌握快照、冲刺计划
 * ============================================================ */
const DAY = 86400000;
const STORE_KEY = "cuoti_b8x_state_v1";
const APP_TAG = "cuoti-b8x";
const STATE_VER = 2;
const GAPS_DEFAULT = [1, 3, 7, 14, 30]; // 订正→首测 1天→3→7→14→30，均可在设置里改
const STAGE_PASSED = 6;                  // 阶段 1待订正 2待首次独立复测 3/4/5 递进 6过关

function defaultState(){
  return { app:APP_TAG, ver:STATE_VER, mistakes:[], gaps:GAPS_DEFAULT.slice(),
    customTopics:{}, customChapters:{}, variants:{}, retests:[], snapshots:[], sprint:null, pickedImg:null };
}
function normalizeGaps(g){
  if(Array.isArray(g) && g.length===5 && g.every(x=>Number.isFinite(+x) && +x>=0))
    return g.map(x=>Math.min(60, Math.max(0, Math.round(+x))));
  return GAPS_DEFAULT.slice();
}
function migrateMistake(m, isV2){
  if(!m || typeof m!=="object" || !m.id) return null;
  m.subject = m.subject || "math";
  m.topic = (m.topic||"未分类").toString();
  m.chapter = m.chapter || "";
  m.reason = (isV2 && REASONS_V2.includes(m.reason)) ? m.reason
           : (REASON_ALIAS[m.reason] || (REASONS_V2.includes(m.reason)?m.reason:"其他"));
  if(!Array.isArray(m.log)) m.log = [];
  m.log = m.log.map(l=>Object.assign({ok:!!l.ok, at:l.at||m.updatedAt||Date.now(),
    independent:true, hints:0, ms:null, kind:"review"}, l));
  m.diag = m.diag && typeof m.diag==="object" ? m.diag : {cause:"", way:m.note||"", avoid:""};
  m.diag.cause = m.diag.cause||""; m.diag.way = m.diag.way||""; m.diag.avoid = m.diag.avoid||"";
  if(!isV2){
    // v1：录入即 stage1（3天后首测）、stage2=一次通过、stage3=过关
    if(m.stage>=3) m.stage = 6;
    else if(m.stage===2) m.stage = 3;
    else { m.stage = 2; m.correctedAt = m.correctedAt || m.createdAt; }
  }
  m.stage = Math.min(STAGE_PASSED, Math.max(1, m.stage|0 || 1));
  if(typeof m.nextAt!=="number") m.nextAt = (m.createdAt||Date.now()) + GAPS_DEFAULT[0]*DAY;
  m.varAdvances = m.varAdvances|0;
  return m;
}
function migrateState(raw){
  if(!raw || typeof raw!=="object") return defaultState();
  const isV2 = raw.ver===2;
  const s = Object.assign(defaultState(), raw);
  s.ver = STATE_VER;
  s.gaps = normalizeGaps(raw.gaps);
  s.mistakes = Array.isArray(raw.mistakes) ? raw.mistakes.map(m=>migrateMistake(m,isV2)).filter(Boolean) : [];
  s.variants = (raw.variants && typeof raw.variants==="object") ? raw.variants : {};
  Object.keys(s.variants).forEach(k=>{ if(!Array.isArray(s.variants[k])) delete s.variants[k]; });
  s.retests = Array.isArray(raw.retests) ? raw.retests.filter(r=>r&&r.at) : [];
  s.snapshots = Array.isArray(raw.snapshots) ? raw.snapshots : [];
  s.customTopics = raw.customTopics && typeof raw.customTopics==="object" ? raw.customTopics : {};
  s.customChapters = raw.customChapters && typeof raw.customChapters==="object" ? raw.customChapters : {};
  if(!s.sprint || typeof s.sprint!=="object") s.sprint = null;
  return s;
}
let state = loadState();
function loadState(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if(raw && Array.isArray(raw.mistakes)) return migrateState(raw);
  }catch(e){}
  return defaultState();
}
function save(){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  }catch(e){
    if(typeof toast==="function")
      toast("本机存储已满或被禁用：请先在「备份」里导出数据，再删除部分旧错题照片");
    console.error("save failed", e);
    return false;
  }
}

/* ---------- IndexedDB 照片 ---------- */
let idbPromise = null;
function idb(){
  if(idbPromise) return idbPromise;
  idbPromise = new Promise((res,rej)=>{
    if(typeof indexedDB==="undefined") return rej(new Error("no-idb"));
    const r = indexedDB.open("cuoti-imgs", 1);
    r.onupgradeneeded = e=>e.target.result.createObjectStore("imgs");
    r.onsuccess = e=>res(e.target.result);
    r.onerror = ()=>rej(r.error);
  }).catch(()=>({__memory:true}));
  return idbPromise;
}
let memStore={};
function dbPut(mode,key,val){
  return idb().then(db=>new Promise((res,rej)=>{
    if(db.__memory){ memStore[key]=val; return res(); }
    const t=db.transaction("imgs",mode).objectStore("imgs");
    const r = mode==="readwrite" ? t.put(val,key) : t.get(key);
    r.onsuccess=()=>res(mode==="readonly"?r.result:undefined); r.onerror=()=>rej(r.error);
  }));
}
const imgPut=(k,b)=>dbPut("readwrite",k,b);
const imgGet=k=>dbPut("readonly",k,null).then(v=>v||null).catch(()=>null);
function imgDel(key){ return idb().then(db=>new Promise(res=>{
  if(db.__memory){ delete memStore[key]; return res(); }
  const t=db.transaction("imgs","readwrite").objectStore("imgs").delete(key);
  t.onsuccess=res; t.onerror=res;
})).catch(()=>{}); }

/* ---------- 时间/工具 ---------- */
const DAY0 = new Date();
function todayStr(ts){ const d=new Date(ts||Date.now()); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function sameDay(a,b){ return todayStr(a)===todayStr(b); }
function addDaysTs(ts,n){ return (ts||Date.now()) + Math.round(n)*DAY; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=p=> (p||"id")+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt = ts => ts ? new Date(ts).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"}) : "";
const fmtFull = ts => new Date(ts).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
function fmtDur(ms){ if(ms==null) return ""; if(ms<60000) return Math.round(ms/1000)+"秒"; return (ms/60000).toFixed(1)+"分"; }
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* ---------- 状态机：阶段 / 调度 / 掌握度 ---------- */
function statusOf(m, now){
  now = now||Date.now();
  if(m.stage>=STAGE_PASSED) return "passed";
  return now >= m.nextAt ? "due" : "learning";
}
/* 统一记录一次尝试（复测/订正/变式），所有调度只走这里 */
function applyAttempt(m, att){
  const at = att.at||Date.now();
  const rec = { ok:!!att.ok, at, independent:!!att.independent, hints:att.hints|0,
    ms:Number.isFinite(+att.ms)?+att.ms:null, kind:att.kind||"review", variantId:att.variantId||null };
  m.log.push(rec);
  state.retests.push(Object.assign({mistakeId:m.id, subject:m.subject, topic:m.topic,
    chapter:m.chapter, stageBefore:m.stage}, rec));
  m.updatedAt = at;

  if(rec.kind==="correction"){
    m.stage = 2; m.correctedAt = at;
    m.nextAt = addDaysTs(at, state.gaps[0]);
  }else if(rec.kind==="variant"){
    if(rec.ok && rec.independent){
      // 不同变式题连续独立做对，证据更强：每攒满 2 道不同变式，抵一次复测进阶
      const distinct=new Set(m.log.filter(l=>l.kind==="variant"&&l.ok&&l.independent&&l.variantId).map(l=>l.variantId));
      if(distinct.size>=(m.varAdvances+1)*2 && m.stage<STAGE_PASSED){
        m.varAdvances++;
        advanceStage(m, at);
      }
    }else if(!rec.ok){
      regressStage(m, at);
    }else{
      m.nextAt = addDaysTs(at, 1); // 看答案才会：明天再来，不进阶
    }
  }else if(rec.ok && rec.independent){
    if(m.stage<STAGE_PASSED) advanceStage(m, at);
  }else if(rec.ok){
    if(m.stage<2) m.stage=2;
    m.nextAt = addDaysTs(at, 1); // 看答案后会做，不算独立通过
  }else{
    regressStage(m, at);
  }
  save();
  return rec;
}
function advanceStage(m, at){
  m.stage += 1;
  m.nextAt = m.stage>=STAGE_PASSED ? null : addDaysTs(at, state.gaps[m.stage-2]||14);
}
function regressStage(m, at){
  if(m.stage>3) m.stage=3; else if(m.stage>2) m.stage=2;
  if(m.stage<2) m.stage=2;
  m.nextAt = addDaysTs(at, state.gaps[0]);
}
/* 掌握度 0-100（含变式交叉证明；过关直接 100） */
function mastery(m){
  if(m.stage>=STAGE_PASSED) return 100;
  let s = m.stage===1 ? 8 : 22;
  const dv=new Set();
  (m.log||[]).forEach(l=>{
    if(l.kind==="variant"){
      if(l.ok&&l.independent){ s+=15; dv.add(l.variantId); }
      else if(l.ok){ s+=3; } else s-=9;
    }else{
      if(l.kind==="correction"){ s+=6; }
      else if(l.ok&&l.independent){ s+=13; }
      else if(l.ok){ s+=2; } else s-=9;
    }
  });
  s += Math.min(16, dv.size*6);
  return clamp(Math.round(s), 3, 99);
}
const stageLabel = m => ["","① 待订正","② 待独立复测","③ 间隔复测","④ 间隔复测","⑤ 长期间隔","已过关"][m.stage]||"";

/* ---------- 每日掌握快照（趋势，从今天才开始记，不虚构历史） ---------- */
function ensureSnapshot(){
  const t = todayStr();
  if(!state.snapshots.some(x=>x.date===t)){
    const open=state.mistakes.filter(m=>m.stage<STAGE_PASSED).length;
    state.snapshots.push({date:t, open, passed:state.mistakes.length-open,
      mastery: state.mistakes.length? Math.round(state.mistakes.reduce((a,m)=>a+mastery(m),0)/state.mistakes.length):null});
    if(state.snapshots.length>120) state.snapshots=state.snapshots.slice(-120);
    save();
  }
}

/* ---------- 备份 / 导入（严格校验，失败不动现有数据） ---------- */
async function exportPayload(){
  const keys=state.mistakes.map(m=>m.id);
  const imgs={};
  for(const k of keys){ const b=await imgGet(k); if(b) imgs[k]=await blobToB64(b); }
  return {app:APP_TAG, ver:STATE_VER, exportedAt:Date.now(), state, images:imgs};
}
function validateIncoming(p){
  if(!p || typeof p!=="object") throw new Error("文件内容不是有效的备份");
  if(!p.state || typeof p.state!=="object" || !Array.isArray(p.state.mistakes))
    throw new Error("文件格式不对：缺少错题数据");
  const bad=p.state.mistakes.filter(m=>!m || typeof m!=="object" || !m.id);
  if(bad.length) throw new Error("文件里有 "+bad.length+" 条损坏的错题，已取消导入");
  if(p.images && typeof p.images!=="object") throw new Error("图片数据损坏，已取消导入");
  return true;
}
async function mergeImport(p){
  validateIncoming(p);
  const incoming = migrateState(p.state); // 旧备份也能迁
  // 错题：按 id 覆盖
  const byId=Object.fromEntries(state.mistakes.map(m=>[m.id,m]));
  incoming.mistakes.forEach(m=>byId[m.id]=m);
  state.mistakes=Object.values(byId);
  // 变式题合并
  Object.entries(incoming.variants||{}).forEach(([k,arr])=>{
    const map=new Map((state.variants[k]||[]).map(v=>[v.id,v]));
    arr.forEach(v=>{ if(v&&v.id) map.set(v.id,v); });
    state.variants[k]=[...map.values()];
  });
  // 自定义知识点合并去重
  Object.entries(incoming.customTopics||{}).forEach(([sub,arr])=>{
    const set=new Set([...(state.customTopics[sub]||[]),...arr]);
    state.customTopics[sub]=[...set];
  });
  // 自定义章节合并去重
  Object.entries(incoming.customChapters||{}).forEach(([sub,arr])=>{
    const set=new Set([...(state.customChapters[sub]||[]),...arr]);
    state.customChapters[sub]=[...set];
  });
  // 复测记录去重（at+mistakeId+kind）
  const seen=new Set(state.retests.map(r=>r.at+"|"+r.mistakeId+"|"+r.kind+"|"+(r.variantId||"")));
  incoming.retests.forEach(r=>{ const k=r.at+"|"+r.mistakeId+"|"+r.kind+"|"+(r.variantId||""); if(!seen.has(k)){state.retests.push(r);seen.add(k);} });
  // 图片恢复（校验是字符串）
  let imgN=0;
  for(const [k,b64] of Object.entries(p.images||{})){
    if(typeof b64!=="string" || b64.length<50) continue;
    try{ await imgPut(k, await b64ToBlob(b64)); imgN++; }catch(e){}
  }
  save();
  return {mistakes:incoming.mistakes.length, images:imgN};
}
function blobToB64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(blob); }); }
function b64ToBlob(b64){ const bin=atob(b64); const u=Uint8Array.from(bin,c=>c.charCodeAt(0)); return new Blob([u],{type:"image/jpeg"}); }
