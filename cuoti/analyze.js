/* ============================================================
 * analyze.js —— 薄弱知识点分析（近期错误/累计错误/复测失败/掌握度综合）
 * ============================================================ */
function attemptsIn(days){
  const from = Date.now()-days*DAY;
  return state.retests.filter(r=>r.at>=from && r.kind!=="correction");
}
function topicRows(){
  const map={};
  const now=Date.now();
  const r30=attemptsIn(30);
  state.mistakes.forEach(m=>{
    const k=m.subject+"||"+m.topic;
    if(!map[k]) map[k]={key:k, subject:m.subject, topic:m.topic, ids:[], total:0, open:0, due:0,
      new7:0, fails7:0, fails30:0, att7:0, okInd7:0, att30:0, okInd30:0, last:null, masterySum:0};
    const a=map[k];
    a.ids.push(m.id); a.total++;
    const st=statusOf(m,now);
    if(m.stage<STAGE_PASSED){ a.open++; if(st==="due") a.due++; a.masterySum+=mastery(m); }
    if(m.createdAt>=now-7*DAY) a.new7++;
  });
  Object.values(map).forEach(a=>{a.att7=0;a.okInd7=0;a.att30=0;a.okInd30=0;a.fails7=0;a.fails30=0;a.last=null;});
  r30.forEach(r=>{
    const m=state.mistakes.find(x=>x.id===r.mistakeId);
    const k=(r.subject||(m&&m.subject))+"||"+(r.topic||(m&&m.topic));
    const a=map[k]; if(!a) return;
    if(r.at>=now-7*DAY){ a.att7++; if(r.independent&&r.ok)a.okInd7++; if(!r.ok)a.fails7++; }
    a.att30++; if(r.independent&&r.ok)a.okInd30++; if(!r.ok)a.fails30++;
    if(!a.last||a.last.at<r.at)a.last=r;
  });
  return Object.values(map).map(a=>{
    a.avgMastery = a.open ? Math.round(a.masterySum/a.open) : 100;
    a.acc7 = a.att7? a.okInd7/a.att7 : null;
    a.acc30 = a.att30? a.okInd30/a.att30 : null;
    // 综合薄弱分：近期错误权重最高，兼顾累计/到期/掌握度/低正确率
    let score = a.fails7*3 + a.new7*1.6 + a.fails30*0.9 + a.open*1.4 + a.due*1.2
              + (100-a.avgMastery)*0.12;
    if(a.acc30!=null && a.att30>=3) score += (1-a.acc30)*10;
    a.score=Math.round(score*10)/10;
    return a;
  }).sort((x,y)=>y.score-x.score || y.open-x.open || y.total-x.total);
}
function variantsForTopic(subject, topic){
  const ids = state.mistakes.filter(m=>m.subject===subject && m.topic===topic).map(m=>m.id);
  let out=[];
  ids.forEach(id=>{ (state.variants[id]||[]).forEach(v=>out.push(Object.assign({mistakeId:id},v))); });
  return out;
}
function subjectSummary(){
  const now=Date.now(), from7=now-7*DAY;
  return SUBJECTS.map(s=>{
    const ms=state.mistakes.filter(m=>m.subject===s.id);
    return { id:s.id, name:s.name, icon:s.icon, color:s.color, total:ms.length,
      open:ms.filter(m=>m.stage<STAGE_PASSED).length,
      due:ms.filter(m=>statusOf(m,now)==="due").length,
      new7:ms.filter(m=>m.createdAt>=from7).length };
  });
}
function pct(x){ return x==null?"数据不足":Math.round(x*100)+"%"; }

