/* ========== 错题闭环本 · 八下（v2 提分系统主界面） ==========
 * 数据层在 store.js；本文件只负责界面与交互。
 */
document.addEventListener("DOMContentLoaded", init);
function init(){

/* ---------- 导航 ---------- */
document.querySelectorAll(".tab").forEach(btn=>{ btn.onclick=()=>showView(btn.dataset.view); });
function showView(v){
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active", x.id==="view-"+v));
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x.dataset.view===v));
  if(v==="today") renderToday();
  if(v==="list") renderList();
  if(v==="stats") renderAnalyze();
  if(v==="more") renderMore();
  window.scrollTo(0,0);
}

/* ---------- 录入表单 ---------- */
let formSubject="math", formReason=REASONS[0];
const subjectPick=document.getElementById("subjectPick");
SUBJECTS.forEach(s=>{
  const b=document.createElement("button");
  b.type="button"; b.className="chip"+(s.id==="math"?" on":"");
  b.textContent=s.icon+" "+s.name; b.style.setProperty("--c",s.color);
  b.onclick=()=>{ formSubject=s.id;
    subjectPick.querySelectorAll(".chip").forEach(c=>{c.classList.remove("on");c.style.background="";});
    b.classList.add("on"); b.style.background=s.color; fillChapters();
    document.getElementById("topicInput").value=subject().groups[0].topics[0]||""; };
  subjectPick.appendChild(b);
});
function subject(){ return SUBJECTS.find(s=>s.id===formSubject); }
function fillChapters(){
  const sel=document.getElementById("chapterSel");
  sel.innerHTML="";
  const dl=document.getElementById("topicList"); dl.innerHTML="";
  const custom=(state.customTopics&&state.customTopics[formSubject])||[];
  subject().groups.forEach(g=>{
    const og=document.createElement("optgroup"); og.label=g.chapter;
    og.appendChild(new Option(g.chapter,g.chapter));
    sel.appendChild(og);
    g.topics.forEach(t=>dl.appendChild(new Option(t)));
  });
  if(custom.length){ const og=document.createElement("optgroup"); og.label="我自己加过的";
    custom.forEach(t=>og.appendChild(new Option(t))); dl.appendChild(og); }
  subjectPick.querySelectorAll(".chip.on").forEach(c=>c.style.background=subject().color);
  // 错因 chips（随科目刷新时不动）
}
fillChapters();

const reasonPick=document.getElementById("reasonPick");
function fillReasons(sel){
  reasonPick.innerHTML="";
  REASONS.forEach((r)=>{
    const b=document.createElement("button"); b.type="button";
    b.className="chip"+(r===sel?" on":""); b.textContent=r;
    if(r===sel) b.style.background="#e8590c";
    b.onclick=()=>{ formReason=r;
      reasonPick.querySelectorAll(".chip").forEach(c=>{c.classList.remove("on");c.style.background="";});
      b.classList.add("on"); b.style.background="#e8590c"; };
    reasonPick.appendChild(b);
  });
}
fillReasons(formReason);

document.getElementById("chapterSel").onchange=e=>{
  const g=subject().groups.find(x=>x.chapter===e.target.value);
  if(g && !g.topics.includes(document.getElementById("topicInput").value))
    document.getElementById("topicInput").value=g.topics[0]||"";
};

document.getElementById("burstMode").onchange=e=>{
  if(!e.target.checked){ window.__burstCount=0; const b=document.getElementById("burstBar"); b&&b.remove(); }
};

/* 拍照压缩 */
const imgInput=document.getElementById("imgInput");
imgInput.onchange=()=>{
  const f=imgInput.files[0]; if(!f)return;
  compress(f,1600,0.72).then(blob=>{
    state.pickedImg=blob;
    const url=URL.createObjectURL(blob);
    const img=document.getElementById("shotPreview");
    img.src=url; img.hidden=false;
    document.getElementById("shotHint").textContent="📷 重新拍照/选图";
    toast("照片已选好");
  }).catch(()=>toast("图片读取失败，换一张试试"));
};
function compress(file,maxW,quality){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxW/img.width);
      const cv=document.createElement("canvas");
      cv.width=Math.round(img.width*scale); cv.height=Math.round(img.height*scale);
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      cv.toBlob(b=>b?res(b):rej(new Error("compress fail")),"image/jpeg",quality);
      URL.revokeObjectURL(img.src);
    };
    img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}

