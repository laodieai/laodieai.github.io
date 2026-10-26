/* ========== 错题闭环本 ========== */
const DAY = 86400000;
const STORE_KEY = "cuoti_b8x_state_v1";

let state = loadState();
function defaultState(){ return { mistakes:[], gaps:[3,14], pickedImg:null, customTopics:{} }; }
function loadState(){
  try{ const s = JSON.parse(localStorage.getItem(STORE_KEY)); if(s&&s.mistakes) return s; }catch(e){}
  return defaultState();
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ---------- IndexedDB 存照片 ---------- */
let idbPromise = null;
function idb(){
  if(idbPromise) return idbPromise;
  idbPromise = new Promise((res, rej)=>{
    const r = indexedDB.open("cuoti-imgs", 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore("imgs");
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej(r.error);
  });
  return idbPromise;
}
async function imgPut(key, blob){
  const db = await idb();
  await new Promise((res,rej)=>{ const t = db.transaction("imgs","readwrite").objectStore("imgs").put(blob,key);
    t.onsuccess=res; t.onerror=rej; });
}
async function imgGet(key){
  const db = await idb();
  return await new Promise((res,rej)=>{ const r = db.transaction("imgs").objectStore("imgs").get(key);
    r.onsuccess=()=>res(r.result||null); r.onerror=rej; });
}
async function imgDel(key){
  const db = await idb();
  await new Promise(res => { const t = db.transaction("imgs","readwrite").objectStore("imgs").delete(key); t.onsuccess=res; t.onerror=res; });
}

/* ---------- 复习调度 ---------- */
function statusOf(m, now=Date.now()){
  if(m.stage>=3) return "passed";
  return now >= m.nextAt ? "due" : "learning";
}
function scheduleNext(m, ok){
  const [g1,g2] = state.gaps;
  if(ok){
    m.stage += 1;
    if(m.stage>=3){ m.nextAt=null; }
    else m.nextAt = m.updatedAt + (m.stage===1 ? g1:g2)*DAY;
  }else{
    m.stage = 1;
    m.nextAt = m.updatedAt + g1*DAY;
  }
}
const fmt = ts => ts ? new Date(ts).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"}) : "";
const fmtFull = ts => new Date(ts).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});

/* ---------- 导航 ---------- */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick=()=>{ showView(btn.dataset.view); };
});
function showView(v){
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active", x.id==="view-"+v));
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x.dataset.view===v));
  if(v==="today") renderToday();
  if(v==="list") renderList();
  if(v==="stats") renderStats();
  window.scrollTo(0,0);
}

/* ---------- 录入表单 ---------- */
let formSubject = "math", formReason = REASONS[0];
const subjectPick = document.getElementById("subjectPick");
SUBJECTS.forEach((s,i)=>{
  const b=document.createElement("button");
  b.type="button"; b.className="chip"+(s.id==="math"?" on":"");
  b.textContent=s.icon+" "+s.name;
  b.style.setProperty("--c",s.color);
  b.onclick=()=>{ formSubject=s.id;
    subjectPick.querySelectorAll(".chip").forEach(c=>{c.classList.remove("on");c.style.background="";});
    b.classList.add("on"); b.style.background=s.color; fillChapters();
    document.getElementById("topicInput").value=subject().groups[0].topics[0]||""; };
  subjectPick.appendChild(b);
});
document.querySelectorAll(".chip").forEach(c=>c.classList.contains("on")&&(c.style.background=SUBJECTS[1].color));