/* ---------- 分析页渲染 ---------- */
function renderAnalyze(){
  const rows=topicRows();
  // 学科概览
  const sum=subjectSummary(), now=Date.now();
  document.getElementById("subjSummary").innerHTML = sum.map(x=>{
    const b=Math.min(100, x.total?Math.round(x.open/x.total*100):0);
    return '<div class="bar-row"><div class="lbl"><span>'+x.icon+" "+x.name+'</span>'+
      '<span style="color:#7b8794">未掌握 '+x.open+" / 共 "+x.total+" · 待复习 "+x.due+'</span></div>'+
      '<div class="bar-track"><i style="width:'+b+'%;background:'+x.color+'"></i></div></div>';
  }).join("");
  const total=state.mistakes.length;
  const new7=state.mistakes.filter(m=>m.createdAt>=now-7*DAY).length;
  const due=state.mistakes.filter(m=>statusOf(m)==="due").length;
  const a30=attemptsIn(30), ind30=a30.filter(r=>r.independent);
  const acc30 = ind30.length? Math.round(ind30.filter(r=>r.ok).length/ind30.length*100)+"%":"数据不足（还没有复测记录）";
  const a7=attemptsIn(7), ind7=a7.filter(r=>r.independent);
  const acc7 = ind7.length? Math.round(ind7.filter(r=>r.ok).length/ind7.length*100)+"%":"数据不足";
  document.getElementById("anStats").innerHTML =
    [["错题总数",total],["近7天新增",new7],["待复习",due],["近7天正确率",acc7],["近30天正确率",acc30]]
    .map(([k,v])=>'<div class="stat-box"><b style="font-size:18px">'+v+'</b><span>'+k+'</span></div>').join("");

  // 趋势
  const snaps=state.snapshots.slice(-14);
  const tb=document.getElementById("trendBox");
  if(snaps.length<2){
    tb.innerHTML='<div class="empty" style="padding:18px">掌握度趋势从今天开始记录，明天起这里会出现 14 天曲线，不虚造历史数据</div>';
  }else{
    const vals=snaps.map(s=>s.mastery==null?0:s.mastery);
    const max=Math.max(40,...vals), min=Math.min(...vals,60);
    const pts=vals.map((v,i)=>{ const x=snaps.length===1?0:i/(snaps.length-1)*100; const y=100-(v-min)/Math.max(1,(max-min))*80-10; return x.toFixed(1)+","+y.toFixed(1); }).join(" ");
    const last=snaps[snaps.length-1], first=snaps[snaps.findIndex(s=>s.mastery!=null)]||snaps[0];
    const delta = last.mastery!=null&&first.mastery!=null ? last.mastery-first.mastery : null;
    tb.innerHTML='<div class="trend-card"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="trend-svg">'+
      '<polyline points="'+pts+'" fill="none" stroke="#1971c2" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'+
      '<div class="small muted">平均掌握度 '+ (last.mastery==null?"—":last.mastery+"分")+
      (delta==null?"":(delta>=0?' ↑ +'+delta:' ↓ '+delta))+' · 已过关 '+last.passed+' / 未掌握 '+last.open+'</div></div>';
  }

  // 知识点排行
  const box=document.getElementById("weakRank");
  if(!rows.length){ box.innerHTML='<div class="empty">还没有错题。录入第一道后，这里按「近期错误 + 复测失败 + 当前掌握度」综合排序，不只看错误总数。</div>'; return; }
  box.innerHTML = rows.map((a,i)=>{
    const s=SUBJECTS.find(x=>x.id===a.subject);
    const lastTxt = !a.last?"<span class='muted'>还没复测过</span>":
      (a.last.ok?'<span style="color:var(--green)">最近 ✓</span>':'<span style="color:var(--red)">最近 ✗</span>');
    return '<div class="weak2">'+
      '<div class="weak2-top"><span class="weak2-name">'+(i<3?'<b class="rk">'+(i+1)+'</b> ':'')+s.icon+" "+esc(a.topic)+'</span>'+
      '<button class="btn-mini" data-train-sub="'+a.subject+'" data-train-topic="'+esc(a.topic)+'">立即练习</button></div>'+
      '<div class="weak2-meta"><span>未掌握 <b>'+a.open+'</b></span><span>累计错 <b>'+a.total+'</b> 次</span>'+
      '<span>7天正确率 <b>'+pct(a.acc7)+'</b></span><span>30天 <b>'+pct(a.acc30)+'</b></span><span>待复习 <b>'+a.due+'</b></span>'+lastTxt+'</div>'+
      '<div class="weak-bar"><i style="width:'+Math.min(100,a.score*4)+'%"></i></div></div>';
  }).join("");
}
document.addEventListener("click", e=>{
  const b=e.target.closest("[data-train-topic]");
  if(!b) return;
  Train.openTopic(b.dataset.trainSub, b.dataset.trainTopic);
});


function renderWeakMini(elId){
  const box=document.getElementById(elId); if(!box) return;
  const rows=topicRows().slice(0,5);
  if(!rows.length){ box.innerHTML='<div class="empty" style="padding:20px">录入错题后这里显示最薄弱知识点</div>'; return; }
  const max=Math.max(1,...rows.map(r=>r.score));
  box.innerHTML=rows.map(function(a,i){
    const sj=SUBJECTS.find(x=>x.id===a.subject);
    var extra = a.fails7 ? ' · 近7天错 '+a.fails7 : '';
    return '<div class="weak-item" style="cursor:pointer" data-train-sub="'+a.subject+'" data-train-topic="'+esc(a.topic)+'">'
      +'<div style="flex:1;min-width:0"><div>'+(i<3?'<b class="rk">'+(i+1)+'</b> ':'')+sj.icon+' '+esc(a.topic)
      +' <small class="muted">未掌握 '+a.open+extra+'</small></div>'
      +'<div class="weak-bar" style="margin-top:5px"><i style="width:'+Math.round(a.score/max*100)+'%"></i></div></div>'
      +'<button class="btn-mini" tabindex="-1">练</button></div>';
  }).join("");
}