/* 保存错题 */
document.getElementById("addForm").onsubmit=async e=>{
  e.preventDefault();
  const now=Date.now();
  const m={
    id:uid("m"), subject:formSubject,
    chapter:document.getElementById("chapterSel").value,
    topic:(document.getElementById("topicInput").value||"未分类").trim(),
    reason:formReason,
    diag:{
      cause:document.getElementById("diagCause").value.trim(),
      way:document.getElementById("diagWay").value.trim(),
      avoid:document.getElementById("diagAvoid").value.trim()
    },
    note:"",
    createdAt:now, updatedAt:now, stage:1,
    nextAt:now+state.gaps[0]*DAY, log:[], varAdvances:0
  };
  const builtin=subject().groups.some(g=>g.topics.includes(m.topic));
  if(!builtin && m.topic!=="未分类"){
    state.customTopics[formSubject]=state.customTopics[formSubject]||[];
    if(!state.customTopics[formSubject].includes(m.topic)) state.customTopics[formSubject].push(m.topic);
  }
  if(state.pickedImg){ await imgPut(m.id,state.pickedImg); state.pickedImg=null; }
  state.mistakes.push(m); save();

  const burst=document.getElementById("burstMode").checked;
  if(burst){
    const pv=document.getElementById("shotPreview"); pv.hidden=true; pv.src="";
    imgInput.value="";
    document.getElementById("shotHint").textContent="📷 继续拍下一张 / 点此选图";
    ["diagCause","diagWay","diagAvoid"].forEach(id=>document.getElementById(id).value="");
    window.__burstCount=(window.__burstCount||0)+1;
    let bar=document.getElementById("burstBar");
    if(!bar){ bar=document.createElement("div"); bar.className="burst-bar"; bar.id="burstBar"; e.target.prepend(bar); }
    bar.innerHTML="连续录入中 · 已录 "+window.__burstCount+' 道 · <span style="text-decoration:underline" id="burstEnd">点此结束</span>';
    document.getElementById("burstEnd").onclick=()=>{
      document.getElementById("burstMode").checked=false; window.__burstCount=0;
      bar.remove(); showView("today");
    };
    toast("第 "+window.__burstCount+" 道已保存，拍下一张");
    const shot=document.querySelector(".shot");
    shot.classList.remove("pulse"); void shot.offsetWidth; shot.classList.add("pulse");
    return;
  }
  e.target.reset();
  const pv=document.getElementById("shotPreview"); pv.hidden=true; pv.src="";
  document.getElementById("shotHint").textContent="📷 拍照 / 点此选图";
  toast("已保存，订正后安排独立复测 ✅");
  setTimeout(()=>showView("today"),600);
};

/* ---------- 今日 ---------- */
document.getElementById("todayDate").textContent=
  new Date().toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
ensureSnapshot();

function renderToday(){
  ensureSnapshot();
  renderTasks();
  Sprint.renderCard();
  const now=Date.now();
  const learning=state.mistakes.filter(m=>m.stage<STAGE_PASSED);
  const due=state.mistakes.filter(m=>statusOf(m,now)==="due");
  const weekAgo=now-7*DAY;
  document.getElementById("stTotal").textContent=state.mistakes.length;
  document.getElementById("stLearning").textContent=learning.length;
  document.getElementById("stPassed").textContent=state.mistakes.length-learning.length;
  document.getElementById("stWeek").textContent=state.mistakes.filter(m=>m.createdAt>weekAgo).length;
  // 最近变化
  const snaps=state.snapshots;
  const chg=document.getElementById("recentChange");
  if(chg){
    if(snaps.length>=2){
      const a=snaps[snaps.length-2], b=snaps[snaps.length-1];
      const d=b.passed-a.passed;
      chg.textContent = d>0 ? "较昨天新掌握 "+d+" 题 🎉" : d<0 ? "较昨天未掌握增加 "+(-d)+" 题" : "与昨天持平，今天继续";
    }else chg.textContent="从今天起记录掌握趋势";
  }
  renderWeakMini("weakList");
  // 到期清单（快速复测入口）
  const list=document.getElementById("dueList");
  const dueArr=due.sort((a,b)=>a.nextAt-b.nextAt);
  document.getElementById("dueNum").textContent=dueArr.length;
  document.getElementById("dueHero").style.background =
    dueArr.length ? "linear-gradient(135deg,#e8590c,#fa5252)" : "linear-gradient(135deg,#2f9e44,#51cf66)";
  list.innerHTML = dueArr.length ? "" : '<div class="empty">今天没有到期的复测 🎉<br>完成上方提分任务，或录入新错题</div>';
  dueArr.forEach(m=>list.appendChild(card(m)));
}

