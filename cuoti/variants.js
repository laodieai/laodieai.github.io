/* ============================================================
 * variants.js —— 同类变式训练（基础→同类→进阶→综合）
 * 没有题库/AI：变式题全部人工录入、可编辑，不伪造来源。
 * 独立做对必须写过程/理由，防止凭猜测判掌握。
 * ============================================================ */
const Train = (function(){
  let ctx=null; // {kind:'mistake'|'topic', mistakeId, subject, topic, focusAdd}
  function list(){
    let out=[];
    if(ctx.kind==="mistake"){
      (state.variants[ctx.mistakeId]||[]).forEach(v=>out.push(v));
    }else{
      state.mistakes.filter(m=>m.subject===ctx.subject&&m.topic===ctx.topic).forEach(m=>{
        (state.variants[m.id]||[]).forEach(v=>out.push(Object.assign({mistakeId:m.id},v)));
      });
    }
    TIERS.forEach(t=>out.sort); // noop
    return out.sort((a,b)=>a.tier-b.tier || b.createdAt-a.createdAt);
  }
  function parentMistakeId(){
    if(ctx.kind==="mistake") return ctx.mistakeId;
    const ms=state.mistakes.filter(m=>m.subject===ctx.subject&&m.topic===ctx.topic&&m.stage<STAGE_PASSED);
    return (ms.sort((a,b)=>b.createdAt-a.createdAt)[0]||state.mistakes.find(m=>m.subject===ctx.subject&&m.topic===ctx.topic)||{}).id;
  }
  function vStatus(v){
    if(!v.log||!v.log.length) return {t:"未做", cls:""};
    const l=v.log[v.log.length-1];
    if(l.ok&&l.independent) return {t:"独立做对 ✓", cls:"pass"};
    if(l.ok) return {t:"看答案会", cls:"peek"};
    return {t:"做错 ✗", cls:"fail"};
  }
  function render(){
    const s=SUBJECTS.find(x=>x.id===ctx.subject);
    const vs=list();
    const kinds=SUBJECT_FEATURES[ctx.subject]||["综合"];
    document.getElementById("trainTitle").innerHTML=s.icon+" 同类变式训练 · "+esc(ctx.topic);
    const grouped=TIERS.map(t=>{
      const items=vs.filter(v=>v.tier===t.id);
      return '<div class="vtier"><div class="vtier-head"><b>'+t.id+"级 · "+t.name+'</b><small>'+t.desc+'</small><span class="vtier-n">'+items.length+' 题</span></div>'+
        (items.length?items.map(v=>vCard(v)).join(""):'<div class="vtier-empty">暂无（手动录入，不自动编题）</div>')+'</div>';
    }).join("");
    document.getElementById("trainBody").innerHTML=
      '<div class="train-honest">变式题需要家长或学生按原题仿录（换数字/换问法/换情境）。本站<b>不自动生成、不冒充题库</b>；不同变式题连续独立做对，比重复做同一题更能证明掌握。</div>'+
      grouped+
      '<details class="vadd" '+(ctx.focusAdd?"open":"")+'><summary>＋ 录入一道变式题</summary>'+
        '<label class="field-label">层级与题型</label><div class="vadd-row"><select id="vTier">'+
          TIERS.map(t=>'<option value="'+t.id+'">'+t.id+"级 "+t.name+"</option>").join("")+
        '</select><select id="vKind">'+kinds.map(k=>'<option>'+esc(k)+'</option>').join("")+'</select></div>'+
        '<label class="field-label">题目（把题面/关键条件写清楚）</label><textarea id="vQ" rows="2" placeholder="例：把原题的数字 3 换成 5，再做一遍"></textarea>'+
        '<label class="field-label">标准答案 / 解析</label><textarea id="vA" rows="2" placeholder="写出答案和关键步骤"></textarea>'+
        '<label class="field-label">提示（可选，做不出时再看）</label><input id="vHint" placeholder="例：先配方，常数项加减同一个数">'+
        '<button class="btn-primary" id="vSave" style="margin-top:12px">保存变式题</button></details>';
    bindCardEvents();
    document.getElementById("vSave").onclick=()=>{
      const q=document.getElementById("vQ").value.trim(), a=document.getElementById("vA").value.trim();
      if(!q||!a){ toast("题目和答案都要填"); return; }
      const pid=parentMistakeId(); if(!pid){ toast("找不到关联错题"); return; }
      const v={id:uid("v"), mistakeId:pid, tier:+document.getElementById("vTier").value,
        kind:document.getElementById("vKind").value, q, a,
        hint:document.getElementById("vHint").value.trim(), createdAt:Date.now(), log:[]};
      (state.variants[pid]=state.variants[pid]||[]).push(v);
      save(); render(); toast("变式题已保存，可以开始做");
    };
  }
  function vCard(v){
    const st=vStatus(v);
    return '<div class="vcard" data-vid="'+v.id+'">'+
      '<div class="vcard-head"><span class="tag">'+esc(v.kind||"变式")+'</span><b class="vstatus '+st.cls+'">'+st.t+'</b></div>'+
      '<div class="vq">'+esc(v.q)+'</div>'+
      '<div class="vwork" hidden></div>'+
      '<div class="vgrade" hidden></div>'+
      '<div class="va" hidden><div class="vanswer">✅ 标准答案：<br>'+esc(v.a)+'</div>'+
        (v.hint?'<div class="vhint">💡 '+esc(v.hint)+'</div>':'')+'</div>'+
      '<div class="vbtns">'+
        '<button class="btn-mini v-start">开始计时做题</button>'+
        (v.hint?'<button class="btn-mini ghost v-hint">看提示(<span class="hc">0</span>)</button>':'')+
        '<button class="btn-mini ghost v-del">删除</button></div></div>';
  }
  function bindCardEvents(){
    document.getElementById("trainBody").querySelectorAll(".vcard").forEach(card=>{
      const vid=card.dataset.vid;
      const findV=()=>list().find(x=>x.id===vid) || Object.values(state.variants).flat().find(x=>x.id===vid);
      let t0=0, hints=0;
      card.querySelector(".v-start").onclick=function(){
        if(this.dataset.phase==="grade"){ // 对答案
          card.querySelector(".va").hidden=false;
          const grade=card.querySelector(".vgrade");
          grade.hidden=false;
          grade.innerHTML='<label class="field-label" style="margin-top:8px">独立做对必须写出关键过程/理由（防止蒙对）</label>'+
            '<textarea class="vproc" rows="2" placeholder="写出你的计算过程或解题理由"></textarea>'+
            '<div class="vgrade-btns"><button class="btn-mini ok v-ok">独立做对了</button>'+
            '<button class="btn-mini warn v-peek">看答案才会</button>'+
            '<button class="btn-mini danger v-no">做错了</button></div>';
          this.textContent="已对答案"; this.disabled=true;
          bindGrade(grade, findV, ()=>Date.now()-t0);
        }else{
          t0=Date.now(); this.dataset.phase="grade"; this.textContent="我做完了，对答案";
          card.querySelector(".vwork").hidden=false;
          card.querySelector(".vwork").innerHTML='<span class="muted small">计时中…先在纸上做完，再点对答案</span>';
        }
      };
      const hb=card.querySelector(".v-hint");
      if(hb) hb.onclick=()=>{ hints++; card.querySelector(".hc").textContent=hints;
        card.querySelector(".va").hidden=false; };
      card.querySelector(".v-del").onclick=()=>{
        if(!confirm("删除这道变式题？"))return;
        const pid=(findV()||{}).mistakeId || parentMistakeId();
        if(state.variants[pid]) state.variants[pid]=state.variants[pid].filter(x=>x.id!==vid);
        save(); render();
      };
    });
  }
  function bindGrade(box, findV, msFn){
    box.querySelector(".v-ok").onclick=()=>{
      const proc=box.querySelector(".vproc").value.trim();
      if(proc.length<4){ toast("请写出关键过程或理由再确认做对"); return; }
      grade(findV,{ok:true,independent:true,ms:msFn()}, proc);
    };
    box.querySelector(".v-peek").onclick=()=>grade(findV,{ok:true,independent:false,ms:msFn()}, "");
    box.querySelector(".v-no").onclick=()=>grade(findV,{ok:false,independent:true,ms:msFn()}, "");
  }
  function grade(findV, att, proc){
    const v=findV(); if(!v)return;
    const pid=v.mistakeId, m=state.mistakes.find(x=>x.id===pid);
    v.log=v.log||[]; v.log.push({ok:att.ok,independent:att.independent,hints:att.hints|0,ms:att.ms,at:Date.now(),proc});
    if(m) applyAttempt(m,{kind:"variant",ok:att.ok,independent:att.independent,hints:att.hints|0,ms:att.ms,variantId:v.id});
    else save();
    toast(att.ok&&att.independent?"独立做对，已记录复测 ✅":att.ok?"看答案会：明天再来一遍":"做错了，已缩短复测间隔");
    render(); if(typeof renderToday==="function") renderToday();
  }
  function open(ctx0){
    ctx=ctx0;
    if(!ctx.subject){ const m=state.mistakes.find(x=>x.id===ctx.mistakeId); if(m){ctx.subject=m.subject;ctx.topic=m.topic;} }
    document.getElementById("trainModal").hidden=false;
    render();
  }
  function close(){ document.getElementById("trainModal").hidden=true; }
  return {
    openMistake(id, focusAdd){ open({kind:"mistake", mistakeId:id, focusAdd:!!focusAdd}); },
    openTopic(subject, topic, focusAdd){ open({kind:"topic", subject, topic, focusAdd:!!focusAdd}); },
    close
  };
})();
document.addEventListener("DOMContentLoaded", ()=>{
  const m=document.getElementById("trainModal");
  m.querySelector(".modal-x").onclick=()=>Train.close();
  m.onclick=e=>{ if(e.target.id==="trainModal") Train.close(); };
});