function subject(){ return SUBJECTS.find(s=>s.id===formSubject); }
function fillChapters(){
  const sel=document.getElementById("chapterSel");
  sel.innerHTML="";
  const dl=document.getElementById("topicList"); dl.innerHTML="";
  const custom = (state.customTopics && state.customTopics[formSubject]) || [];
  subject().groups.forEach(g=>{
    const og=document.createElement("optgroup"); og.label=g.chapter;
    og.appendChild(new Option(g.chapter, g.chapter));
    sel.appendChild(og);
    g.topics.forEach(t=>dl.appendChild(new Option(t)));
  });
  if(custom.length){
    const og=document.createElement("optgroup"); og.label="我自己加过的";
    custom.forEach(t=>og.appendChild(new Option(t)));
    dl.appendChild(og);
  }
  const onChips=subjectPick.querySelectorAll(".chip.on");
  onChips.forEach(c=>c.style.background=subject().color);
}
fillChapters();
document.getElementById("chapterSel").onchange = e => {
  const g = subject().groups.find(x=>x.chapter===e.target.value);
  if(g && !g.topics.includes(document.getElementById("topicInput").value))
    document.getElementById("topicInput").value = g.topics[0]||"";
};
document.getElementById("chapterSel").onchange({target:document.getElementById("chapterSel")});

const reasonPick=document.getElementById("reasonPick");
REASONS.forEach((r,i)=>{
  const b=document.createElement("button"); b.type="button";
  b.className="chip"+(i===0?" on":""); b.textContent=r;
  b.onclick=()=>{ formReason=r;
    reasonPick.querySelectorAll(".chip").forEach(c=>{c.classList.remove("on");c.style.background="";});
    b.classList.add("on"); b.style.background="#e8590c"; };
  reasonPick.appendChild(b);
});
reasonPick.querySelector(".chip.on").style.background="#e8590c";

document.getElementById("burstMode").onchange=e=>{
  if(!e.target.checked){ window.__burstCount=0; const b=document.getElementById("burstBar"); b&&b.remove(); }
};

/* 拍照并压缩 */
const imgInput=document.getElementById("imgInput");
imgInput.onchange=()=>{
  const f=imgInput.files[0]; if(!f) return;
  compress(f, 1600, 0.72).then(blob=>{
    state.pickedImg=blob;
    const url=URL.createObjectURL(blob);
    const img=document.getElementById("shotPreview");
    img.src=url; img.hidden=false;
    document.getElementById("shotHint").textContent="📷 重新拍照/选图";
    toast("照片已选好");
  });
};
function compress(file, maxW, quality){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1, maxW/img.width);
      const cv=document.createElement("canvas");
      cv.width=Math.round(img.width*scale); cv.height=Math.round(img.height*scale);
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      cv.toBlob(b=>b?res(b):rej(new Error("compress fail")), "image/jpeg", quality);
      URL.revokeObjectURL(img.src);
    };
    img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}

/* 保存 */
document.getElementById("addForm").onsubmit=async e=>{
  e.preventDefault();
  const m={
    id:"m"+Date.now()+Math.random().toString(36).slice(2,6),
    subject:formSubject,
    chapter:document.getElementById("chapterSel").value,
    topic:(document.getElementById("topicInput").value||"未分类").trim(),
    reason:formReason,
    note:document.getElementById("noteInput").value.trim(),
    createdAt:Date.now(), updatedAt:Date.now(),
    stage:1, nextAt:Date.now()+state.gaps[0]*DAY,
    log:[]
  };
  const builtin = subject().groups.some(g=>g.topics.includes(m.topic));
  if(!builtin && m.topic!=="未分类"){
    state.customTopics[formSubject] = state.customTopics[formSubject] || [];
    if(!state.customTopics[formSubject].includes(m.topic)) state.customTopics[formSubject].push(m.topic);
  }
  if(state.pickedImg){ await imgPut(m.id, state.pickedImg); state.pickedImg=null; }
  state.mistakes.push(m); save();

  const burst=document.getElementById("burstMode").checked;
  if(burst){
    // 连续录入：科目/章节/错因/知识点保留，只清照片、备注
    const pv=document.getElementById("shotPreview"); pv.hidden=true; pv.src="";
    imgInput.value="";
    document.getElementById("shotHint").textContent="📷 继续拍下一张 / 点此选图";
    document.getElementById("noteInput").value="";
    window.__burstCount=(window.__burstCount||0)+1;
    let bar=document.getElementById("burstBar");
    if(!bar){ bar=document.createElement("div"); bar.className="burst-bar"; bar.id="burstBar";
      e.target.prepend(bar); }
    bar.innerHTML="连续录入中 · 已录 "+window.__burstCount+' 道 · <span style="text-decoration:underline" id="burstEnd">点此结束</span>';
    document.getElementById("burstEnd").onclick=()=>{
      document.getElementById("burstMode").checked=false; window.__burstCount=0;
      bar&&bar.remove(); showView("today");
    };
    toast("第 "+window.__burstCount+" 道已保存，点虚线框拍下一张");
    const shot=document.querySelector(".shot");
    shot.scrollIntoView({behavior:"smooth",block:"center"});
    shot.classList.remove("pulse"); void shot.offsetWidth; shot.classList.add("pulse");
    return;
  }
  e.target.reset();
  const pv=document.getElementById("shotPreview"); pv.hidden=true; pv.src="";
  document.getElementById("shotHint").textContent="📷 拍照 / 点此选图";
  toast("已保存，"+state.gaps[0]+" 天后提醒复测 ✅");
  setTimeout(()=>showView("today"), 600);
};