/* ---------- 错题本 ---------- */
function renderList(){
  const fs=document.getElementById("fSubject");
  if(fs.options.length===1) SUBJECTS.forEach(s=>fs.appendChild(new Option(s.icon+" "+s.name,s.id)));
  const sv=fs.value, stv=document.getElementById("fStatus").value, q=(document.getElementById("fSearch").value||"").trim().toLowerCase();
  const now=Date.now();
  let arr=state.mistakes.filter(m=>!sv||m.subject===sv);
  if(stv==="learning") arr=arr.filter(m=>m.stage<STAGE_PASSED);
  else if(stv==="due") arr=arr.filter(m=>statusOf(m,now)==="due");
  else if(stv==="passed") arr=arr.filter(m=>m.stage>=STAGE_PASSED);
  if(q) arr=arr.filter(m=>(m.topic+m.chapter+(m.diag&&m.diag.cause||"")).toLowerCase().includes(q));
  arr.sort((a,b)=>b.updatedAt-a.updatedAt);
  const box=document.getElementById("mistakeList");
  box.innerHTML = arr.length ? "" : '<div class="empty">没有符合条件的错题<br>点下方“＋ 录入”拍一张吧</div>';
  arr.forEach(m=>box.appendChild(card(m)));
}
document.getElementById("fSubject").onchange=renderList;
document.getElementById("fStatus").onchange=renderList;
document.getElementById("fSearch").oninput=renderList;

function card(m){
  const s=SUBJECTS.find(x=>x.id===m.subject);
  const st=statusOf(m);
  const el=document.createElement("div"); el.className="m-card";
  const badge = st==="due"?'<span class="badge due">今日复测</span>'
    : st==="passed"?'<span class="badge passed">已过关</span>'
    : m.stage===1?'<span class="badge s1">待订正</span>'
    : '<span class="badge s2">'+fmt(m.nextAt)+'到期</span>';
  const mst=mastery(m);
  el.innerHTML='<div class="thumb emoji">'+s.icon+'</div>'+
    '<div class="meta"><div class="t1">'+badge+' '+esc(m.topic)+'</div>'+
    '<div class="t2">'+esc(m.chapter)+'</div>'+
    '<div class="t3"><span class="tag reason">'+esc(m.reason)+'</span>'+
    '<span class="tag">掌握 '+mst+'</span>'+
    '<span class="tag">'+fmt(m.updatedAt)+'</span></div></div>';
  el.onclick=()=>openModal(m.id);
  imgGet(m.id).then(b=>{ if(b){ const im=new Image(); im.className="thumb"; im.src=URL.createObjectURL(b);
    const old=el.querySelector(".thumb"); if(old) el.replaceChild(im,old); }});
  return el;
}

