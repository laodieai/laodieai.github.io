/* ============================================================
 * sprint.js —— 可配置考试冲刺（3/5/7/10/14 天）
 * 每日任务全部来自真实到期错题和薄弱知识点；不预测考试分数。
 * ============================================================ */
const Sprint=(function(){
  function dayStarts(sp){ const out=[]; for(let i=0;i<sp.days;i++){ const d=new Date(sp.startAt); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); out.push(d.getTime()); } return out; }
  function dayIndex(sp, ts){ const d=new Date(sp.startAt); d.setHours(0,0,0,0); return Math.floor(((ts||Date.now())-d.getTime())/DAY); }
  function plan(){
    const sp=state.sprint; if(!sp) return null;
    const rows=topicRows().filter(r=>r.open>0).slice(0,5);
    const candidates=state.mistakes.filter(m=>m.stage<STAGE_PASSED)
      .sort((a,b)=>a.nextAt-b.nextAt);
    const quota=Math.max(1, Math.ceil(candidates.length/sp.days));
    const days=[];
    for(let i=0;i<sp.days;i++){
      const ids=candidates.slice(i*quota,(i+1)*quota).map(m=>m.id);
      const r=rows[i%Math.max(1,rows.length)];
      days.push({ids, topic:r?{subject:r.subject,topic:r.topic}:null, mock:i===sp.days-1});
    }
    return {sp,days,rows};
  }
  function indepOkAfter(id, t){ const m=state.mistakes.find(x=>x.id===id); return m&&(m.log||[]).some(l=>l.ok&&l.independent&&l.at>=t); }
  function variantDone(subject,topic,t){ return state.retests.some(r=>r.kind==="variant"&&r.ok&&r.independent&&r.at>=t&&r.subject===subject&&r.topic===topic); }
  function renderCard(){
    const box=document.getElementById("sprintCard"); if(!box) return;
    const sp=state.sprint;
    if(!sp){
      box.innerHTML = state.mistakes.length>=3
        ? '<button class="sprint-entry" id="sprintStartBtn">🏁 考试冲刺 · 设定 7 天提分计划</button>' : "";
      const b=document.getElementById("sprintStartBtn"); if(b) b.onclick=()=>openSetup();
      return;
    }
    const p=plan(), idx=Math.min(Math.max(dayIndex(sp),0),sp.days-1), ds=dayStarts(sp);
    let doneIds=0, totalIds=0, topicsDone=0;
    p.days.forEach((d,i)=>{ totalIds+=d.ids.length;
      d.ids.forEach(id=>{ if((state.mistakes.find(m=>m.id===id)||{}).stage>=STAGE_PASSED || indepOkAfter(id, ds[0])) doneIds++; });
      if(d.topic && variantDone(d.topic.subject,d.topic.topic,ds[0])) topicsDone++;
    });
    const mockDone=(sp.log||[]).some(l=>l.type==="mock");
    const today=p.days[idx];
    const todayDone = today.ids.filter(id=>indepOkAfter(id,ds[idx])).length + (today.topic&&variantDone(today.topic.subject,today.topic.topic,ds[idx])?1:0);
    const todayTotal = today.ids.length + (today.topic?1:0) + (today.mock?1:0);
    const ended=Date.now()>sp.endAt;
    box.innerHTML='<div class="sprint-card"><div class="sp-head"><b>🏁 冲刺第 '+(idx+1)+'/'+sp.days+' 天</b>'+
      '<button class="btn-mini" id="sprintOpen">查看计划</button></div>'+
      '<div class="task-bar" style="margin:8px 0"><i style="width:'+Math.round((doneIds+topicsDone+(mockDone?1:0))/Math.max(1,totalIds+p.days.length)*100)+'%"></i></div>'+
      '<div class="small muted">今天任务完成 '+todayDone+'/'+todayTotal+' · 累计复测 '+doneIds+'/'+totalIds+' 题 · 薄弱专项 '+topicsDone+' 个'+
      (ended?' · <span style="color:var(--orange)">已到期</span>':'')+'</div></div>';
    document.getElementById("sprintOpen").onclick=()=>open();
  }
  function renderModal(){
    const p=plan(); if(!p) return;
    const {sp,days}=p, ds=dayStarts(sp), idx=Math.min(Math.max(dayIndex(sp),0),sp.days-1);
    const mockLog=(sp.log||[]).find(l=>l.type==="mock");
    document.getElementById("sprintTitle").textContent="🏁 考试冲刺计划（"+sp.days+" 天）";
    document.getElementById("sprintBody").innerHTML=
      '<div class="sprint-tip">计划按你当前未掌握的 '+state.mistakes.filter(m=>m.stage<STAGE_PASSED).length+' 道错题自动排开，最后一天限时模拟。<b>训练正确率不等于正式考试分数</b>，只反映掌握趋势。</div>'+
      days.map((d,i)=>{
        const idsDone=d.ids.filter(id=>indepOkAfter(id,ds[i])).length;
        const tDone=d.topic&&variantDone(d.topic.subject,d.topic.topic,ds[i]);
        const mockDone=i===sp.days-1 && !!mockLog;
        const all=idsDone===d.ids.length && (!d.topic||tDone) && (!d.mock||mockDone);
        const s=SUBJECTS.find(x=>x.id===(d.topic&&d.topic.subject));
        return '<div class="sp-day '+(i===idx?"today":"")+(all?" done":"")+'"><div class="sp-day-h">第 '+(i+1)+' 天'+(d.mock?' · 限时模拟':'')+(all?' ✓':'')+'</div>'+
          '<div class="sp-day-b">📝 复测 '+idsDone+'/'+d.ids.length+' 题'+
            (d.ids.length?' <button class="btn-mini" data-sp-day="'+i+'">开始</button>':'')+'</div>'+
          (d.topic?'<div class="sp-day-b">'+(s?s.icon:"🎯")+' 专项：'+esc(d.topic.topic)+' '+(tDone?"✓":"")+' <button class="btn-mini" data-sp-topic="'+i+'">练习</button></div>':"")+
          (d.mock?'<div class="sp-day-b">⏱ 限时模拟（遮答案，15分钟）'+(mockLog?" ✓（"+fmtFull(mockLog.at)+"）":"")+' <button class="btn-mini" data-sp-mock>开始计时</button></div>':"")+
        '</div>';
      }).join("")+
      '<div class="sprint-rep" id="sprintReport"></div>'+
      '<div class="sprint-actions"><button class="btn-mini" id="sprintReportBtn">查看冲刺报告</button>'+
      '<button class="btn-mini danger" id="sprintEnd">提前结束</button></div>';
    document.getElementById("sprintBody").querySelectorAll("[data-sp-day]").forEach(b=>{
      b.onclick=()=>{ const d=days[+b.dataset.spDay]; const mid=d.ids.find(id=>!indepOkAfter(id,ds[+b.dataset.spDay]))||d.ids[0];
        const m=state.mistakes.find(x=>x.id===mid); Train.close(); close(); if(m)openModal(m.id); };
    });
    document.getElementById("sprintBody").querySelectorAll("[data-sp-topic]").forEach(b=>{
      b.onclick=()=>{ const d=days[+b.dataset.spTopic]; close(); Train.openTopic(d.topic.subject,d.topic.topic); };
    });
    const mb=document.querySelector("[data-sp-mock]");
    if(mb) mb.onclick=startMock;
    document.getElementById("sprintReportBtn").onclick=renderReport;
    document.getElementById("sprintEnd").onclick=()=>{ if(confirm("结束本次冲刺？报告仍可在结束前查看。")){ state.sprint=null; save(); close(); renderToday(); } };
    if(Date.now()>sp.endAt) renderReport();
  }
  function startMock(){
    let left=15*60;
    const card=document.querySelector("[data-sp-mock]").closest(".sp-day");
    const box=document.createElement("div"); box.className="mock-box";
    box.innerHTML='<b>⏱ 限时模拟进行中</b><div class="mock-timer">15:00</div>'+
      '<div class="small muted">遮住答案，把今天到期的错题在纸上重做。</div>'+
      '<button class="btn-primary" style="margin-top:10px">交卷并记录</button>';
    card.appendChild(box);
    const t=setInterval(()=>{ left--; const mm=String(Math.floor(left/60)).padStart(2,"0"), ss=String(left%60).padStart(2,"0");
      const el=box.querySelector(".mock-timer"); if(el)el.textContent=mm+":"+ss;
      if(left<=0){ clearInterval(t); finishMock(box,15); } },1000);
    box.querySelector("button").onclick=()=>{ clearInterval(t); finishMock(box,Math.round((15*60-left)/60)); };
  }
  function finishMock(box,mins){
    state.sprint.log=state.sprint.log||[];
    state.sprint.log.push({at:Date.now(),type:"mock",mins});
    save(); box.remove(); toast("模拟已记录，去逐题登记独立复测结果"); renderModal();
  }
  function renderReport(){
    const p=plan(), sp=p.sp, from=sp.startAt, to=Math.min(Date.now(),sp.endAt);
    const rs=state.retests.filter(r=>r.at>=from && r.at<=to+DAY && r.kind!=="correction");
    const ind=rs.filter(r=>r.independent);
    const acc=ind.length?Math.round(ind.filter(r=>r.ok).length/ind.length*100):null;
    const passed=state.mistakes.filter(m=>m.stage>=STAGE_PASSED && m.updatedAt>=from).length;
    const topics=p.rows.slice(0,5).map(r=>{
      const snap=(sp.startSnap||[]).find(x=>x.key===r.subject+"||"+r.topic);
      const now=Math.round(r.ids.reduce((a,id)=>{const m=state.mistakes.find(x=>x.id===id);return a+(m?mastery(m):0);},0)/Math.max(1,r.ids.length));
      return {name:(SUBJECTS.find(s=>s.id===r.subject)||{}).icon+" "+r.topic, delta: snap?now-snap.before:null};
    });
    document.getElementById("sprintReport").innerHTML='<div class="report-card"><b>冲刺报告</b>'+
      '<div class="rep-grid"><div><b>'+rs.length+'</b><span>复测次数</span></div>'+
      '<div><b>'+(acc==null?"数据不足":acc+"%")+'</b><span>独立正确率</span></div>'+
      '<div><b>'+passed+'</b><span>本期过关题数</span></div></div>'+
      (topics.some(t=>t.delta!=null)?'<div class="small muted">掌握度变化：'+topics.filter(t=>t.delta!=null).map(t=>t.name+(t.delta>=0?" +":" ")+t.delta).join(" · ")+'</div>':"")+
      '<div class="small muted" style="margin-top:6px">说明：以上是训练趋势，<b>不是正式考试的提分预测</b>。</div></div>';
  }
  function openSetup(){
    document.getElementById("sprintTitle").textContent="🏁 开启考试冲刺";
    document.getElementById("sprintBody").innerHTML='<div class="sprint-tip">从明天起按天安排：每天复测一批错题 + 一个薄弱知识点专项，最后一天限时模拟。任务全部来自你的真实错题。</div>'+
      '<label class="field-label">冲刺天数</label><select id="spDays">'+[3,5,7,10,14].map(d=>'<option value="'+d+'"'+(d===7?" selected":"")+">"+d+" 天</option>").join("")+'</select>'+
      '<button class="btn-primary" id="spCreate">生成我的冲刺计划</button>';
    document.getElementById("sprintModal").hidden=false;
    document.getElementById("spCreate").onclick=()=>{
      const days=+document.getElementById("spDays").value;
      const start=new Date(); start.setHours(0,0,0,0);
      const end=new Date(start.getTime()+(days-1)*DAY); end.setHours(23,59,59,999);
      const startSnap=topicRows().filter(r=>r.open>0).slice(0,5).map(r=>({key:r.subject+"||"+r.topic,
        before:Math.round(r.ids.reduce((a,id)=>{const m=state.mistakes.find(x=>x.id===id);return a+(m?mastery(m):0);},0)/Math.max(1,r.ids.length))}));
      state.sprint={startAt:start.getTime(), days, endAt:end.getTime(), active:true, startSnap, log:[]};
      save(); open(); renderToday(); toast("冲刺计划已生成");
    };
  }
  function open(){ document.getElementById("sprintModal").hidden=false; renderModal(); }
  function close(){ document.getElementById("sprintModal").hidden=true; }
  return {open,close,openSetup,renderCard};
})();
document.addEventListener("DOMContentLoaded", ()=>{
  const m=document.getElementById("sprintModal");
  m.querySelector(".modal-x").onclick=()=>Sprint.close();
  m.onclick=e=>{ if(e.target.id==="sprintModal") Sprint.close(); };
});