/* ---------- 今日 ---------- */
document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"});

function renderToday(){
  const now=Date.now();
  const due=state.mistakes.filter(m=>statusOf(m,now)==="due")
    .sort((a,b)=>a.nextAt-b.nextAt);
  document.getElementById("dueNum").textContent=due.length;
  document.getElementById("dueHero").style.background =
    due.length ? "linear-gradient(135deg,#e8590c,#fa5252)" : "linear-gradient(135deg,#2f9e44,#51cf66)";
  const list=document.getElementById("dueList");
  list.innerHTML = due.length ? "" : '<div class="empty">今天没有到期的复测 🎉<br>去错题本看看，或录入新错题</div>';
  due.forEach(m=>list.appendChild(card(m)));

  const learning=state.mistakes.filter(m=>m.stage<3);
  const weekAgo=now-7*DAY;
  document.getElementById("stTotal").textContent=state.mistakes.length;
  document.getElementById("stLearning").textContent=learning.length;
  document.getElementById("stPassed").textContent=state.mistakes.length-learning.length;
  document.getElementById("stWeek").textContent=state.mistakes.filter(m=>m.createdAt>weekAgo).length;
  renderWeak("weakList", 5);
}

/* ---------- 错题本 ---------- */
function renderList(){
  const fs=document.getElementById("fSubject");
  if(fs.options.length===1){ SUBJECTS.forEach(s=>fs.appendChild(new Option(s.icon+" "+s.name, s.id))); }
  const sv=fs.value, stv=document.getElementById("fStatus").value, now=Date.now();
  let arr=state.mistakes.filter(m=>!sv||m.subject===sv);
  if(stv==="learning") arr=arr.filter(m=>m.stage<3);
  else if(stv!=="all") arr=arr.filter(m=>statusOf(m,now)===stv);
  arr.sort((a,b)=>b.updatedAt-a.updatedAt);
  const box=document.getElementById("mistakeList");
  box.innerHTML = arr.length ? "" : '<div class="empty">这里还没有错题<br>点下方“＋ 录入”拍一张吧</div>';
  arr.forEach(m=>box.appendChild(card(m)));
}
document.getElementById("fSubject").onchange=renderList;
document.getElementById("fStatus").onchange=renderList;

function card(m){
  const s=SUBJECTS.find(x=>x.id===m.subject);
  const st=statusOf(m);
  const el=document.createElement("div"); el.className="m-card";
  const badge = st==="due"?'<span class="badge due">今日复测</span>'
    : st==="passed"?'<span class="badge passed">已过关</span>'
    : m.stage===1?'<span class="badge s1">'+state.gaps[0]+'天复测</span>'
    : '<span class="badge s2">'+state.gaps[1]+"天复测</span>";
  el.innerHTML='<div class="thumb emoji">'+s.icon+'</div>'+
    '<div class="meta"><div class="t1">'+badge+' '+esc(m.topic)+'</div>'+
    '<div class="t2">'+m.chapter+'</div>'+
    '<div class="t3"><span class="tag reason">'+m.reason+'</span>'+
    '<span class="tag">'+fmt(m.updatedAt)+(st==="learning"?" · "+fmt(m.nextAt)+"到期":"")+'</span></div></div>';
  el.onclick=()=>openModal(m.id);
  imgGet(m.id).then(b=>{ if(b){ const im=new Image(); im.className="thumb"; im.src=URL.createObjectURL(b);
    el.replaceChild(im, el.querySelector(".thumb")); }});
  return el;
}