/* ---------- 详情弹层 ---------- */
let currentId=null, reviewStart=0;
async function openModal(id){
  currentId=id; reviewStart=Date.now();
  const m=state.mistakes.find(x=>x.id===id); if(!m)return;
  const s=SUBJECTS.find(x=>x.id===m.subject);
  const st=statusOf(m);
  const body=document.getElementById("modalBody");
  const blob=await imgGet(id);
  body.className="m-detail";
  const vs=variantsOf(id);
  body.innerHTML='<div class="subj-row">'+s.icon+" "+s.name+' · '+esc(m.topic)+'</div>'+
    '<div class="chap">'+esc(m.chapter)+' <span class="tag">'+stageLabel(m)+'</span> <span class="tag">掌握度 '+mastery(m)+'</span></div>'+
    (blob?'<img class="photo" src="'+URL.createObjectURL(blob)+'">':'')+
    '<div class="t3"><span class="tag reason">'+esc(m.reason)+'</span></div>'+
    diagEditor(m)+
    '<div class="hist"><b>复测记录</b>（'+(m.log.filter(l=>l.kind!=="correction").length)+' 次）'+
      histHTML(m)+'</div>'+
    '<div class="var-sum">📎 同类变式题 '+vs.length+' 道'+
      (vs.length?'，独立做对 '+vs.filter(v=>(v.log||[]).some(l=>l.ok&&l.independent)).length+' 道':"")+'</div>';
  const acts=document.getElementById("modalActions");
  acts.innerHTML="";
  if(m.stage===1){
    const c=mkBtn("act-ok","✅ 我已订正（写了避免方法）",()=>finishCorrection(m));
    acts.append(c);
  }else if(st!=="passed"){
    const ok=mkBtn("act-ok","🙈 遮住答案，独立做对了",()=>review(m,true,true));
    const peek=mkBtn("act-no2","👀 看答案才会",()=>review(m,true,false));
    const no=mkBtn("act-no","❌ 还是不会/做错",()=>review(m,false,true));
    acts.append(ok,peek,no);
  }else{
    const tip=document.createElement("button"); tip.className="act-ok";
    tip.textContent="已过关 🎉"; tip.disabled=true; tip.style.opacity=.7; acts.appendChild(tip);
  }
  const train=mkBtn("act-train","🎯 同类训练",()=>Train.openMistake(id));
  const edit=mkBtn("act-edit","✏️ 改错题",()=>editMistake(m));
  const del=mkBtn("act-del","删除",()=>{ if(confirm("确定删除这道错题和照片吗？")){ removeMistake(id); closeModal(); }});
  acts.append(train,edit,del);
  document.getElementById("modal").hidden=false;
}
function variantsOf(id){ return state.variants[id]||[]; }
function mkBtn(cls,txt,fn){ const b=document.createElement("button"); b.className=cls; b.textContent=txt; b.onclick=fn; return b; }
function histHTML(m){
  if(!m.log.length) return '<div class="small muted" style="margin-top:4px">还没有记录</div>';
  return '<div class="hist-list">'+m.log.slice(-8).map(l=>{
    const ic=l.kind==="correction"?"📝":l.ok?(l.independent?"✅":"👀"):"❌";
    const txt=l.kind==="correction"?"订正完成":l.ok?(l.independent?"独立做对":"看答案才会"):"做错";
    return '<div>'+ic+" "+txt+" · "+fmtFull(l.at)+
      (l.ms?" · 用时 "+fmtDur(l.ms):"")+(l.hints?" · 提示 "+l.hints+" 次":"")+
      (l.kind==="variant"?" · 变式题":"")+'</div>';
  }).join("")+'</div>';
}
function diagEditor(m){
  return '<div class="diag-box">'+
    diagField("错误原因","diagCause",m.diag.cause,"例：把判别式 Δ=b²-4ac 记成了 b²+4ac")+
    diagField("正确思路","diagWay",m.diag.way,"例：先化成一般式，再代入判别式")+
    diagField("下次如何避免","diagAvoid",m.diag.avoid,"例：做题前先在草稿纸上写一遍公式")+
    '<button class="btn-mini" id="diagSave">保存错因三字段</button>'+
    '<label class="ai-note">AI 诊断：当前未接入 AI。以后接入时，AI 建议会单独列在旁边，必须你点「采纳」才会写入，不会自动改题。</label>'+
  '</div>';
}
function diagField(label,id,val,ph){
  return '<label class="diag-field"><span>'+label+'</span><textarea id="'+id+'" rows="2" placeholder="'+ph+'">'+esc(val||"")+'</textarea></label>';
}
function editMistake(m){
  const body=document.getElementById("modalBody");
  body.innerHTML='<div class="subj-row">✏️ 修改错题信息</div>'+
    '<label class="field-label">科目</label><select id="edSubject">'+SUBJECTS.map(s=>'<option value="'+s.id+'"'+(s.id===m.subject?" selected":"")+">"+s.name+"</option>").join("")+'</select>'+
    '<label class="field-label">章节</label><input id="edChapter" value="'+esc(m.chapter)+'">'+
    '<label class="field-label">知识点</label><input id="edTopic" value="'+esc(m.topic)+'">'+
    '<label class="field-label">错因</label><select id="edReason">'+REASONS.map(r=>'<option'+(r===m.reason?" selected":"")+">"+r+"</option>").join("")+'</select>'+
    '<div class="modal-actions" style="margin-top:14px"><button class="act-ok" id="edSave">保存</button>'+
    '<button class="act-del" id="edCancel">取消</button></div>';
  document.getElementById("edSave").onclick=()=>{
    m.subject=document.getElementById("edSubject").value;
    m.chapter=document.getElementById("edChapter").value.trim()||m.chapter;
    m.topic=document.getElementById("edTopic").value.trim()||m.topic;
    m.reason=document.getElementById("edReason").value;
    save(); toast("已修改"); openModal(m.id); renderToday();
  };
  document.getElementById("edCancel").onclick=()=>openModal(m.id);
}
function closeModal(){ document.getElementById("modal").hidden=true; currentId=null; }
document.getElementById("modalX").onclick=closeModal;
document.getElementById("modal").onclick=e=>{ if(e.target.id==="modal") closeModal(); };

/* 详情内事件委托：保存错因、订正 */
document.getElementById("modalBody").addEventListener("click", e=>{
  if(e.target.id==="diagSave"){
    const m=state.mistakes.find(x=>x.id===currentId); if(!m)return;
    m.diag={cause:val("diagCause"),way:val("diagWay"),avoid:val("diagAvoid")};
    save(); toast("错因已保存");
  }
});
function val(id){ const el=document.getElementById(id); return el?el.value.trim():""; }

