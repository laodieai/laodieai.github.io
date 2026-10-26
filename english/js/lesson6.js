/* ============================================================
 * lesson6.js —— 每日 60 分钟「六环节」升级版
 * ①复习 ②听力 ③口语跟读 ④单词拼读阅读 ⑤听写书写 ⑥情景对话+测试
 * 不重写旧数据：继续使用 localStorage 的 eng365-v1，只做增量迁移。
 * 发音/录音/识别的原则：不虚构评分，识别失败有兜底，录音不上传。
 * ============================================================ */
(function(){
"use strict";

/* ---------- 六环节定义 ---------- */
var KEYS = ["review","listen","speak","words","write","test"];
var META = {
  review: {num:1, title:"复习旧知识", min:5},
  listen: {num:2, title:"听力训练", min:10},
  speak:  {num:3, title:"口语与跟读", min:15},
  words:  {num:4, title:"单词 · 拼读 · 阅读", min:10},
  write:  {num:5, title:"听写与书写", min:10},
  test:   {num:6, title:"情景对话与当天测试", min:10}
};

function l6prog(day){
  if(!S.lessonProgress) S.lessonProgress = {};
  var p = S.lessonProgress[day];
  if(!p){ p = {stages:{}, write:{}, speak:0, startedAt:Date.now()}; S.lessonProgress[day] = p; save(); }
  return p;
}
function l6stageDone(p, key, dayCompleted){
  return !!(p.stages[key] || (key==="test" && dayCompleted));
}
function l6count(day){
  var p = S.lessonProgress[day] || {stages:{}};
  var dc = !!S.completedDays[day];
  return KEYS.filter(function(k){ return l6stageDone(p,k,dc); }).length;
}
function markStage(day, key, on){
  var p = l6prog(day);
  p.stages[key] = !!on;
  save();
  updateL6Chrome(day);
}
/* 更新页面上的环节进度条/卡片状态，不整页重绘（避免清空正在输入的答案） */
function updateL6Chrome(day){
  var n = l6count(day);
  document.querySelectorAll(".l6-sec").forEach(function(sec){
    var k = sec.getAttribute("data-stage-key");
    var p = S.lessonProgress[day] || {stages:{}};
    var on = l6stageDone(p, k, !!S.completedDays[day]);
    sec.classList.toggle("l6-done", on);
    var b = sec.querySelector(".l6-check");
    if(b){ b.classList.toggle("on", on); b.textContent = on ? "✓ 已完成" : "标记完成"; }
  });
  var bar = document.getElementById("l6Bar"), txt = document.getElementById("l6Count");
  if(bar) bar.style.width = (n/6*100)+"%";
  if(txt) txt.textContent = n + "/6";
  document.querySelectorAll(".l6-navdot").forEach(function(d){
    d.classList.toggle("on", KEYS.slice(0,n).indexOf(d.dataset.key)>=0);
  });
}

/* ---------- 确定性随机（同一天题目稳定，不刷新就变） ---------- */
function seeded(seed){
  var t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    var r = Math.imul(t ^ (t>>>15), 1|t);
    r ^= r + Math.imul(r ^ (r>>>7), 61|r);
    return ((r ^ (r>>>14))>>>0) / 4294967296;
  };
}
function shuffleR(arr, rnd){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(rnd()*(i+1)); var x=a[i]; a[i]=a[j]; a[j]=x; }
  return a;
}

/* ---------- 句子素材池：从当天句型/例句/听力中抽取 ---------- */
function sentencePool(L){
  var out=[], seen={};
  function push(en, cn){
    en=(en||"").trim(); cn=(cn||"").trim();
    if(en.indexOf("→")>=0) en=en.split("→").pop().trim();
    var k=en.toLowerCase();
    if(!/[a-z]/i.test(en) || en.length<5 || seen[k]) return;
    seen[k]=1; out.push({en:en, cn:cn});
  }
  ((L.grammar && L.grammar.examples)||[]).forEach(function(x){ push(x[0], x[1]); });
  (L.vocab||[]).forEach(function(v){ push(v.ex, v.exCn); });
  (L.listening||[]).forEach(function(d){ if(d.say && d.say.indexOf(" ")>=0) push(d.say, d.cn); });
  return out;
}

/* ---------- 环节5：听写题组（A 单词 / B 句子 / C 中译英 / D 拼写语法） ---------- */
function buildDictation(day, L){
  var items=[];
  var words = shuffleR((L.vocab||[]), seeded(day*7919+101));
  words.slice(0,2).forEach(function(v){
    items.push({kind:"word", label:"A · 单词听写", audio:v.w, answer:v.w, cn:v.cn||""});
  });
  var pool = shuffleR(sentencePool(L), seeded(day*104729+7));
  if(pool[0]) items.push({kind:"sentence", label:"B · 句子听写", audio:pool[0].en, answer:pool[0].en, cn:pool[0].cn});
  if(pool[1]) items.push({kind:"cn2en",   label:"C · 中译英", prompt:pool[1].cn, answer:pool[1].en, audio:pool[1].en});
  if(pool[2]) items.push({kind:"flex",    label:"D · 拼写与语法", audio:pool[2].en, answer:pool[2].en, cn:pool[2].cn});
  return items;
}

var CONTRACT = {"i'm":"i am","you're":"you are","he's":"he is","she's":"she is","it's":"it is",
  "we're":"we are","they're":"they are","that's":"that is","what's":"what is","where's":"where is",
  "who's":"who is","here's":"here is","don't":"do not","doesn't":"does not","didn't":"did not",
  "can't":"can not","won't":"will not","isn't":"is not","aren't":"are not","wasn't":"was not",
  "weren't":"were not","i'll":"i will","i've":"i have","let's":"let us","i'd":"i would"};
var STOP = {i:1,you:1,he:1,she:1,it:1,we:1,they:1,am:1,is:1,are:1,was:1,were:1,be:1,
  a:1,an:1,the:1,to:1,of:1,in:1,on:1,at:1,and:1,or:1,but:1,my:1,your:1,me:1,do:1,does:1};