/* ---------- 详情弹层 ---------- */
let currentId=null;
async function openModal(id){
  currentId=id;
  const m=state.mistakes.find(x=>x.id===id); if(!m)return;
  const s=SUBJECTS.find(x=>x.id===m.subject);
  const st=statusOf(m);
  const body=document.getElementById("modalBody");
  const blob=await imgGet(id);
  const stageTxt=["","第 1 次复测（"+state.gaps[0]+"天）","第 2 次复测（"+state.gaps[1]+"天）","已过关"][m.stage]||"已过关";
  body.className="m-detail";
  body.innerHTML='<div class="subj-row">'+s.icon+" "+s.name+' · '+esc(m.topic)+'</div>'+
    '<div class="chap">'+m.chapter+'</div>'+
    (blob?'<img class="photo" src="'+URL.createObjectURL(blob)+'">':'')+
    '<div class="t3"><span class="tag reason">'+m.reason+'</span><span class="tag">'+stageTxt+'</span></div>'+
    (m.note?'<div class="note">📝 '+esc(m.note)+'</div>':'')+
    '<div class="hist">录入：'+fmtFull(m.createdAt)+(m.log.length?"<br>复测记录：<br>"+
      m.log.map(l=>(l.ok?"✅":"❌")+" "+fmtFull(l.at)).join("<br>"):"")+'</div>';
  const acts=document.getElementById("modalActions");
  acts.innerHTML="";
  if(st!=="passed"){
    const ok=document.createElement("button"); ok.className="act-ok";
    ok.textContent = "今天独立做对了";
    ok.onclick=()=>review(true);
    const no=document.createElement("button"); no.className="act-no";
    no.textContent="还是不会/做错";
    no.onclick=()=>review(false);
    acts.append(ok,no);
  }else{
    const tip=document.createElement("button"); tip.className="act-ok";
    tip.textContent="已过关 🎉"; tip.disabled=true; tip.style.opacity=.7;
    acts.appendChild(tip);
  }
  const del=document.createElement("button"); del.className="act-del"; del.textContent="删除";
  del.onclick=()=>{ if(confirm("确定删除这道错题和照片吗？")){ removeMistake(id); closeModal(); } };
  acts.appendChild(del);
  document.getElementById("modal").hidden=false;
}
function closeModal(){ document.getElementById("modal").hidden=true; currentId=null; }
document.getElementById("modalX").onclick=closeModal;
document.getElementById("modal").onclick=e=>{ if(e.target.id==="modal") closeModal(); };

function review(ok){
  const m=state.mistakes.find(x=>x.id===currentId); if(!m)return;
  m.updatedAt=Date.now();
  m.log.push({ok, at:Date.now()});
  scheduleNext(m, ok);
  save(); closeModal();
  toast(ok ? (m.stage>=3?"三次做对，过关！🎉":"做对了，已安排下次复测") : "没关系，重新计时，3天后再来");
  renderToday();
}
async function removeMistake(id){
  state.mistakes=state.mistakes.filter(m=>m.id!==id);
  await imgDel(id); save(); renderToday();
}

