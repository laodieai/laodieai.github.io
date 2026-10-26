/* ============================================================
 * plan.js —— 今日提分任务
 * 综合：到期复测 / 反复错知识点 / 新错题 / 久未复习 / 近期低正确率
 * 不只看错题数量；完成状态全部由当天真实复测记录推导
 * ============================================================ */
let planSubject = ""; // 分科筛选

function indepOkToday(m){
  return (m.log||[]).some(l=>l.ok && l.independent && l.kind!=="correction" && sameDay(l.at, Date.now()));
}
function variantPassToday(subject, topic){
  const today=todayStr();
  return state.retests.filter(r=>r.kind==="variant" && r.ok && r.independent &&
    r.subject===subject && r.topic===topic && todayStr(r.at)===today).length;
}
function bySubject(arr){
  const out={};
  arr.forEach(m=>{ (out[m.subject] ||= []).push(m); });
  return out;
}
function buildTasks(){
  const now=Date.now(), tasks=[];
  const open = state.mistakes.filter(m=>m.stage<STAGE_PASSED);

  // 1) 到期独立复测：按学科拆卡，便于分科安排
  const due = open.filter(m=>statusOf(m,now)==="due" && m.stage>=2);
  Object.values(bySubject(due)).forEach(list=>{
    tasks.push({type:"due", subject:list[0].subject, title:"遮住答案 · 到期独立复测",
      sub:"这些题到了该重新做的时间，别看答案",
      ids:list.map(m=>m.id), mins:list.length*4,
      doneN:list.filter(m=>indepOkToday(m)).length,
      cta:"开始复测", run:()=>openFirstPending(list.filter(m=>!indepOkToday(m)))});
  });
  // 2) 当天订正（按学科拆卡）
  const toCorrect = open.filter(m=>m.stage===1);
  Object.values(bySubject(toCorrect)).forEach(list=>{
    tasks.push({type:"correct", subject:list[0].subject, title:"订正今天的新错题",
      sub:"看懂正确思路，写出「下次如何避免」",
      ids:list.map(m=>m.id), mins:5,
      doneN:list.filter(m=>m.stage>=2).length,
      cta:"去订正", run:()=>openFirstPending(list.filter(m=>m.stage===1))});
  });
  // 3) 最薄弱知识点：同类变式（取综合排序第一）
  const rows = topicRows().filter(r=>r.open>=1);
  if(rows.length){
    const r=rows[0];
    const have = variantsForTopic(r.subject,r.topic).length;
    if(have===0){
      const createdToday = state.mistakes.some(m=>m.subject===r.subject&&m.topic===r.topic);
      tasks.push({type:"variant-add", subject:r.subject, topic:r.topic,
        title:"给最薄弱点「"+r.topic+"」录 1 道变式题",
        sub:"改个数字或问法，手动录入（本站不伪造题库）", ids:[], mins:5,
        doneN: createdToday && have>0 ? 1:0, totalN:1,
        cta:"去录题", run:()=>Train.openTopic(r.subject,r.topic,true)});
    }else{
      const n=variantPassToday(r.subject,r.topic);
      tasks.push({type:"variant", subject:r.subject, topic:r.topic,
        title:"同类变式训练 · "+r.topic,
        sub:"基础→同类→进阶→综合，独立做对要写过程", ids:[], mins:8,
        doneN:Math.min(2,n), totalN:2,
        cta:"开始训练", run:()=>Train.openTopic(r.subject,r.topic)});
    }
  }
  // 4) 长期未复习（10 天没动、尚未掌握、还没到期）
  const stale = open.filter(m=>m.stage>=2 && statusOf(m,now)==="learning" && (now-m.updatedAt)>10*DAY);
  Object.values(bySubject(stale)).forEach(list=>{
    tasks.push({type:"stale", subject:list[0].subject, title:"提前巩固 · 长期未复习",
      sub:"已经 10 天以上没碰，趁没忘光先做一遍",
      ids:list.map(m=>m.id), mins:Math.min(15,list.length*3),
      doneN:list.filter(m=>indepOkToday(m)).length,
      cta:"现在做", run:()=>openFirstPending(list.filter(m=>!indepOkToday(m)))});
  });
  // 5) 近期低正确率专项（30 天有≥3次独立尝试且正确率<70%，且与任务3不重复）
  const low = rows.find(r=>r.att30>=3 && r.acc30!=null && r.acc30<0.7 &&
    !tasks.some(t=>(t.topic===r.topic && t.subject===r.subject)));
  if(low && variantsForTopic(low.subject,low.topic).length>0){
    const n=variantPassToday(low.subject,low.topic);
    tasks.push({type:"weaklow", subject:low.subject, topic:low.topic,
      title:"低正确率专项 · "+low.topic+"（近30天 "+Math.round(low.acc30*100)+"%）",
      sub:"用变式题验证是真会了还是蒙的", ids:[], mins:8,
      doneN:Math.min(2,n), totalN:2,
      cta:"专项练习", run:()=>Train.openTopic(low.subject,low.topic)});
  }
  tasks.forEach(t=>{ if(t.totalN==null){ t.totalN=t.ids.length; } });
  return tasks.slice(0,6);
}
function openFirstPending(ms){
  const m=ms[0];
  if(m) openModal(m.id);
  else { renderTasks(); toast("这组任务已完成 ✅"); }
}
function renderTaskChips(){
  const box=document.getElementById("taskSubjects"); if(!box) return;
  const counts={};
  buildTasks().forEach(t=>{ const s=t.subject||"all"; counts[s]=(counts[s]||0)+1; });
  const subs=[["","全部"]].concat(SUBJECTS.map(s=>[s.id,s.icon+s.name]));
  box.innerHTML=subs.map(([id,name])=>{
    if(id!=="" && !counts[id]) return "";
    return '<button class="tchip '+(planSubject===id?"on":"")+'" data-plan-sub="'+id+'">'+name+(id===""&&counts.all?"":(counts[id]?" "+counts[id]:""))+'</button>';
  }).join("");
}
function renderTasks(){
  renderTaskChips();
  const area=document.getElementById("taskArea"); if(!area) return;
  if(!state.mistakes.length){
    area.innerHTML='<div class="onboard">'+
      '<div class="ob-emoji">📚</div><h2>先录第一道错题</h2>'+
      '<p>拍一张卷子照片，选好科目和丢分原因，30 秒一道。<br>系统会自动安排：<b>当天订正 → 1天独立复测 → 3天 → 7天 → 14天 → 30天</b>。</p>'+
      '<div class="ob-steps"><div><b>1</b>拍照录入</div><div><b>2</b>看懂订正</div><div><b>3</b>遮答案复测</div><div><b>4</b>同类变式巩固</div></div>'+
      '<button class="btn-primary" id="obAdd">📷 立即录入第一道错题</button></div>';
    document.getElementById("obAdd").onclick=()=>document.querySelector('.tab[data-view="add"]').click();
    return;
  }
  let tasks=buildTasks();
  if(planSubject) tasks=tasks.filter(t=>{
    if(t.subject) return t.subject===planSubject;
    return t.ids.some(id=>(state.mistakes.find(m=>m.id===id)||{}).subject===planSubject);
  });
  const doneTasks=tasks.filter(t=>t.doneN>=t.totalN).length;
  const mins=tasks.reduce((a,t)=>a+(t.doneN>=t.totalN?0:Math.ceil(t.mins*(1-t.doneN/t.totalN))),0);
  const subjTask=tasks.find(t=>t.subject);
  document.getElementById("taskProgressWrap").hidden=false;
  document.getElementById("taskProgressText").textContent="今日任务 "+doneTasks+"/"+tasks.length+(mins?" · 还需约 "+mins+" 分钟":" · 全部完成 🎉");
  document.getElementById("taskProgressBar").style.width=(tasks.length?Math.round(doneTasks/tasks.length*100):0)+"%";
  if(!tasks.length){ area.innerHTML='<div class="empty" style="padding:28px">这个科目今天没有提分任务 🎉</div>'; return; }
  area.innerHTML=tasks.map((t,i)=>{
    const sicon = t.subject ? (SUBJECTS.find(s=>s.id===t.subject)||{}).icon : "📌";
    const done=t.doneN>=t.totalN, pctN=Math.round(t.doneN/t.totalN*100);
    return '<div class="task-card '+(done?"done":"")+'" data-task="'+i+'">'+
      '<div class="task-main"><div class="task-t">'+(done?'<span class="task-check">✓</span>':'<span class="task-dot">'+sicon+'</span>')+esc(t.title)+'</div>'+
      '<div class="task-sub">'+esc(t.sub)+'</div>'+
      '<div class="task-bar"><i style="width:'+pctN+'%"></i></div></div>'+
      '<div class="task-side"><div class="task-n">'+t.doneN+'/'+t.totalN+'</div>'+
      '<button class="btn-mini '+(done?"ghost":"")+'">'+(done?"回看":t.cta)+'</button></div></div>';
  }).join("");
  area.querySelectorAll("[data-task]").forEach(el=>{
    el.onclick=()=>{ const t=tasks[+el.dataset.task]; t.run&&t.run(); };
  });
}
document.addEventListener("click", e=>{
  const c=e.target.closest("[data-plan-sub]"); if(!c) return;
  planSubject=c.dataset.planSub; renderTasks();
});