function canonTokens(s){
  var t = s.toLowerCase().replace(/[’‘]/g,"'").trim();
  Object.keys(CONTRACT).forEach(function(k){ t=t.split(k).join(" "+CONTRACT[k]+" "); });
  return t.replace(/[.,!?;:"“”()（）…—-]/g," ").replace(/[^a-z'\s]/g," ")
          .replace(/'/g,"").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
}
function lev(a,b){
  var m=a.length,n=b.length,d=[],i,j;
  if(!m) return n; if(!n) return m;
  for(i=0;i<=m;i++) d[i]=[i];
  for(j=0;j<=n;j++) d[0][j]=j;
  for(i=1;i<=m;i++) for(j=1;j<=n;j++){
    d[i][j]=Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  }
  return d[m][n];
}

/* 校对：忽略首尾空格；大小写/标点/缩写等价；给逐词问题；自由表达按实词覆盖率接受 */
function gradeWriting(item, raw){
  var orig = raw.replace(/^\s+|\s+$/g,"").replace(/\s+/g," ");
  if(!orig) return {status:"empty", notes:[]};
  var ans = item.answer.trim().replace(/\s+/g," ");
  var notes=[];
  if(orig === ans) return {status:"perfect", notes:[]};
  if(orig.toLowerCase() === ans.toLowerCase())
    notes.push({t:"case", text:"大小写不同（不影响意思，已算对）。标准答案："+ans});
  var stripPunct = function(s){ return s.toLowerCase().replace(/[^a-z0-9\s']/g,"").replace(/\s+/g," ").trim(); };
  if(!notes.length && stripPunct(orig)===stripPunct(ans))
    notes.push({t:"punct", text:"只有标点/空格不同，已算对。请对照标准答案检查标点。"});
  var ref = canonTokens(ans), got = canonTokens(orig);
  var sameArr = ref.length===got.length && ref.every(function(w,i){ return w===got[i]; });
  if(sameArr) return {status:"minor", notes:notes.length?notes:[{t:"ok", text:"写法不同但答案等价，已算对。"}]};

  var refBag={}; ref.forEach(function(w){ refBag[w]=(refBag[w]||0)+1; });
  got.forEach(function(w){ if(refBag[w]>0) refBag[w]--; });
  var missing=[]; Object.keys(refBag).forEach(function(w){ for(var k=0;k<refBag[w];k++) missing.push(w); });
  var gotBag={}; got.forEach(function(w){ gotBag[w]=(gotBag[w]||0)+1; });
  ref.forEach(function(w){ if(gotBag[w]>0) gotBag[w]--; });
  var extra=[]; Object.keys(gotBag).forEach(function(w){ for(var k=0;k<gotBag[w];k++) extra.push(w); });

  var usedMissing={}, spellNotes=[];
  extra.forEach(function(w){
    var best=-1, bd=3;
    missing.forEach(function(m,mi){
      if(usedMissing[mi]) return;
      var d=lev(w,m); if(d<bd){ bd=d; best=mi; }
    });
    if(best>=0){ usedMissing[best]=1; spellNotes.push({t:"spell", text:"拼写疑似有误：「"+w+"」应改为「"+missing[best]+"」"}); }
  });
  missing.forEach(function(m,mi){ if(!usedMissing[mi]) notes.push({t:"missing", text:"漏掉了词：「"+m+"」"}); });
  var usedWords={}; Object.keys(usedMissing).forEach(function(mi){ usedWords[missing[mi]]=1; });
  extra.forEach(function(w){ if(!usedWords[w]) notes.push({t:"extra", text:"多出来的词：「"+w+"」"}); });
  notes = spellNotes.concat(notes);

  var contentRef = ref.filter(function(w){ return !STOP[w]; });
  var gotSet={}; got.forEach(function(w){ gotSet[w]=1; });
  var cov = contentRef.length ? contentRef.filter(function(w){ return gotSet[w]; }).length/contentRef.length : 1;
  var near = spellNotes.length;
  if((item.kind==="cn2en"||item.kind==="flex") && cov>=0.85 && near<=1 && (missing.length-near)<=1){
    return {status:"minor", notes:[{t:"natural", text:"意思基本正确，更自然的标准写法是："+ans}].concat(notes)};
  }
  return {status:"wrong", notes:notes.length?notes:[{t:"wrong", text:"和标准答案差别较大，再听/再看中文后点「再答一次」。"}]};
}

/* ---------- 旧区块 markup（从原 renderLesson 平移，保持视觉一致） ---------- */
function phonicsHTML(L){
  var groups = (L.phonics && L.phonics.groups||[]).map(function(g){
    return '<div class="sound-group"><div class="sound-group-head">'+esc(g.name)+
      '<button class="btn btn-outline btn-sm" style="margin-left:auto" data-say="'+
      esc(g.items.map(function(it){ return pickSpeakText(it[0],it[1]); }).join(" … "))+
      '" data-rate="0.85" data-follow=".sound-item"><i data-lucide="play"></i>整组慢读</button></div>'+
      '<div class="sound-items">'+g.items.map(function(it){
        var w=it[0],rest=it[1],sub=it[2],sub2=it[3];
        var sayText=pickSpeakText(w,rest);
        if(sub!==undefined){
          return '<span class="sound-item wide"><span class="si-top"><b>'+esc(w)+'</b><span class="ipa">'+esc(rest||"")+'</span>'+speakBtn(sayText,0.7)+'</span><span class="si-sub pos">'+esc(sub)+'</span>'+(sub2!==undefined?'<span class="si-sub">'+esc(sub2)+'</span>':"")+'</span>';
        }
        return '<span class="sound-item"><b>'+esc(w)+'</b>'+(rest?'<span class="ipa">'+esc(rest)+'</span>':"")+speakBtn(sayText,0.7)+'</span>';
      }).join("")+'</div></div>';
  }).join("");
  var tips = (L.phonics && L.phonics.tips||[]).map(function(t){ return '<div class="tip-box"><b>提示</b> · '+esc(t)+'</div>'; }).join("");
  return '<p class="phonics-intro">'+esc(L.phonics.intro)+'</p>'+groups+tips;
}
function vocabHTML(L){
  return '<div class="grid grid-2">'+(L.vocab||[]).map(function(v){
    var learned = S.vocab[v.w] ? '<span class="tag green">已入库</span>' : "";
    return '<div class="vocab-card"><div class="vocab-top"><span class="vocab-word">'+esc(v.w)+'</span>'+
      '<span class="vocab-ipa">'+esc(v.ipa||"")+'</span><span class="vocab-cn">'+esc(v.cn)+'</span>'+learned+speakBtn(v.w,0.8)+'</div>'+
      (v.tip?'<div class="vocab-tip">发音提示 · '+esc(v.tip)+'</div>':"")+
      (v.ex?'<div class="vocab-ex"><div class="vocab-ex-en">'+esc(v.ex)+speakBtn(v.ex,0.8)+'</div>'+
      '<div class="vocab-ex-cn">'+esc(v.exCn||"")+'</div></div>':"")+'</div>';
  }).join("")+'</div>';
}
function grammarHTML(L){
  var rows = (L.grammar && L.grammar.examples||[]).map(function(pair){
    var en=pair[0],cn=pair[1];
    return '<div class="ex-row"><div><div class="ex-en">'+esc(en)+'</div><div class="ex-cn">'+esc(cn)+'</div></div>'+
      speakBtn(en.indexOf("→")>=0?en.split("→").pop().trim():en,0.85)+'</div>';
  }).join("");
  return '<div class="rule-box"><b>'+esc(L.grammar.title)+'</b><br>'+esc(L.grammar.rule)+'</div>'+rows;
}
function listeningHTML(L){
  return '<div class="tip-box" style="background:var(--blue-soft);border-color:#c9dafc;color:#1e3f8f;margin-top:0"><b>练法</b> · 先点喇叭<b>盲听</b>（别看英文）→ 在心里说出中文意思 → 再点「显示原文」对照 → 没听出来的地方重播 2 遍。</div>'+
    (L.listening||[]).map(function(d){
      return '<div class="drill"><div class="drill-top">'+speakBtn(d.say,0.78)+
        '<span class="muted small">'+esc(d.cn||"")+'</span>'+
        '<button class="reveal-btn" style="margin-left:auto" data-reveal>显示原文</button></div>'+
        '<div class="drill-answer"><b>'+esc(d.show)+'</b></div></div>';
    }).join("");
}

/* ---------- 环节3：口语卡片（录音对照 + 识别自检 + 键盘兜底） ---------- */
function speakingHTML(day, L){
  var intro = '<div class="tip-box l6-honest" style="margin-top:0"><b>说实话</b> · 浏览器语音识别只能把声音转成文字，'+
    '<b>不能判定单个音素、重音和声调</b>，所以本站不提供虚假的“发音 95 分”。练法：听原声 → 录音 → 回放自己的录音与原声对比 → 用自检看哪些词没被识别到 → 再来一遍。</div>';
  return intro + (L.speaking||[]).map(function(q,i){
    var target = cleanRefText(q.hint);
    return '<div class="qa-card l6-speak" data-day="'+day+'" data-i="'+i+'">'+
      '<div class="qa-q">'+speakBtn(q.q,0.8)+esc(q.q)+'</div>'+
      '<div class="qa-hint">参考回答 · <b>'+esc(q.hint)+'</b></div>'+
      '<div class="l6-rec"><div class="l6-rec-title"><i data-lucide="mic-2"></i>录音对照（录音只在本机临时播放，不上传、不长期保存）</div>'+
      '<div class="l6-rec-btns">'+
        '<button class="mic-btn l6-model" data-say="'+esc(target)+'" data-rate="0.78"><i data-lucide="volume-2"></i>听原声</button>'+
        '<button class="mic-btn" data-rec="start"><i data-lucide="circle"></i>开始录音</button>'+
        '<button class="mic-btn" data-rec="stop" disabled>停止</button>'+
        '<button class="mic-btn" data-rec="reset" disabled>重录</button>'+
        '<button class="mic-btn" data-rec="play" disabled><i data-lucide="play"></i>我的录音</button>'+
        '<button class="mic-btn" data-rec="del" disabled>删除</button>'+
      '</div><div class="l6-rec-status small muted">先听原声，再点「开始录音」。</div>'+
      '<audio class="l6-rec-audio" controls hidden></audio></div>'+
      '<div class="l6-self"><button class="mic-btn" data-mic2="'+esc(target)+'"><i data-lucide="mic"></i>麦克风跟读自检</button>'+
      '<div class="l6-kb"><input class="l6-in" placeholder="识别不可用/权限被拒？在这里输入你说的英文做文本对照">'+
      '<button class="mic-btn" data-saycheck="'+esc(target)+'">文本对照</button></div>'+
      '<div class="mic-result l6-sr"></div></div></div>';
  }).join("");
}

/* 识别/输入 → 诚实的逐词反馈 */
function speechFeedback(target, said){
  var tw = canonTokens(target);
  var saidSet={}; canonTokens(said).forEach(function(w){ saidSet[w]=1; });
  var content = tw.filter(function(w){ return !STOP[w]; });
  var hit = content.filter(function(w){ return saidSet[w]; }).length;
  var pct = content.length ? hit/content.length : 1;
  var chips = tw.map(function(w){
    var on = saidSet[w];
    return '<span class="l6-chip '+(on?"hit":"miss")+'">'+esc(w)+(on?" ✓":"")+'</span>'+(on?"":speakBtn(w,0.75));
  }).join(" ");
  var head = '<div class="l6-fb-head">🔎 语音识别自检结果（<b>不是发音评分</b>）</div>'+
    '<div class="small muted">识别器只能把声音转成文字，无法判断音素、声调和重音；即使全部命中，也不代表发音完全标准。</div>'+
    '<div class="l6-chips">'+chips+'</div>';
  var tail;
  if(pct>=1) tail = '<div class="l6-fb-ok">每个词都被识别到了 ✅ 再跟原声对比一下<b>重音和节奏</b>，然后不看文字再说一遍。</div>';
  else if(pct>=0.5) tail = '<div class="l6-fb-mid">有词没被识别清楚（红色）。点词旁边的喇叭再听，模仿口型后重新自检。</div>';
  else tail = '<div class="l6-fb-bad">识别到的内容和目标差别较大：你说的是「'+esc(said)+'」。先慢速听 3 遍原声，逐词跟读再试。</div>';
  return head+tail;
}

/* ---------- 环节5：听写 UI ---------- */
function writingHTML(day, L){
  var items = buildDictation(day,L);
  l6prog(day)._items = items.length;
  if(!items.length) return '<div class="empty">今天以测试为主，听写可去复习中心做复习测验。</div>';
  var p = l6prog(day);
  var body = items.map(function(it,idx){
    var rec = p.write["i"+idx];
    var passed = rec && rec.status!=="wrong";
    var head;
    if(it.kind==="cn2en"){
      head = '<b class="l6-dic-cn">'+esc(it.prompt||"")+'</b><span class="small muted">请写出英文（意思对即可，标点大小写不苛求）</span>';
    }else{
      head = speakBtn(it.audio,0.78)+
        '<button class="mic-btn btn-sm2" data-say="'+esc(it.audio)+'" data-rate="0.7"><i data-lucide="volume-2"></i>再听一遍</button>'+
        '<span class="small muted">'+(it.kind==="flex"?"大小写、标点、缩写（I'm / I am）不同都算对":"听完写下来，可反复听")+'</span>';
    }
    var mid;
    if(passed){
      mid = '<div class="l6-dic-pass"><span class="tag green">✓ 已掌握</span> 标准答案：<b>'+esc(it.answer)+'</b> '+speakBtn(it.answer,0.8)+'</div>';
    }else{
      mid = '<div class="l6-dic-row"><input class="l6-in dic-in" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="在这里输入英文，回车提交">'+
        '<button class="btn btn-brand btn-sm" data-dic="check" data-idx="'+idx+'">提交</button>'+
        (rec&&rec.status==="wrong"?'<button class="btn btn-outline btn-sm" data-dic="retry" data-idx="'+idx+'">清空重答</button>':"")+'</div>';
    }
    return '<div class="l6-dic" data-idx="'+idx+'"><div class="l6-dic-head"><span class="tag brand">'+esc(it.label)+'</span>'+head+'</div>'+mid+
      '<div class="l6-dic-fb"></div></div>';
  }).join("");
  var allPass = items.filter(function(it,idx){ var r=p.write["i"+idx]; return r && r.status!=="wrong"; }).length === items.length;
  return '<div class="flex-between l6-write-head"><span class="small muted">四种练习：单词听写、句子听写、中译英、拼写语法。错题自动进错题本，可以反复作答直到掌握。</span>'+
    '<button class="btn btn-outline btn-sm" data-ai-write><i data-lucide="sparkles"></i>AI 精细批改</button></div>'+
    body +
    '<div class="l6-write-progress small">'+(allPass?'<b class="l6-green">今天听写全部完成 ✓</b>':'完成情况：'+items.filter(function(it,idx){ var r=p.write["i"+idx]; return r&&r.status!=="wrong"; }).length+'/'+items.length)+'</div>';
}

/* ---------- 环节1 复习 / 环节6 对话与测试 ---------- */
function reviewHTML(day){
  var due = dueVocab();
  if(due.length){
    return '<p class="muted small" style="margin-top:0">按间隔重复安排（第 1/2/3/7/14/30 天），今天有 <b>'+due.length+'</b> 个旧词到期。先去复习中心做完测验，再回来继续。</p>'+
      due.slice(0,8).map(function(v){
        return '<div class="row-item" style="padding-left:0;padding-right:0"><div class="row-main">'+
          '<div class="row-title">'+esc(v.w)+' <span class="vocab-ipa">'+esc(v.ipa||"")+'</span></div>'+
          '<div class="row-sub">'+esc(v.cn)+'</div></div><div class="row-side">'+speakBtn(v.w)+'</div></div>';
      }).join("")+
      (due.length>8?'<div class="muted small mt8">还有 '+(due.length-8)+' 个在复习中心…</div>':"")+
      '<div class="mt14"><button class="btn btn-brand btn-sm" onclick="go(\'review\')"><i data-lucide="repeat"></i>开始今日复习</button></div>';
  }
  return '<div class="empty"><i data-lucide="check-circle-2"></i><div>今天没有到期复习</div>'+
    '<div class="small muted">新单词会在明天自动进入复习队列。可以点喇叭把昨天的单词再过一遍。</div></div>';
}
function dialogueHTML(L){
  var cards = (L.speaking||[]).map(function(q){
    return '<div class="l6-dlg-item"><div class="l6-dlg-q">'+speakBtn(q.q,0.82)+'<span>'+esc(q.q)+'</span></div>'+
      '<button class="reveal-btn" data-reveal>显示参考回答</button><div class="l6-dlg-a">'+esc(q.hint)+'</div></div>';
  }).join("");
  return '<div class="small muted l6-dlg-tip">情景脚本：先扮演回答者，听问题 → 口头回答 → 对照参考回答；熟练后不看参考回答直接说。</div>'+cards;
}
function aiChatHTML(day){
  var on = !!(window.EngAI && EngAI.configured);
  if(!on){
    return '<div class="l6-ai"><div class="l6-ai-head"><i data-lucide="bot"></i><b>AI 情景对话</b><span class="tag amber">尚未配置</span></div>'+
      '<div class="small muted">基础课程不需要 AI 也能全部完成。配置自建后端后，这里会出现中英双语对话陪练。</div>'+
      '<details class="l6-ai-guide"><summary>如何配置（不会把密钥放进网页）</summary><pre>'+esc(window.EngAI?EngAI.guide:"")+'</pre></details></div>';
  }
  return '<div class="l6-ai" id="l6Ai" data-day="'+day+'"><div class="l6-ai-head"><i data-lucide="bot"></i><b>AI 情景对话</b>'+
    '<div class="l6-ai-modes"><button class="l6-ai-mode active" data-ai="mode" data-mode="bilingual">中英辅助</button>'+
    '<button class="l6-ai-mode" data-ai="mode" data-mode="english">纯英语</button></div></div>'+
    '<div class="l6-ai-msgs"></div><div class="l6-ai-input"><input class="l6-in" placeholder="用英语回答，不会的词可以夹中文">'+
    '<button class="btn btn-brand btn-sm" data-ai="send"><i data-lucide="send"></i>发送</button></div></div>';
}
function daySummaryHTML(day){
  var rec = S.completedDays[day];
  if(!rec) return "";
  var p = S.lessonProgress[day] || {};
  var L = getLesson(day) || {};
  var mainTest = S.tests.filter(function(t){ return t.day===day && ["daily","weekly","monthly","stage","final"].indexOf(t.type)>=0; }).pop();
  var writing = S.tests.filter(function(t){ return t.day===day && t.type==="writing"; }).pop();
  var nexts = Object.values(S.vocab).map(function(v){ return v.next; }).sort();
  var minutes = p.minutes ? p.minutes + " 分钟（从打开课程页起算）" : "—";
  return '<div class="card card-pad l6-summary mt14"><div class="sec-title"><i data-lucide="party-popper"></i>今日学习总结</div>'+
    '<div class="grid grid-4 l6-sum-grid">'+
      '<div><div class="stat-label">学习时长</div><div class="stat-value" style="font-size:18px">'+esc(minutes)+'</div></div>'+
      '<div><div class="stat-label">新学单词</div><div class="stat-value" style="font-size:18px">'+((L.vocab||[]).length)+'</div></div>'+
      '<div><div class="stat-label">测试成绩</div><div class="stat-value" style="font-size:18px">'+(mainTest?mainTest.pct+" 分":"—")+'</div></div>'+
      '<div><div class="stat-label">听写成绩</div><div class="stat-value" style="font-size:18px">'+(writing?writing.pct+" 分":"—")+'</div></div>'+
    '</div>'+
    '<div class="small muted mt8">开口自检/录音 '+((p.speak||0))+' 次 · 下次复习：'+(nexts[0]||"明天")+' · 错题可在「错题本」重练。</div></div>';
}

/* ---------- 课程页总装 ---------- */
window.renderLesson = function(day){
  var info = DAY_MAP[day-1];
  var L = getLesson(day);
  var stage = STAGES[info.stage-1];
  var done = S.completedDays[day];
  if(!L) return renderOutlineLesson(day, info, stage, done);
  var p = l6prog(day);
  var n = l6count(day);

  var nav = KEYS.map(function(k){
    return '<button class="l6-navdot'+(l6stageDone(p,k,!!done)?" on":"")+'" data-key="'+k+'" data-goto="sec-'+k+'">'+META[k].num+" "+META[k].title+'</button>';
  }).join("");

  function sec(key, extraHead, body){
    var m=META[key], on=l6stageDone(p,key,!!done);
    return '<div class="card lesson-sec l6-sec '+(on?"l6-done":"")+'" id="sec-'+key+'" data-stage-key="'+key+'">'+
      '<div class="lesson-sec-head l6-head"><span class="lesson-sec-num">'+m.num+'</span>'+
      '<span class="lesson-sec-title">'+m.title+'</span>'+(extraHead||"")+
      '<span class="lesson-sec-min">约 '+m.min+' 分钟</span>'+
      '<button class="l6-check '+(on?"on":"")+'" data-stage-toggle="'+key+'">'+(on?"✓ 已完成":"标记完成")+'</button></div>'+
      '<div class="lesson-sec-body">'+body+'</div></div>';
  }

  var readBtn = '<button class="btn btn-brand" onclick="readWholePage(this)"><i data-lucide="audio-lines"></i>整页慢读（再点停止）</button>';
  var s1 = sec("review", "", reviewHTML(day));
  var s2 = sec("listen", '<button class="btn btn-outline btn-sm l6-head-btn" data-say="'+esc((L.listening||[]).map(function(d){return d.say;}).join(" … "))+'" data-rate="0.78" data-follow=".drill"><i data-lucide="play"></i>整段听力</button>', listeningHTML(L));
  var s3 = sec("speak", "", speakingHTML(day,L));
  var s4body =
    '<div class="tip-box" style="background:var(--brand-soft);border-color:#bfe7e2;color:var(--brand-deep);margin-top:0"><b>音标 ≠ 自然拼读</b> · 音标（如 /ˈæpəl/）是字典里的注音符号；自然拼读是“字母拼写和发音的规律”（例如字母 a 在 cat 里常读 /æ/）。两者配合用，不是一回事。</div>'+
    (L.phonics?phonicsHTML(L):"")+
    '<div class="l6-sub-title">今日单词（点喇叭听美式发音）</div>'+vocabHTML(L)+
    '<div class="l6-sub-title">句型</div>'+grammarHTML(L)+
    '<div class="l6-sub-title">迷你阅读（用今天的词和句型组成）<button class="reveal-btn" style="margin-left:8px" data-reveal-all>显示/隐藏全部中文</button></div>'+
    readingHTML(L);
  var s4 = sec("words", "", s4body);
  var s5 = sec("write", "", writingHTML(day,L));
  var s6body = dialogueHTML(L)+aiChatHTML(day)+
    '<div class="l6-sub-title">当天小测试（听力/词汇/句型，错题自动进错题本）</div>'+
    '<div id="quizBox"><div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<p class="muted" style="margin:0">六个环节都完成后开始测试。提交即打卡，成绩计入能力报告。</p>'+
    '<button class="btn btn-brand" onclick="startQuiz('+day+')"><i data-lucide="play"></i>开始测试</button></div></div>'+
    daySummaryHTML(day);
  var s6 = sec("test", "", s6body);

  return ''+
  '<div class="card card-pad l6-hero-sec">'+
    '<div class="muted small">'+esc(stage.name)+' · '+esc(stage.title)+(done?' · <span class="tag green">已完成 · '+(done.score!=null?"测试 "+done.score+" 分":"已打卡")+'</span>':"")+'</div>'+
    '<h1 style="font-size:22px;margin:4px 0 6px">Day '+day+' · '+esc(L.title)+'</h1>'+
    '<div class="muted">'+esc(L.goal)+'</div>'+
    '<div class="l6-progress"><div class="l6-progress-bar"><div id="l6Bar" style="width:'+(n/6*100)+'%"></div></div>'+
    '<span class="small">今日环节 <b id="l6Count">'+n+'/6</b> · 共约 60 分钟</span></div>'+
    '<div class="plan-row mt14">'+(L.plan||[]).map(function(x){return '<span class="plan-chip"><i data-lucide="clock"></i>'+esc(x[0])+' <b>'+x[1]+' 分钟</b></span>';}).join("")+'</div>'+
    '<div class="mt14">'+readBtn+'</div>'+
  '</div>'+
  '<div class="l6-nav">'+nav+'</div>'+
  s1+s2+s3+s4+s5+s6;
};
function readingHTML(L){
  var pool = sentencePool(L).slice(0,4);
  if(!pool.length) return '<div class="empty">暂无阅读句</div>';
  return pool.map(function(s){
    return '<div class="l6-read-item"><div class="ex-en">'+speakBtn(s.en,0.85)+esc(s.en)+'</div>'+
      '<button class="reveal-btn" data-reveal>显示中文</button><div class="ex-cn l6-cn">'+esc(s.cn)+'</div></div>';
  }).join("");
}

/* ---------- 首页：真实六环节进度 + 薄弱点 + 今日总结 ---------- */
window.renderDashboard = function(){
  var day = S.currentDay;
  var info = DAY_MAP[day-1];
  var lesson = getLesson(day);
  var stage = STAGES[info.stage-1];
  var due = dueVocab();
  var errs = activeErrors();
  var done = Object.keys(S.completedDays).length;
  var ab = abilityAll();
  var avgTest = S.tests.length ? Math.round(S.tests.reduce(function(a,t){return a+t.pct;},0)/S.tests.length) : null;
  var n = l6count(day);
  var todayDoneDay = null;
  Object.keys(S.completedDays).forEach(function(d){ if(S.completedDays[d].date===todayStr()) todayDoneDay=+d; });
  var finishedToday = todayDoneDay!=null;

  var dots = KEYS.map(function(k){
    return '<button class="l6-dash-dot '+(n>KEYS.indexOf(k)?"on":"")+'" onclick="go(\'lesson\','+day+')"><span>'+META[k].num+'</span>'+META[k].title+'</button>';
  }).join("");

  var dueList = due.slice(0,6).map(function(v){
    return '<div class="row-item"><div class="row-main"><div class="row-title">'+esc(v.w)+' <span class="vocab-ipa">'+esc(v.ipa||"")+'</span></div>'+
      '<div class="row-sub">'+esc(v.cn)+' · Day '+v.day+' 学习 · 第 '+(v.stage+1)+' 轮复习</div></div>'+
      '<div class="row-side">'+speakBtn(v.w)+'</div></div>';
  }).join("");

  var weak={};
  errs.forEach(function(e){ weak[e.cat]=(weak[e.cat]||0)+1; });
  var weakRows = Object.keys(weak).sort(function(a,b){return weak[b]-weak[a];}).slice(0,3).map(function(c){
    return '<div class="row-item"><div class="row-main"><div class="row-title"><span class="tag amber">'+esc(c)+'</span> 错误 '+weak[c]+' 次</div>'+
      '<div class="row-sub">建议先到错题本重练，再学新内容</div></div>'+
      '<div class="row-side"><button class="btn btn-outline btn-sm" onclick="go(\'errors\')">去重练</button></div></div>';
  }).join("");

  return ''+
  '<div class="hero"><div class="hero-day">'+esc(stage.name)+' · '+esc(stage.title)+' · 已完成 '+done+'/365 天</div>'+
    '<div class="hero-title">Day '+day+' · '+esc(info.title)+'</div>'+
    '<div class="hero-goal">'+esc(lesson?lesson.goal:"按阶段框架学习，完成间隔复习与打卡。")+'</div>'+
    '<div class="l6-hero-progress"><div class="l6-progress-bar light"><div style="width:'+(n/6*100)+'%"></div></div><span>今日六环节 '+n+'/6</span></div>'+
    '<div class="l6-dash-dots">'+dots+'</div>'+
    '<div class="hero-actions"><button class="btn btn-primary" onclick="go(\'lesson\','+day+')"><i data-lucide="play"></i>'+
      (finishedToday?"复习/查看 Day "+day:n===0?"开始今天英语（60 分钟）":"继续学习（"+n+"/6）")+'</button>'+
      '<button class="btn btn-ghost" onclick="go(\'review\')"><i data-lucide="repeat"></i>今日复习 '+ (due.length?"("+due.length+")":"")+'</button></div></div>'+

  (finishedToday ? daySummaryHTML(todayDoneDay) : "")+

  '<div class="grid grid-4 mt14">'+
    '<div class="card stat"><div class="stat-label"><i data-lucide="flame"></i>连续学习</div><div class="stat-value">'+S.streak+' <span class="stat-sub">天</span></div><div class="stat-sub">断了也没关系，接着 Day '+day+' 继续</div></div>'+
    '<div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成课程</div><div class="stat-value">'+done+' <span class="stat-sub">/ 365</span></div><div class="stat-sub">第 '+stage.range[0]+'–'+stage.range[1]+' 天为当前阶段</div></div>'+
    '<div class="card stat"><div class="stat-label"><i data-lucide="book-open"></i>已学词汇</div><div class="stat-value">'+Object.keys(S.vocab).length+'</div><div class="stat-sub">到期待复习 '+due.length+' 个</div></div>'+
    '<div class="card stat"><div class="stat-label"><i data-lucide="target"></i>测试平均分</div><div class="stat-value">'+(avgTest==null?"—":avgTest)+'</div><div class="stat-sub">共 '+S.tests.length+' 次测试 · 错题 '+errs.length+' 条</div></div>'+
  '</div>'+

  '<div class="grid grid-2 mt14">'+
    '<div class="card card-pad"><div class="sec-title"><i data-lucide="activity"></i>七项能力<span class="tag brand">能力曲线</span></div>'+renderRadar(ab)+'</div>'+
    '<div class="card"><div class="card-pad" style="padding-bottom:8px"><div class="sec-title"><i data-lucide="repeat"></i>今日待复习<span class="tag '+(due.length?"amber":"green")+'">'+(due.length?due.length+" 个到期":"全部完成")+'</span></div></div>'+
      (due.length ? dueList+'<div class="card-pad flex" style="padding-top:10px;gap:8px"><button class="btn btn-outline btn-sm" data-say="'+esc(due.slice(0,6).map(function(v){return v.w;}).join(" … "))+'" data-rate="0.85" data-follow=".row-item"><i data-lucide="play"></i>朗读全部</button><button class="btn btn-brand btn-sm" onclick="go(\'review\')"><i data-lucide="arrow-right"></i>去复习</button></div>'
        : '<div class="empty"><i data-lucide="check-circle-2"></i><div>今天没有到期的复习任务</div><div class="small muted">完成今日课程后，新单词会自动进入复习队列</div></div>')+'</div>'+
  '</div>'+

  (weakRows ? '<div class="card mt14"><div class="card-pad" style="padding-bottom:6px"><div class="sec-title"><i data-lucide="alert-triangle"></i>最近错误较多的知识点</div></div>'+weakRows+'</div>' : "");
};

/* ---------- 打卡时记录六环节完成与学习时长 ---------- */
var _completeDay6 = window.completeDay;
window.completeDay = function(day, info){
  _completeDay6(day, info);
  try{
    var p=l6prog(day);
    p.stages.test=true;
    p.finishedAt=Date.now();
    if(p.startedAt) p.minutes=Math.max(1,Math.round((p.finishedAt-p.startedAt)/60000));
    save();
  }catch(e){}
};

/* ---------- 渲染后增强：数据管理加「清除」；书写测试中文名 ---------- */
var _render6 = window.render;
window.render = function(){
  _render6();
  try{
    if(document.querySelector("#l6Ai")){
      if(aiChat.day!==LESSON_DAY){ aiChat.day=LESSON_DAY; aiChat.messages=[]; }
      aiRender();
    }
    document.querySelectorAll("td").forEach(function(td){ if(td.textContent==="writing") td.textContent="书写测试"; });
    var titles=[].slice.call(document.querySelectorAll(".sec-title"));
    var dm=titles.filter(function(t){ return t.textContent.indexOf("数据管理")>=0; })[0];
    if(dm){
      var card=dm.closest(".card");
      if(card && !card.querySelector("[data-clear]")){
        var row=document.createElement("div");
        row.className="flex mt14";
        row.style.flexWrap="wrap";
        row.innerHTML='<button class="btn btn-outline btn-sm" data-clear style="color:var(--red);border-color:#f5c8c8"><i data-lucide="trash-2"></i>清除本机全部学习数据</button>'+
          '<span class="muted small">清除前建议先「导出档案」备份。清除不可恢复。</span>';
        card.appendChild(row);
        row.querySelector("[data-clear]").addEventListener("click", clearData6);
        refreshIcons();
      }
    }
  }catch(e){}
};
window.clearData6 = function(){
  if(!confirm("确定清除本机全部学习记录吗？建议先导出档案备份。")) return;
  if(!confirm("再次确认：清除后无法恢复，确定吗？")) return;
  try{ localStorage.removeItem("eng365-v1"); }catch(e){}
  location.reload();
};

/* ============================================================
 * 事件委托：环节勾选 / 显示原文 / 听写 / 录音 / 识别自检 / AI
 * ============================================================ */
document.addEventListener("click", function(e){
  var t;

  /* 环节手动完成 */
  var sb = e.target.closest("[data-stage-toggle]");
  if(sb){
    var key = sb.getAttribute("data-stage-toggle");
    var p0=l6prog(LESSON_DAY);
    markStage(LESSON_DAY, key, !p0.stages[key]);
    return;
  }
  /* 环节导航滚动 */
  var nav = e.target.closest("[data-goto]");
  if(nav){
    var el=document.getElementById(nav.getAttribute("data-goto"));
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  /* 显示/隐藏原文 */
  var rv = e.target.closest("[data-reveal]");
  if(rv){ rv.closest(".drill,.l6-read-item,.l6-dlg-item").classList.toggle("open"); return; }
  var rva = e.target.closest("[data-reveal-all]");
  if(rva){
    var card=rv?null:rva.closest("#sec-words");
    if(card){
      var anyHidden=[].slice.call(card.querySelectorAll(".l6-cn")).some(function(x){return !x.closest(".l6-read-item").classList.contains("open");});
      card.querySelectorAll(".l6-read-item").forEach(function(it){ it.classList.toggle("open", anyHidden); });
    }
    return;
  }

  /* 听写提交/重答 */
  var dc = e.target.closest("[data-dic]");
  if(dc){
    var item = dc.closest(".l6-dic");
    var dday = LESSON_DAY, idx = +dc.getAttribute("data-idx");
    var Ld = getLesson(dday), items=buildDictation(dday,Ld), it=items[idx];
    var input=item.querySelector(".dic-in");
    if(dc.getAttribute("data-dic")==="retry"){
      var pp=l6prog(dday); delete pp.write["i"+idx]; save();
      item.outerHTML = (function(){ var h=writingHTML(dday,Ld); var d=document.createElement("div"); d.innerHTML=h; return d.querySelector('.l6-dic[data-idx="'+idx+'"]').outerHTML; })();
      refreshIcons();
      var ni=document.querySelector('.l6-dic[data-idx="'+idx+'"] .dic-in'); if(ni) ni.focus();
      updateL6Chrome(dday);
      return;
    }
    if(!input) return;
    var g=gradeWriting(it, input.value);
    if(g.status==="empty"){ toast("先输入你的答案再提交"); return; }
    var fb=item.querySelector(".l6-dic-fb");
    var pass = g.status==="perfect" || g.status==="minor";
    fb.className="l6-dic-fb show "+(pass?"pass":"fail");
    fb.innerHTML = '<div class="l6-fb-line">你的答案：<span>'+esc(input.value.trim()||"（空）")+'</span></div>'+
      '<div class="l6-fb-line">标准答案：<b>'+esc(it.answer)+'</b> '+speakBtn(it.answer,0.8)+'</div>'+
      (g.notes.length?'<ul class="l6-fb-notes">'+g.notes.map(function(x){
        var icon={case:"🔠",punct:"🔡",spell:"✏️",missing:"⬅️",extra:"➡️",natural:"💡",ok:"✅"}[x.t]||"•";
        return '<li class="n-'+x.t+'">'+icon+" "+esc(x.text)+'</li>';
      }).join("")+"</ul>":(pass?'<ul class="l6-fb-notes"><li class="n-ok">✅ 完全正确</li></ul>':""))+
      (pass?'':'<div class="small muted">改好后直接重新点「提交」，或清空重答。</div>');
    var progd=l6prog(dday);
    var prev=progd.write["i"+idx];
    progd.write["i"+idx]={status:g.status, tries:(prev&&prev.tries||0)+1};
    /* 错题进/出错题本 */
    var cat = it.kind==="cn2en" ? "词汇" : (it.kind==="flex" ? "语法" : "听力");
    var front = it.kind==="cn2en" ? ("中译英："+(it.prompt||it.cn)) : ("听写："+it.answer);
    if(!pass){
      addError(cat, front, "标准答案："+it.answer, null, dday);
    }else{
      var same=S.errors.filter(function(x){return !x.done && x.front===front && x.cat===cat;});
      same.forEach(function(x){ x.done=true; });
    }
    /* 整组完成：记一次书写测试，自动勾选环节5 */
    var allP=items.filter(function(x2,i2){ var r=progd.write["i"+i2]; return r && r.status!=="wrong"; }).length===items.length;
    if(allP && progd.write.recorded!==todayStr()){
      recordTest("writing", dday, items.map(function(){return {cat:"书写"};}),
        items.map(function(x2,i2){ var r=progd.write["i"+i2]; return !!(r&&r.status!=="wrong"); }));
      progd.write.recorded=todayStr();
      markStage(dday,"write",true);
    }
    save(); updateBadges();
    if(pass){
      /* 用通过态卡片替换本小题 */
      var h2=writingHTML(dday,Ld), d2=document.createElement("div"); d2.innerHTML=h2;
      var fresh=d2.querySelector('.l6-dic[data-idx="'+idx+'"]');
      if(fresh) item.replaceWith(fresh);
      refreshIcons();
      /* 更新底部进度行 */
      var wp=document.querySelector(".l6-write-progress");
      if(wp){ var cnt=items.filter(function(x2,i2){ var r=progd.write["i"+i2]; return r&&r.status!=="wrong"; }).length;
        wp.innerHTML = cnt===items.length?'<b class="l6-green">今天听写全部完成 ✓</b>':'完成情况：'+cnt+'/'+items.length; }
    }
    return;
  }

  /* AI 精细批改（未配置时明确提示） */
  var aw = e.target.closest("[data-ai-write]");
  if(aw && window.EngAI){
    EngAI.correct("","").then(function(r){
      toast(r.message||"AI 书写批改尚未配置");
    });
    return;
  }

  /* AI 对话 */
  var ai = e.target.closest("[data-ai]");
  if(ai){
    var act=ai.getAttribute("data-ai");
    if(act==="mode"){
      aiChat.mode=ai.getAttribute("data-mode");
      ai.closest("#l6Ai").querySelectorAll(".l6-ai-mode").forEach(function(b){ b.classList.toggle("active", b===ai); });
      return;
    }
    if(act==="retry"){ if(aiChat.lastUser) aiChatSend(aiChat.lastUser); return; }
    if(act==="send"){
      var box=ai.closest("#l6Ai"); var inp=box.querySelector(".l6-ai-input input");
      var txt=(inp.value||"").trim(); if(!txt){ toast("先说点什么吧"); return; }
      inp.value=""; aiChatSend(txt);
      return;
    }
  }

  /* 麦克风跟读自检 */
  var mb=e.target.closest("[data-mic2]");
  if(mb){ handleMic2(mb); return; }
  var kb=e.target.closest("[data-saycheck]");
  if(kb){
    var cardK=kb.closest(".l6-speak");
    var inpK=cardK.querySelector(".l6-in");
    var outK=cardK.querySelector(".l6-sr");
    if(!inpK.value.trim()){ toast("先在输入框里输入你说的英文"); return; }
    showSpeechFeedback(kb.getAttribute("data-saycheck"), inpK.value.trim(), cardK);
    return;
  }

  /* 录音 */
  var rb=e.target.closest("[data-rec]");
  if(rb){ recAction(rb); return; }
});

/* 输入框回车提交听写 */
document.addEventListener("keydown", function(e){
  if(e.key==="Enter"){
    var inp=e.target.closest && e.target.closest(".dic-in");
    if(inp){ var b=inp.closest(".l6-dic").querySelector("[data-dic='check']"); if(b) b.click(); }
    var aiInp=e.target.closest && e.target.closest(".l6-ai-input input");
    if(aiInp){ var s=aiInp.parentElement.querySelector("[data-ai='send']"); if(s) s.click(); }
  }
});

/* ---------- 听写区用到的全局重绘（小题局部替换） ---------- */
/* writingHTML 在上方定义 */

/* ---------- 麦克风跟读自检 ---------- */
function showSpeechFeedback(target, text, card){
  var out=card.querySelector(".l6-sr");
  out.style.display="block";
  out.className="mic-result l6-sr ok";
  out.innerHTML=speechFeedback(target,text);
  refreshIcons();
  var day=+card.getAttribute("data-day");
  var p=l6prog(day); p.speak=(p.speak||0)+1;
  S.speakingLog = S.speakingLog||[];
  S.speakingLog.push({day:day, target:target, said:text, date:todayStr()});
  if(S.speakingLog.length>200) S.speakingLog.shift();
  if(!p.stages.speak) p.stages.speak=true;
  save(); updateL6Chrome(day); updateBadges();
  /* 连续识别很差：记口语错题（措辞诚实，不说是发音错） */
  var tw=canonTokens(target).filter(function(w){return !STOP[w];});
  var set={}; canonTokens(text).forEach(function(w){set[w]=1;});
  var hit=tw.filter(function(w){return set[w];}).length;
  if(tw.length && hit/tw.length<0.5)
    addError("口语", "跟读："+target, "语音识别为：“"+text+"”（可能是发音、识别误差或收音问题，需多听原声）", null, day);
}
function srErrorHTML(kind){
  var map={
    denied:['<b>麦克风权限被拒绝</b>','请在手机里允许麦克风后重试：iPhone「设置→Safari→麦克风」打开；或用下方文本输入做对照练习。'],
    nospeech:['<b>没有听到声音</b>','可能是没开口、环境太吵或麦克风被占用。再点一次，说完后停顿一下自动结束。'],
    device:['<b>找不到麦克风设备</b>','请检查耳机/麦克风是否接好，或换一台设备；也可以先用下方文本输入对照。'],
    net:['<b>语音识别服务不可用</b>','浏览器识别需要联网（iPhone Safari 可能不支持）。可以改用「录音对照」或下方文本输入。']
  };
  var x=map[kind]||map.net;
  return '<div class="l6-fb-bad">'+x[0]+'</div><div class="small muted">'+x[1]+'</div>';
}
function handleMic2(btn){
  var card=btn.closest(".l6-speak");
  var target=btn.getAttribute("data-mic2");
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var out=card.querySelector(".l6-sr");
  if(!SR){
    out.style.display="block"; out.className="mic-result l6-sr bad";
    out.innerHTML='<div class="l6-fb-bad"><b>当前浏览器不支持网页语音识别</b></div>'+
      '<div class="small muted">iPhone Safari 通常不支持此功能。请用上面的「录音」回放对照，或在下方输入框输入你说的英文做文本对照。</div>';
    return;
  }
  var r=new SR();
  r.lang="en-US"; r.interimResults=false; r.maxAlternatives=1;
  r.onresult=function(ev){
    var text=ev.results[0][0].transcript;
    showSpeechFeedback(target, text, card);
  };
  r.onerror=function(ev){
    out.style.display="block"; out.className="mic-result l6-sr bad";
    var er=ev&&ev.error;
    out.innerHTML=srErrorHTML(er==="not-allowed"||er==="service-not-allowed"?"denied":
      er==="no-speech"?"nospeech":er==="audio-capture"?"device":"net");
  };
  r.onend=function(){
    btn.classList.remove("recording");
    btn.innerHTML='<i data-lucide="mic"></i>麦克风跟读自检';
    refreshIcons();
  };
  btn.classList.add("recording");
  btn.innerHTML='<i data-lucide="mic"></i>正在听…说完停一下自动结束';
  refreshIcons();
  try{ r.start(); }catch(err){ btn.classList.remove("recording"); }
}

/* ---------- 录音管理（MediaRecorder，内存态，不上传） ---------- */
var RecMgr={ cur:null };
function recStatus(box, msg, cls){
  var s=box.querySelector(".l6-rec-status");
  s.className="l6-rec-status small "+(cls||"muted");
  s.textContent=msg;
}
function recBtns(box, st){
  box.querySelector('[data-rec="start"]').disabled=!!st.recording;
  box.querySelector('[data-rec="stop"]').disabled=!st.recording;
  box.querySelector('[data-rec="reset"]').disabled=!(st.url||st.recording);
  box.querySelector('[data-rec="play"]').disabled=!st.url;
  box.querySelector('[data-rec="del"]').disabled=!st.url && !st.recording;
}
function recTeardown(st){
  try{ st.recorder && st.recorder.state!=="inactive" && st.recorder.stop(); }catch(e){}
  try{ st.stream && st.stream.getTracks().forEach(function(t){t.stop();}); }catch(e){}
  if(st.url){ try{URL.revokeObjectURL(st.url);}catch(e){} st.url=null; }
  var au=st.box.querySelector(".l6-rec-audio");
  if(au){ au.hidden=true; au.removeAttribute("src"); au.loadBlobDone=0; }
}
async function recAction(btn){
  var box=btn.closest(".l6-rec");
  var act=btn.getAttribute("data-rec");
  var st=box._st;
  if(!st){ st=box._st={box:box, recorder:null, stream:null, chunks:[], url:null, recording:false}; }

  if(act==="start"){
    if(RecMgr.cur && RecMgr.cur!==st){
      var old=RecMgr.cur;
      recTeardown(old); old.recording=false; recBtns(old.box,old); recStatus(old.box,"已停止上一段录音（同一时间只录一段）");
    }
    if(!navigator.mediaDevices || !window.MediaRecorder){
      recStatus(box,"当前浏览器不支持网页录音，可用麦克风自检或下方文本输入对照。","bad");
      return;
    }
    try{
      var stream=await navigator.mediaDevices.getUserMedia({audio:true});
      st.stream=stream; st.chunks=[];
      var mime=["audio/webm","audio/mp4","audio/aac"].filter(function(m){try{return MediaRecorder.isTypeSupported(m);}catch(e){return false;}})[0]||"";
      var rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      st.recorder=rec;
      rec.ondataavailable=function(ev){ if(ev.data&&ev.data.size) st.chunks.push(ev.data); };
      rec.onstop=function(){
        try{ stream.getTracks().forEach(function(t){t.stop();}); }catch(e){}
        if(!st.chunks.length){ recStatus(box,"没有录到声音，请检查麦克风后重录。","bad"); st.recording=false; recBtns(box,st); return; }
        var blob=new Blob(st.chunks,{type:mime||"audio/webm"});
        if(st.url) try{URL.revokeObjectURL(st.url);}catch(e){}
        st.url=URL.createObjectURL(blob);
        var au=box.querySelector(".l6-rec-audio");
        au.src=st.url; au.hidden=false;
        st.recording=false; recBtns(box,st);
        recStatus(box,"录音完成 ✓ 点「我的录音」回放，再点「听原声」对比。","ok");
      };
      rec.start();
      st.recording=true; RecMgr.cur=st;
      recBtns(box,st); recStatus(box,"● 正在录音…点「停止」结束。","rec");
    }catch(err){
      st.recording=false; recBtns(box,st);
      if(err && (err.name==="NotAllowedError"||err.name==="SecurityError"))
        recStatus(box,"麦克风权限被拒绝：iPhone「设置→Safari→麦克风」打开后重试；也可用文本输入对照。","bad");
      else if(err && err.name==="NotFoundError")
        recStatus(box,"没找到麦克风设备，请检查耳机或换设备。","bad");
      else
        recStatus(box,"无法启动录音："+(err&&err.message||err)+"（可用文本输入对照）","bad");
    }
    return;
  }
  if(act==="stop"){
    if(st.recorder && st.recording){ st.recorder.stop(); recStatus(box,"处理中…"); }
    return;
  }
  if(act==="reset"){
    recTeardown(st); st.recording=false; recBtns(box,st);
    recAction(box.querySelector('[data-rec="start"]'));
    return;
  }
  if(act==="play"){
    var au=box.querySelector(".l6-rec-audio");
    if(st.url){ au.hidden=false; au.play().catch(function(){ toast("录音回放失败，请再录一次"); }); }
    return;
  }
  if(act==="del"){
    recTeardown(st); st.recording=false; recBtns(box,st);
    recStatus(box,"录音已删除（本来也没有上传）。","muted");
    return;
  }
}

/* ---------- AI 对话（配置后自动可用，未配置不显示输入框） ---------- */
var aiChat={mode:"bilingual",messages:[],lastUser:null,busy:false};
function aiRender(){
  var box=document.querySelector("#l6Ai .l6-ai-msgs");
  if(!box) return;
  var dayEl=document.querySelector("#l6Ai");
  var day=dayEl?+dayEl.getAttribute("data-day"):1;
  if(!aiChat.messages.length){
    var info=DAY_MAP[day-1];
    aiChat.messages.push({role:"ai", text:aiChat.mode==="english"?
      ("Hi! Today's topic: "+info.title+". Let's talk. Please answer in one short sentence."):
      ("你好！今天的情景是「"+info.title+"」。我每次只问一个问题，你用简单句回答即可，不会的词可以夹中文。Ready? What's your name?")});
  }
  box.innerHTML=aiChat.messages.map(function(m){
    if(m.role==="err")
      return '<div class="l6-msg err"><span>'+esc(m.text)+'</span><button class="mic-btn" data-ai="retry">重试</button></div>';
    return '<div class="l6-msg '+(m.role==="user"?"me":"ai")+'">'+esc(m.text)+'</div>';
  }).join("");
  box.scrollTop=box.scrollHeight;
  refreshIcons();
}
function aiChatSend(text){
  if(!window.EngAI) return;
  aiChat.lastUser=text;
  aiChat.messages.push({role:"user",text:text});
  aiChat.messages.push({role:"ai",text:"…",busy:true});
  aiRender();
  var dayEl=document.querySelector("#l6Ai");
  EngAI.chat(text,{mode:aiChat.mode, day:dayEl?+dayEl.getAttribute("data-day"):1}).then(function(r){
    aiChat.messages=aiChat.messages.filter(function(m){return !m.busy;});
    if(r.ok && r.data && r.data.reply) aiChat.messages.push({role:"ai",text:String(r.data.reply)});
    else aiChat.messages.push({role:"err",text:(r&&r.message)||"AI 服务异常"});
    aiRender();
  });
}
/* 首屏用新版重绘一次（app.js 已渲染过旧首页） */
try{
  updateBadges();
  render();
}catch(e){
  console.error("lesson6 init error", e);
}

})();