/* ---------- 薄弱分析 ---------- */
function topicCounts(){
  const map={};
  state.mistakes.forEach(m=>{
    const k=m.subject+"||"+m.topic;
    map[k]=(map[k]||{subject:m.subject,topic:m.topic,total:0,open:0});
    map[k].total++; if(m.stage<3) map[k].open++;
  });
  return Object.values(map).sort((a,b)=>b.open-a.open||b.total-a.total);
}
function renderWeak(elId, n){
  const box=document.getElementById(elId);
  const arr=topicCounts(); const max=Math.max(1,...arr.map(a=>a.open));
  box.innerHTML = arr.length ? "" : '<div class="empty">录入错题后这里会显示薄弱知识点</div>';
  arr.slice(0,n).forEach(a=>{
    const s=SUBJECTS.find(x=>x.id===a.subject);
    const d=document.createElement("div"); d.className="weak-item";
    d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><span>'+s.icon+" "+esc(a.topic)+' <small style="color:#adb5bd">'+(a.open?"未过关 "+a.open:"已全部过关")+'</small><span class="cnt">'+a.total+' 次</span></span></div>'+
      '<div class="weak-bar"><i style="width:'+Math.round(a.open/max*100)+'%"></i></div>';
    box.appendChild(d);
  });
}
function renderStats(){
  const box=document.getElementById("subjectBars"); box.innerHTML="";
  const max=Math.max(1,...SUBJECTS.map(s=>state.mistakes.filter(m=>m.subject===s.id&&m.stage<3).length));
  SUBJECTS.forEach(s=>{
    const all=state.mistakes.filter(m=>m.subject===s.id);
    const open=all.filter(m=>m.stage<3).length;
    const row=document.createElement("div"); row.className="bar-row";
    row.innerHTML='<div class="lbl"><span>'+s.icon+" "+s.name+'</span><span style="color:#7b8794">未过关 '+open+" / 共 "+all.length+'</span></div>'+
      '<div class="bar-track"><i style="width:'+Math.round(open/max*100)+'%;background:'+s.color+'"></i></div>';
    box.appendChild(row);
  });
  renderWeak("topicRank", 20);
}

/* ---------- 备份 / 设置 ---------- */
document.getElementById("exportBtn").onclick=async ()=>{
  const db=await idb();
  const keys=state.mistakes.map(m=>m.id);
  const imgs={};
  await PromiseAllSeq(keys, async k=>{ const b=await imgGet(k); if(b) imgs[k]=await blobToB64(b); });
  const payload={app:"cuoti-b8x", exportedAt:Date.now(), state, images:imgs};
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:"application/json"}));
  a.download="错题备份-"+new Date().toISOString().slice(0,10)+".json";
  a.click(); toast("已导出备份文件");
};
document.getElementById("importInput").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  if(!confirm("导入会与当前错题合并（相同ID覆盖），继续吗？"))return;
  const p=JSON.parse(await f.text());
  if(!p.state||!p.state.mistakes){ toast("文件格式不对"); return; }
  const byId=Object.fromEntries(state.mistakes.map(m=>[m.id,m]));
  p.state.mistakes.forEach(m=>byId[m.id]=m);
  state.mistakes=Object.values(byId);
  for(const [k,b64] of Object.entries(p.images||{})) await imgPut(k, await b64ToBlob(b64));
  save(); renderToday(); toast("导入完成，共 "+p.state.mistakes.length+" 道");
};
document.getElementById("wipeBtn").onclick=async ()=>{
  if(!confirm("将清空全部错题和照片，且无法恢复！建议先导出备份。确定清空？"))return;
  if(!confirm("真的要清空吗？"))return;
  state=defaultState(); save();
  const db=await idb();
  await new Promise(res=>{ const t=db.transaction("imgs","readwrite").objectStore("imgs").clear(); t.onsuccess=res; t.onerror=res; });
  renderToday(); toast("已清空");
};
const gap1=document.getElementById("gap1"), gap2=document.getElementById("gap2");
gap1.value=state.gaps[0]; gap2.value=state.gaps[1];
[gap1,gap2].forEach(g=>g.onchange=()=>{
  state.gaps=[Math.max(1,+gap1.value||3), Math.max(1,+gap2.value||14)]; save(); renderToday();
});

function PromiseAllSeq(items, fn){ return items.reduce((p,it)=>p.then(()=>fn(it)), Promise.resolve()); }
function blobToB64(blob){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.readAsDataURL(blob); }); }
function b64ToBlob(b64){ const bin=atob(b64); const u=Uint8Array.from(bin,c=>c.charCodeAt(0));
  return new Blob([u],{type:"image/jpeg"}); }
function esc(s){ return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

let toastT;
function toast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2200);
}

/* 测试钩子（不影响正常使用） */
window.__cuoti = { get state(){return state;}, set state(v){state=v;}, save(){save();} };

/* PWA */
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
renderToday();