function finishCorrection(m){
  if(!val("diagAvoid")){ toast("先写一句「下次如何避免」再标记订正"); document.getElementById("diagAvoid").focus(); return; }
  m.diag={cause:val("diagCause"),way:val("diagWay"),avoid:val("diagAvoid")};
  applyAttempt(m,{kind:"correction",ok:true,independent:false});
  save(); closeModal(); toast("已订正，明天安排第一次独立复测"); renderToday();
}
function review(m,ok,independent){
  applyAttempt(m,{kind:"review",ok,independent,hints:independent?0:1,ms:Date.now()-reviewStart});
  closeModal();
  toast(ok?(independent?(m.stage>=STAGE_PASSED?"连续过关，已掌握 🎉":"独立做对，已安排下次复测"):"看答案会：明天再独立做一遍"):"没关系，已缩短到 "+state.gaps[0]+" 天后复测");
  renderToday();
}
async function removeMistake(id){
  state.mistakes=state.mistakes.filter(m=>m.id!==id);
  delete state.variants[id];
  await imgDel(id); save(); renderToday();
}

/* ---------- 备份 / 设置 ---------- */
function renderMore(){
  const [g1,g2,g3,g4,g5]=state.gaps;
  document.getElementById("gapVals").innerHTML=[["g1",g1],["g2",g2],["g3",g3],["g4",g4],["g5",g5]].map(([id,v])=>
    '<label class="gap-item">'+({g1:"订正→首测",g2:"第2次",g3:"第3次",g4:"第4次",g5:"掌握前"}[id])+
    '<input type="number" min="0" max="60" value="'+v+'" data-gap="'+id+'">天</label>').join("");
  document.getElementById("storeInfo").textContent=
    "题目、错因、复测记录约占 "+(JSON.stringify(state).length/1024).toFixed(1)+" KB；照片存在浏览器 IndexedDB。"+
    "清理浏览器缓存/换手机前务必先导出。备份文件含题目、照片、错因、变式题、复测记录和复习计划。";
  document.querySelectorAll("[data-gap]").forEach(inp=>inp.onchange=()=>{
    state.gaps=["g1","g2","g3","g4","g5"].map(k=>{ const el=document.querySelector('[data-gap="'+k+'"]'); return Math.max(0,Math.min(60,+el.value||0)); });
    save(); toast("复习间隔已更新");
  });
}
document.getElementById("exportBtn").onclick=async ()=>{
  try{
    const payload=await exportPayload();
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:"application/json"}));
    a.download="错题提分备份-"+new Date().toISOString().slice(0,10)+".json";
    a.click(); toast("已导出备份文件（含照片）");
  }catch(e){ toast("导出失败："+e.message); }
};
document.getElementById("importInput").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    const p=JSON.parse(await f.text());
    validateIncoming(p); // 先校验，失败不动现有数据
  }catch(err){ toast("导入已取消："+err.message); e.target.value=""; return; }
  if(!confirm("将把备份合并进当前数据（相同错题按备份覆盖），继续吗？")){ e.target.value=""; return; }
  try{
    const p=JSON.parse(await f.text());
    const r=await mergeImport(p);
    renderToday(); toast("导入完成："+r.mistakes+" 道错题，"+r.images+" 张照片");
  }catch(err){ toast("导入失败，现有数据未改动："+err.message); }
  e.target.value="";
};
document.getElementById("wipeBtn").onclick=async ()=>{
  if(!confirm("将清空全部错题、变式题和照片，且无法恢复！建议先导出备份。确定清空？"))return;
  if(!confirm("真的要清空吗？此操作不可撤销。"))return;
  state=defaultState(); save();
  try{ const db=await idb();
    if(!db.__memory) await new Promise(res=>{ const t=db.transaction("imgs","readwrite").objectStore("imgs").clear(); t.onsuccess=res; t.onerror=res; });
  }catch(e){}
  renderToday(); toast("已清空");
};

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2400);
}

/* ---------- 测试钩子 ---------- */
Object.assign(window,{showView,openModal,closeModal,review,removeMistake,editMistake,toast,renderToday});
window.__cuoti={get state(){return state;},set state(v){state=v;},save(){save();},
  buildTasks,topicRows,applyAttempt,mastery,migrateState,validateIncoming,mergeImport,exportPayload,
  showView,openModal,closeModal,review,removeMistake,editMistake,toast,renderToday};

/* PWA */
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderToday();
}
