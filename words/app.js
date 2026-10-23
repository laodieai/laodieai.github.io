/* 老爹英语 · 单词库 365 天 —— 排课 + 双语朗读引擎 + 多视图 */
(function () {
  "use strict";

  var DAY_COUNT = 365;
  var PER_SECTION = 10;
  var SECTIONS_PER_DAY = 5;
  var YEAR = new Date().getFullYear();
  var WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var MON_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // ---------- 排课：87个分类 + 24个发音专项 = 111种区，每天5区×10词 + 第6区测试 ----------
  var ALL_SECTIONS = [];
  WORD_DATA.categories.forEach(function (c, i) {
    ALL_SECTIONS.push({ kind: "cat", ref: i, name: c.name, en: c.en, tip: "" });
  });
  WORD_DATA.phonics.forEach(function (p, i) {
    ALL_SECTIONS.push({ kind: p.type, ref: i, name: p.name, en: "发音专项", tip: p.tip || "" });
  });

  // ---------- 课程阶段：10个大阶段，从零基础到进阶顺序推进 ----------
  var STAGES = [
    { name: "开口起步", subs: ["数字数学", "颜色", "月份星期", "疑问词", "家庭成员", "身体部位", "时间日期", "常用形容词一", "社交用语", "常用缩略形式", "咬舌音 θ（清）"] },
    { name: "吃喝生活", subs: ["水果", "蔬菜", "饮品", "肉类", "海鲜", "主食谷物", "甜点零食", "调味品", "餐厅", "咖啡店", "烹饪动词"] },
    { name: "居家日常", subs: ["房间家具", "家用电器", "厨房用具", "洗漱清洁", "家务劳动", "衣物", "鞋帽配饰", "洗衣干洗", "理发美容", "房屋维修", "植物园艺"] },
    { name: "日常表达", subs: ["日常动词一", "日常动词二", "常用形容词二", "方位方向", "形状尺寸", "情绪感受", "性格品质", "爱好娱乐", "宠物相关", "公园户外", "双元音 aɪ 和 ɔɪ"] },
    { name: "出门在外", subs: ["交通工具", "汽车相关", "加油停车", "旅行", "机场航空", "酒店", "常见标识", "城市场所", "海滩度假", "露营徒步", "r 和 l 对比"] },
    { name: "购物消费", subs: ["购物", "金钱银行", "移动支付", "快递外卖", "手机应用", "科技数码", "天气", "国家与语言", "美国城市", "长音 iː 和短音 ɪ", "æ 和 e 对比"] },
    { name: "健康休闲", subs: ["健康医疗", "常见症状", "药店买药", "健身锻炼", "运动", "音乐乐器", "影视媒体", "节日庆祝", "长音 uː 和短音 ʊ", "咬舌音 ð（浊）", "卷舌音 ɜr"] },
    { name: "学习工作", subs: ["学校教育", "文具办公", "职业", "商务工作", "电话沟通", "农场生活", "s 和咬舌 θ 对比", "v 和 w 对比", "b 和 p 对比", "d 和 t 对比", "g 和 k 对比"] },
    { name: "自然世界", subs: ["哺乳动物", "鸟类", "海洋生物", "昆虫爬虫", "自然地理", "宇宙太空", "环境环保", "ʃ 和 tʃ 对比", "n 和 ŋ 对比", "清 s 和浊 z", "ɑ 和 ʌ 对比"] },
    { name: "进阶提升", subs: ["进阶动词", "抽象名词", "副词连接词", "材料物质", "工具", "建筑房屋", "eɪ 和 e 对比", "最难发音词", "不发音字母", "同音异形词", "重音变词性", "-ed 三种读法"] }
  ];
  var IDX_BY_NAME = {};
  ALL_SECTIONS.forEach(function (s, i) { IDX_BY_NAME[s.name] = i; });
  var ORDER = [];
  var SECTION_STAGE = [];
  STAGES.forEach(function (st, si) {
    st.subs.forEach(function (n) {
      var idx = IDX_BY_NAME[n];
      if (idx === undefined) { if (window.console) console.warn("阶段里找不到区:", n); return; }
      ORDER.push(idx);
      SECTION_STAGE[idx] = si;
    });
  });
  var TEMPLATE_DAYS = Math.floor(ORDER.length / SECTIONS_PER_DAY); // 22
  function stageIndexOfDay(day) {
    var t = (day - 1) % TEMPLATE_DAYS;
    return SECTION_STAGE[ORDER[t * SECTIONS_PER_DAY]];
  }

  function sectionWords(sec, round) {
    if (sec.kind === "cat") {
      var words = WORD_DATA.categories[sec.ref].words;
      var start = (round * PER_SECTION) % words.length;
      var out = [];
      for (var k = 0; k < PER_SECTION; k++) out.push({ type: "word", w: words[(start + k) % words.length] });
      return out;
    }
    if (sec.kind === "sound") {
      var sw = WORD_DATA.phonics[sec.ref].words;
      var out2 = [];
      for (var m = 0; m < Math.min(PER_SECTION, sw.length); m++) out2.push({ type: "word", w: sw[m] });
      return out2;
    }
    var pw = WORD_DATA.phonics[sec.ref].pairs;
    var out3 = [];
    for (var n = 0; n < Math.min(PER_SECTION, pw.length); n++) out3.push({ type: "pair", w: pw[n] });
    return out3;
  }

  function dayPlan(day) { // day: 1..365
    var t = (day - 1) % TEMPLATE_DAYS;
    var round = Math.floor((day - 1) / TEMPLATE_DAYS);
    var plan = [];
    for (var s = 0; s < SECTIONS_PER_DAY; s++) {
      var sec = ALL_SECTIONS[ORDER[t * SECTIONS_PER_DAY + s]];
      plan.push({ sec: sec, items: sectionWords(sec, round) });
    }
    return plan;
  }

  // ---------- 第6区测试：每天学完50词后考20题，答对16题过关 ----------
  function todayPool() {
    var pool = [], seen = {};
    flat.forEach(function (f) {
      var it = f.item;
      if (it.type === "word") { if (!seen[it.w[0]]) { seen[it.w[0]] = 1; pool.push(it.w); } }
      else {
        if (!seen[it.w[0]]) { seen[it.w[0]] = 1; pool.push([it.w[0], it.w[1]]); }
        if (!seen[it.w[2]]) { seen[it.w[2]] = 1; pool.push([it.w[2], it.w[3]]); }
      }
    });
    return pool;
  }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildQuiz() {
    var pool = shuffleArr(todayPool().slice());
    var qs = [];
    var n = Math.min(20, pool.length);
    for (var k = 0; k < n; k++) {
      var w = pool[k];
      var opts = [w];
      var cand = shuffleArr(pool.slice());
      for (var c = 0; c < cand.length && opts.length < 4; c++) {
        if (opts.indexOf(cand[c]) < 0 && cand[c][1] !== w[1]) opts.push(cand[c]);
      }
      qs.push({ w: w, type: k % 2 === 0 ? "e2c" : "c2e", opts: shuffleArr(opts) });
    }
    return qs;
  }

  var quiz = null;

  function renderQuizIntro() {
    var box = $("quizBox");
    if (!box) return;
    var doneToday = state.done.indexOf(state.day) >= 0;
    box.innerHTML = "<div class='qzIntro'>学完今天的 50 个词就来测试：<b>20 道题，答对 16 道过关</b>，过关自动打卡并解锁下一天。" +
      (doneToday ? "<div class='qzVerdict pass'>今天已通过测试，已打卡</div>" : "") +
      "</div><div class='ctl-row'><button class='btn btn-brand' id='qzStart'><i data-lucide='play'></i>开始测试</button></div>";
    $("qzStart").onclick = renderQuiz;
    refreshIcons();
  }

  function renderQuiz() {
    quiz = { qs: buildQuiz(), i: 0, correct: 0, locked: false };
    renderQuizQ();
  }

  function renderQuizQ() {
    var box = $("quizBox");
    if (!box) return;
    if (quiz.i >= quiz.qs.length) return renderQuizResult();
    var q = quiz.qs[quiz.i];
    var html = "<div class='qzProg'>第 " + (quiz.i + 1) + " / " + quiz.qs.length + " 题 · 已答对 " + quiz.correct + " 题</div>";
    if (q.type === "e2c") {
      html += "<div class='qzQ'><b>" + q.w[0] + "</b> <span class='ipa'>" + ipaOf(q.w[0]) + "</span>" +
        " <button class='miniBtn' id='qzSpeak'>发音</button></div><div class='qzHint'>选出正确的中文意思</div>";
    } else {
      html += "<div class='qzQ'><b>" + q.w[1] + "</b></div><div class='qzHint'>选出正确的英文单词</div>";
    }
    html += "<div class='qzOpts'>";
    q.opts.forEach(function (o, oi) {
      html += "<button class='qzOpt' data-oi='" + oi + "'>" + (q.type === "e2c" ? o[1] : o[0]) + "</button>";
    });
    html += "</div>";
    box.innerHTML = html;
    if (q.type === "e2c") {
      $("qzSpeak").onclick = function () { speakSingle(q.w[0], null); };
      speakSingle(q.w[0], null);
    }
    box.querySelectorAll(".qzOpt").forEach(function (b) {
      b.onclick = function () { answerQuiz(parseInt(b.getAttribute("data-oi"), 10), b); };
    });
    refreshIcons();
  }

  function answerQuiz(oi, btn) {
    if (quiz.locked) return;
    quiz.locked = true;
    var q = quiz.qs[quiz.i];
    var right = q.opts[oi] === q.w;
    if (right) quiz.correct++;
    $("quizBox").querySelectorAll(".qzOpt").forEach(function (b) {
      var i = parseInt(b.getAttribute("data-oi"), 10);
      if (q.opts[i] === q.w) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
      b.disabled = true;
    });
    setTimeout(function () { quiz.locked = false; quiz.i++; renderQuizQ(); }, right ? 650 : 1500);
  }

  function renderQuizResult() {
    var need = Math.ceil(quiz.qs.length * 0.8);
    var pass = quiz.correct >= need;
    var box = $("quizBox");
    var html = "<div class='qzResult'>";
    html += "<div class='qzScore " + (pass ? "pass" : "fail") + "'>" + quiz.correct + " / " + quiz.qs.length + "</div>";
    html += pass
      ? "<div class='qzVerdict pass'>测试通过！第 " + state.day + " 天已自动打卡</div>"
      : "<div class='qzVerdict fail'>答对 " + need + " 题才算通过，再考一次吧</div>";
    html += "<div class='ctl-row'>";
    if (pass) html += "<button class='btn btn-brand' id='qzNext'>进入下一天<i data-lucide='chevron-right'></i></button>";
    html += "<button class='btn btn-outline' id='qzRetry'><i data-lucide='rotate-ccw'></i>重考</button>";
    if (!pass) html += "<button class='btn btn-outline' id='qzBack'>回前一天复习</button>";
    html += "</div></div>";
    box.innerHTML = html;
    if (pass) {
      markDone(state.day);
      toast("通过！已打卡第 " + state.day + " 天");
      $("qzNext").onclick = function () { setDay(state.day + 1, false); };
    }
    $("qzRetry").onclick = renderQuiz;
    var bk = $("qzBack");
    if (bk) bk.onclick = function () { setDay(state.day - 1, false); };
    refreshIcons();
  }

  var TOTAL_WORDS = 0;
  WORD_DATA.categories.forEach(function (c) { TOTAL_WORDS += c.words.length; });
  WORD_DATA.phonics.forEach(function (p) { TOTAL_WORDS += p.words ? p.words.length : p.pairs.length * 2; });

  // ---------- 状态 ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("ldw_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ldw_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  // 重新开始：带 ?reset=1 打开时清空学习进度（保留语速、声音等设置）
  if (/[?&]reset=1/.test(location.search)) {
    ["done", "day", "totalRounds"].forEach(function (k) { try { localStorage.removeItem("ldw_" + k); } catch (e) {} });
  }

  var state = {
    day: 1, // 启动时定位到第一个未完成的天
    idx: 0,
    playing: false,
    round: 0,
    done: store.get("done", []),
    totalRounds: store.get("totalRounds", 0),
    view: "dashboard"
  };
  var settings = Object.assign(
    { ratePct: 85, repeat: 2, zhOn: true, pause: 1200, loop: true, enVoice: "", zhVoice: "" },
    store.get("settings", {})
  );
  function saveSettings() { store.set("settings", settings); }

  // 一次性迁移：停顿调短、英文两遍、清掉手动选过的声音（锁定同一个清晰女声的高清版）
  // 男声和搞怪声音一律不用，保证朗读音色统一
  var BAD_VOICE = /Eddy|Reed|Rocko|Grandpa|Fred|Ralph|Albert|Junior|Alex|Daniel|Thomas|Jacques|Majed|Xander|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox/;
  if (settings.v !== 5) {
    settings.pause = 1200;
    settings.repeat = 2;
    settings.zhVoice = "";
    settings.enVoice = "";
    settings.v = 5;
    saveSettings();
  }

  function $(id) { return document.getElementById(id); }

  function ipaOf(en) {
    return (typeof WORD_IPA !== "undefined" && WORD_IPA[en]) ? "/" + WORD_IPA[en] + "/" : "";
  }

  function dateOf(day) { return new Date(YEAR, 0, day); }
  function fmtDate(day) { var d = dateOf(day); return (d.getMonth() + 1) + "月" + d.getDate() + "日"; }
  function fmtDateW(day) { var d = dateOf(day); return fmtDate(day) + " " + WEEK[d.getDay()]; }

  function nextUndone() {
    for (var d = 1; d <= DAY_COUNT; d++) if (state.done.indexOf(d) < 0) return d;
    return DAY_COUNT;
  }

  function streak() {
    var n = 0;
    var start = nextUndone() - 1;
    while (start - n >= 1 && state.done.indexOf(start - n) >= 0) n++;
    return n;
  }

  // ---------- 语音 ----------
  var voices = [];
  var enVoice = null, zhVoice = null;
  // 声音列表异步加载，没加载完前绝不开口（否则会临时掉回系统默认声音，听起来像换了好几个人）
  var voicesReadyResolve;
  var voicesReady = new Promise(function (res) { voicesReadyResolve = res; });
  setTimeout(voicesReadyResolve, 3000); // 兜底：3 秒后无论如何放行
  function pickVoices() {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (voices.length) voicesReadyResolve();
    // 自动（默认）：不指定声音，跟随系统默认朗读声音（老爹 2026-09-22 在系统设置里重选了声音）
    // 只有在下拉里手动选了具体声音才指定
    function pick(langMatch, saved) {
      if (saved) { var f = voices.find(function (v) { return v.name === saved; }); if (f) return f; }
      return null; // 自动：交给系统默认声音
    }
    enVoice = pick("en-US", settings.enVoice);
    zhVoice = pick("zh-CN", settings.zhVoice);
    fillVoiceSelects();
  }
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = pickVoices;
    pickVoices();
  }

  function speak(text, voice, lang, rate, token) {
    return voicesReady.then(function () {
      return new Promise(function (resolve) {
        if (token !== playToken) return resolve();
        /* 安卓 Chrome 适配：cancel 后立即 speak 可能被系统丢弃，先 resume 再延迟发声 */
        try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
        setTimeout(function () {
          if (token !== playToken) return resolve();
          try {
            var u = new SpeechSynthesisUtterance(text);
            if (voice) u.voice = voice;
            u.lang = lang;
            u.rate = rate;
            u.onend = function () { resolve(); };
            u.onerror = function () { resolve(); };
            speechSynthesis.speak(u);
          } catch (err) { resolve(); }
        }, 60);
      });
    });
  }
  function wait(ms, token) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (token !== playToken || Date.now() - t0 >= ms) return resolve();
        setTimeout(tick, 120);
      })();
    });
  }

  var playToken = 0;
  function stopSpeech() {
    playToken++;
    if (window.speechSynthesis) {
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
      try { speechSynthesis.cancel(); } catch (e) {}
    }
  }
  window.addEventListener("pagehide", stopSpeech);
  window.addEventListener("beforeunload", stopSpeech);

  async function playItem(item, token) {
    var r = settings.ratePct / 100;
    var speeds = [r, r * 0.65, r]; // 常速 → 慢速 → 常速，按遍数循环
    if (item.type === "pair") {
      var a = item.w[0], az = item.w[1], b = item.w[2], bz = item.w[3];
      for (var t = 0; t < settings.repeat; t++) {
        var sp = speeds[t % speeds.length];
        await speak(a, enVoice, "en-US", sp, token);
        await wait(450, token);
        await speak(b, enVoice, "en-US", sp, token);
        if (t < settings.repeat - 1) await wait(450, token);
      }
      if (settings.zhOn) { await wait(300, token); await speak(az + "，" + bz, zhVoice, "zh-CN", 0.95, token); }
    } else {
      var en = item.w[0], zh = item.w[1];
      for (var t2 = 0; t2 < settings.repeat; t2++) {
        await speak(en, enVoice, "en-US", speeds[t2 % speeds.length], token);
        if (t2 < settings.repeat - 1) await wait(450, token);
      }
      if (settings.zhOn) { await wait(350, token); await speak(zh, zhVoice, "zh-CN", 0.95, token); }
    }
    await wait(settings.pause, token); // 跟读停顿
  }

  // 词汇库点读单个词（不影响排课，会停掉正在播的内容）
  function speakSingle(en, zh) {
    if (!window.speechSynthesis) return;
    stopSpeech();
    state.playing = false;
    renderControls();
    var token = playToken;
    var r = settings.ratePct / 100;
    (async function () {
      await speak(en, enVoice, "en-US", r, token);
      await wait(350, token);
      await speak(en, enVoice, "en-US", r * 0.65, token);
      if (settings.zhOn && zh) { await wait(300, token); await speak(zh, zhVoice, "zh-CN", 0.95, token); }
    })();
  }

  async function playLoop() {
    var token = ++playToken;
    state.playing = true;
    renderControls();
    while (token === playToken) {
      if (state.idx >= flat.length) {
        state.round++;
        state.totalRounds++;
        store.set("totalRounds", state.totalRounds);
        renderRound();
        if (settings.loop) {
          state.idx = 0;
        } else {
          state.playing = false;
          state.idx = 0;
          renderControls();
          renderList();
          return;
        }
      }
      renderCurrent();
      highlightRow();
      await playItem(flat[state.idx].item, token);
      if (token !== playToken) return;
      state.idx++;
    }
  }

  function playPause() {
    if (!window.speechSynthesis) { toast("这个浏览器不支持朗读，请用 Safari 或 Chrome 打开"); return; }
    if (state.playing) {
      state.playing = false;
      stopSpeech();
      renderControls();
    } else {
      playLoop();
    }
  }

  function jumpTo(i, keepPlaying) {
    var was = state.playing;
    stopSpeech();
    state.playing = false;
    state.idx = Math.min(Math.max(i, 0), flat.length - 1);
    renderCurrent();
    highlightRow();
    renderControls();
    if (keepPlaying && was) playLoop();
  }

  function playFrom(i) {
    stopSpeech();
    state.playing = false;
    state.idx = Math.min(Math.max(i, 0), flat.length - 1);
    renderCurrent();
    highlightRow();
    renderControls();
    playLoop();
  }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  // ---------- 数据渲染基础 ----------
  var flat = [];
  var plan = [];
  function buildDay() {
    plan = dayPlan(state.day);
    flat = [];
    plan.forEach(function (s, si) {
      s.items.forEach(function (it) { flat.push({ sec: s.sec, secIdx: si, item: it }); });
    });
  }

  // ---------- 视图框架 ----------
  var VIEWS = [
    { id: "dashboard", title: "今日学习" },
    { id: "map", title: "365 天课程地图" },
    { id: "review", title: "复习中心" },
    { id: "vocab", title: "词汇库" },
    { id: "stats", title: "能力报告" }
  ];

  function showView(v) {
    state.view = v;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === v);
    });
    VIEWS.forEach(function (x) {
      if (x.id === v) $("topbarTitle").textContent = x.title;
      $("view-" + x.id).style.display = x.id === v ? "" : "none";
    });
    $("sidebar").classList.remove("open");
    renderFloat();
    if (v === "map") renderCalendar();
    if (v === "review") renderReview();
    if (v === "stats") renderStats();
    if (v === "vocab") renderVocabCats();
  }

  function buildViews() {
    var main = $("view");
    main.innerHTML =
      // ===== 今日学习 =====
      '<div id="view-dashboard">' +
        '<div class="hero">' +
          '<div class="hero-day" id="heroDay">DAY 1</div>' +
          '<div class="hero-title" id="heroTitle">第 1 天 · 今日 50 词</div>' +
          '<div class="hero-goal" id="heroGoal"></div>' +
          '<div class="hero-actions">' +
            '<button class="btn btn-primary" id="heroPlay"><i data-lucide="play"></i>开始播放</button>' +
            '<button class="btn btn-ghost" id="heroDone"><i data-lucide="check"></i>标记完成</button>' +
            '<button class="btn btn-ghost" id="heroPrev"><i data-lucide="chevron-left"></i>前一天</button>' +
            '<button class="btn btn-ghost" id="heroNext">后一天<i data-lucide="chevron-right"></i></button>' +
          "</div>" +
        "</div>" +
        '<div class="grid grid-4 mt14">' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="flame"></i>连续学习</div><div class="stat-value" id="stStreak">0 天</div><div class="stat-sub">每天坚持最重要</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="check-circle"></i>已完成天数</div><div class="stat-value" id="stDone">0 / 365</div><div class="stat-sub">播完一轮自动打卡</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="list"></i>今日词数</div><div class="stat-value">50 词</div><div class="stat-sub">5 个区 × 10 词</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="book-open"></i>词汇总量</div><div class="stat-value" id="stTotal">0</div><div class="stat-sub">10 个阶段 · 87 类 + 24 发音专项</div></div>' +
        "</div>" +
        '<div class="card card-pad mt14">' +
          '<h2 class="sec-title"><i data-lucide="volume-2"></i>跟读播放器<span class="tag brand" id="playerTag">双语朗读</span></h2>' +
          '<div class="p-stage">' +
            '<div class="p-sec" id="bigSec"></div>' +
            '<div class="p-word" id="bigWord">…</div>' +
            '<div class="p-ipa" id="bigIpa"></div>' +
            '<div class="p-zh" id="bigZh"></div>' +
            '<div class="p-counter" id="counter"></div>' +
            '<div class="p-round" id="roundInfo"></div>' +
            '<div class="p-bar"><div id="bar"></div></div>' +
          "</div>" +
          '<div class="ctl-row">' +
            '<button class="btn btn-outline" id="prevBtn"><i data-lucide="skip-back"></i>上一词</button>' +
            '<button class="btn btn-brand" id="playBtn"><i data-lucide="play"></i><span id="playTxt">播放</span></button>' +
            '<button class="btn btn-outline" id="nextBtn"><i data-lucide="skip-forward"></i>下一词</button>' +
            '<button class="btn btn-outline" id="againBtn"><i data-lucide="rotate-ccw"></i>重读</button>' +
          "</div>" +
          '<div class="set-row">' +
            "<label>跟读停顿 <select id='pauseSel'><option value='800'>很短</option><option value='1200'>短（推荐）</option><option value='2500'>中</option><option value='4000'>长</option></select></label>" +
            "<label><input type='checkbox' id='zhChk'> 读中文</label>" +
            "<label><input type='checkbox' id='loopChk'> 循环播放</label>" +
            "<label>英文声音 <select id='enVoice'><option value=''>自动</option></select></label>" +
            "<label>中文声音 <select id='zhVoice'><option value=''>自动</option></select></label>" +
          "</div>" +
        "</div>" +
        '<div class="card card-pad mt14">' +
          '<h2 class="sec-title"><i data-lucide="layout-grid"></i>今天的 5 个区<span class="tag">点区名从该区开始播</span></h2>' +
          '<div class="plan-row" id="sections"></div>' +
        "</div>" +
        '<div class="card card-pad mt14">' +
          '<h2 class="sec-title"><i data-lucide="list-checks"></i>今日单词表<span class="tag">点单词跟读</span></h2>' +
          '<div id="wordlist"></div>' +
        "</div>" +
        '<div class="card card-pad mt14">' +
          '<h2 class="sec-title"><i data-lucide="clipboard-check"></i>6区 · 今日测试<span class="tag amber">20题 · 对16题过关</span></h2>' +
          '<div id="quizBox"></div>' +
        "</div>" +
      "</div>" +
      // ===== 课程地图 =====
      '<div id="view-map" style="display:none">' +
        '<div class="page-head"><h1>365 天课程地图</h1><p>绿底 = 已完成，蓝底 = 当前天，橙圈 = 今天。点任意日期跳到那一天。</p></div>' +
        '<div class="card card-pad">' +
          '<div class="calGrid" id="calendar"></div>' +
          '<div class="calLegend">' +
            '<span><i style="background:var(--green-soft);outline:1px solid #c4e8d0"></i>已完成</span>' +
            '<span><i style="background:var(--brand)"></i>当前选中</span>' +
            '<span><i style="background:var(--bg);outline:2px solid var(--amber)"></i>今天</span>' +
            '<span><i style="background:var(--bg);outline:1px solid var(--line)"></i>未学</span>' +
          "</div>" +
        "</div>" +
      "</div>" +
      // ===== 复习中心 =====
      '<div id="view-review" style="display:none">' +
        '<div class="page-head"><h1>复习中心</h1><p>已经完成的天数在这里，随时点「复习」重播巩固。</p></div>' +
        '<div class="card card-pad"><div id="reviewList"></div></div>' +
      "</div>" +
      // ===== 词汇库 =====
      '<div id="view-vocab" style="display:none">' +
        '<div class="page-head"><h1>词汇库</h1><p>全部 67 个分类 + 24 个发音专项，点单词立刻发音。</p></div>' +
        '<div class="card card-pad">' +
          '<div class="vcCats" id="vocabCats"></div>' +
          '<div class="vcCount" id="vocabCount"></div>' +
          '<div class="wgrid" id="vocabList"></div>' +
        "</div>" +
      "</div>" +
      // ===== 能力报告 =====
      '<div id="view-stats" style="display:none">' +
        '<div class="page-head"><h1>能力报告</h1><p>学习进度一目了然。</p></div>' +
        '<div class="grid grid-4">' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="flame"></i>连续打卡</div><div class="stat-value" id="rpStreak">0 天</div><div class="stat-sub">当前连续</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="calendar-check"></i>累计完成</div><div class="stat-value" id="rpDone">0 天</div><div class="stat-sub" id="rpDonePct">0%</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="repeat"></i>播放轮数</div><div class="stat-value" id="rpRounds">0</div><div class="stat-sub">每轮 50 词</div></div>' +
          '<div class="card stat"><div class="stat-label"><i data-lucide="graduation-cap"></i>已学词汇</div><div class="stat-value" id="rpWords">0</div><div class="stat-sub">按完成天数估算</div></div>' +
        "</div>" +
        '<div class="card card-pad mt14">' +
          '<h2 class="sec-title"><i data-lucide="bar-chart-3"></i>每月完成进度</h2>' +
          '<div id="monProg"></div>' +
        "</div>" +
      "</div>";
  }

  // ---------- 今日学习 ----------
  function renderHero() {
    $("heroDay").textContent = "DAY " + state.day + " · " + fmtDateW(state.day);
    $("heroTitle").textContent = "第 " + state.day + " 天 · 今日 " + flat.length + " 词";
    var si = stageIndexOfDay(state.day);
    $("heroGoal").textContent = "第" + (si + 1) + "阶段「" + STAGES[si].name + "」 · 今天的 5 个区：" + plan.map(function (s) { return s.sec.name; }).join(" · ") + " · 6区测试";
    $("stStreak").textContent = streak() + " 天";
    $("stDone").textContent = state.done.length + " / 365";
    $("stTotal").textContent = TOTAL_WORDS + " 词";
    var doneToday = state.done.indexOf(state.day) >= 0;
    $("heroDone").innerHTML = doneToday ? '<i data-lucide="check-circle"></i>已完成' : '<i data-lucide="check"></i>标记完成';
    refreshIcons();
  }

  function renderControls() {
    var t = $("playTxt");
    if (t) t.textContent = state.playing ? "暂停" : "播放";
    var hp = $("heroPlay");
    if (hp) hp.innerHTML = state.playing ? '<i data-lucide="pause"></i>暂停' : '<i data-lucide="play"></i>开始播放';
    renderFloat();
    refreshIcons();
  }

  // 悬浮播放条：学习中（播放中或已离开开头）且在今日学习页时显示
  function renderFloat() {
    var fc = $("floatCtl");
    if (!fc) return;
    var show = state.view === "dashboard" && (state.playing || state.idx > 0);
    fc.style.display = show ? "flex" : "none";
    var fp = $("fcPlay");
    if (fp) fp.innerHTML = state.playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    refreshIcons();
  }

  function renderRound() {
    var el = $("roundInfo");
    if (!el) return;
    var doneToday = state.done.indexOf(state.day) >= 0;
    if (state.round > 0) {
      el.textContent = "已播完 " + state.round + " 轮" + (doneToday ? " · 已打卡" : " · 学完去 6区 测试打卡");
    } else {
      el.textContent = doneToday ? "今天已通过测试打卡" : "";
    }
  }

  function renderSections() {
    var box = $("sections");
    box.innerHTML = "";
    plan.forEach(function (s, si) {
      var chip = document.createElement("button");
      chip.className = "chip" + (s.sec.kind !== "cat" ? " phonic" : "");
      chip.textContent = (si + 1) + ". " + s.sec.name;
      chip.title = s.sec.tip || s.sec.en;
      chip.onclick = function () { playFrom(si * PER_SECTION); };
      box.appendChild(chip);
    });
  }

  function renderList() {
    var box = $("wordlist");
    box.innerHTML = "";
    plan.forEach(function (s, si) {
      var band = document.createElement("div");
      band.className = "band";
      var head = document.createElement("div");
      head.className = "bandHead";
      head.innerHTML = "<span class='bandName'>" + (si + 1) + "区 · " + s.sec.name + "<small>" + s.sec.en + "</small></span>";
      var pb = document.createElement("button");
      pb.className = "miniBtn";
      pb.textContent = "播放本区";
      pb.onclick = function () { playFrom(si * PER_SECTION); };
      head.appendChild(pb);
      band.appendChild(head);
      if (s.sec.tip) {
        var tip = document.createElement("div");
        tip.className = "bandTip";
        tip.textContent = "发音提示：" + s.sec.tip;
        band.appendChild(tip);
      }
      var grid = document.createElement("div");
      grid.className = "wgrid";
      s.items.forEach(function (it, wi) {
        var gi = si * PER_SECTION + wi;
        var row = document.createElement("button");
        row.className = "wrow";
        row.id = "w" + gi;
        if (it.type === "pair") {
          var ia2 = ipaOf(it.w[0]), ib2 = ipaOf(it.w[2]);
          row.innerHTML = "<b>" + it.w[0] + " / " + it.w[2] + "</b>" +
            ((ia2 || ib2) ? "<span class='ipa'>" + ia2 + " · " + ib2 + "</span>" : "") +
            "<span>" + it.w[1] + " · " + it.w[3] + "</span>";
        } else {
          var ip = ipaOf(it.w[0]);
          row.innerHTML = "<b>" + it.w[0] + "</b>" +
            (ip ? "<span class='ipa'>" + ip + "</span>" : "") +
            "<span>" + it.w[1] + "</span>";
        }
        row.onclick = function () { playFrom(gi); };
        grid.appendChild(row);
      });
      band.appendChild(grid);
      box.appendChild(band);
    });
  }

  function renderCurrent() {
    if (state.idx >= flat.length) return;
    var cur = flat[state.idx];
    var it = cur.item;
    if (it.type === "pair") {
      $("bigWord").textContent = it.w[0] + "  /  " + it.w[2];
      var ia = ipaOf(it.w[0]), ib = ipaOf(it.w[2]);
      $("bigIpa").textContent = (ia || ib) ? ia + "  ·  " + ib : "";
      $("bigZh").textContent = it.w[1] + " · " + it.w[3];
    } else {
      $("bigWord").textContent = it.w[0];
      $("bigIpa").textContent = ipaOf(it.w[0]);
      $("bigZh").textContent = it.w[1];
    }
    $("bigSec").textContent = "第" + (cur.secIdx + 1) + "区 · " + cur.sec.name + (cur.sec.tip ? "（" + cur.sec.tip + "）" : "");
    $("counter").textContent = "第 " + (state.idx + 1) + " / " + flat.length + " 词";
    $("bar").style.width = Math.round(((state.idx + 1) / flat.length) * 100) + "%";
  }

  function highlightRow() {
    var old = document.querySelector(".wrow.cur");
    if (old) old.classList.remove("cur");
    var el = $("w" + state.idx);
    if (!el) return;
    el.classList.add("cur");
    // 像歌词一样：当前词始终停在屏幕上方区域，页面向上走（iOS 上 scrollIntoView 经常失效，手动滚）
    var r = el.getBoundingClientRect();
    if (r.top < 90 || r.top > window.innerHeight * 0.5) {
      var y = window.pageYOffset + r.top - Math.round(window.innerHeight * 0.18);
      window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
    }
  }

  // ---------- 课程地图 ----------
  function renderCalendar() {
    var cal = $("calendar");
    if (!cal) return;
    var todayDoy = dayOfYear(new Date());
    var doy = 1;
    var html = "";
    for (var m = 0; m < 12; m++) {
      html += "<div class='mon'><div class='monName'>" + (m + 1) + "月</div><div class='monGrid'>";
      var first = new Date(YEAR, m, 1).getDay();
      for (var e = 0; e < first; e++) html += "<div class='dcell empty'></div>";
      for (var d = 1; d <= MON_DAYS[m]; d++) {
        var cls = "dcell";
        if (state.done.indexOf(doy) >= 0) cls += " done";
        if (doy === todayDoy) cls += " today";
        if (doy === state.day) cls += " sel";
        html += "<div class='" + cls + "' data-doy='" + doy + "' title='第 " + doy + " 天'>" + d + "</div>";
        doy++;
      }
      html += "</div></div>";
    }
    cal.innerHTML = html;
    cal.querySelectorAll(".dcell[data-doy]").forEach(function (c) {
      c.onclick = function () {
        setDay(parseInt(c.getAttribute("data-doy"), 10), false);
        showView("dashboard");
      };
    });
  }

  // ---------- 复习中心 ----------
  function renderReview() {
    var box = $("reviewList");
    if (!box) return;
    var days = state.done.slice().sort(function (a, b) { return b - a; });
    if (!days.length) {
      box.innerHTML = "<div class='emptyTip'>还没有完成记录。回到「今日学习」播完一轮 50 词就自动打卡。</div>";
      return;
    }
    var html = "";
    days.forEach(function (d) {
      html += "<div class='revRow'><div><div class='rv-name'>第 " + d + " 天 · " + fmtDateW(d) + "</div>" +
        "<div class='rv-sub'>5 个区 · 50 词</div></div>" +
        "<div class='flex'><span class='tag green'>已完成</span>" +
        "<button class='btn btn-outline btn-sm' data-rev='" + d + "'><i data-lucide='play'></i>复习</button></div></div>";
    });
    box.innerHTML = html;
    box.querySelectorAll("[data-rev]").forEach(function (b) {
      b.onclick = function () {
        setDay(parseInt(b.getAttribute("data-rev"), 10), false);
        showView("dashboard");
        playFrom(0);
      };
    });
    refreshIcons();
  }

  // ---------- 词汇库 ----------
  var vocabSel = 0;
  function renderVocabCats() {
    var box = $("vocabCats");
    if (!box || box.childElementCount) { renderVocabList(); return; }
    STAGES.forEach(function (st, si) {
      var h = document.createElement("div");
      h.className = "vcStage";
      h.textContent = "第" + (si + 1) + "阶段 · " + st.name;
      box.appendChild(h);
      var row = document.createElement("div");
      row.className = "vcRow";
      st.subs.forEach(function (n) {
        var idx = IDX_BY_NAME[n];
        if (idx === undefined) return;
        var chip = document.createElement("button");
        chip.className = "chip" + (ALL_SECTIONS[idx].kind !== "cat" ? " phonic" : "") + (idx === vocabSel ? " on" : "");
        chip.textContent = n;
        chip.onclick = function () {
          vocabSel = idx;
          box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
          chip.classList.add("on");
          renderVocabList();
        };
        row.appendChild(chip);
      });
      box.appendChild(row);
    });
    renderVocabList();
  }
  function renderVocabList() {
    var list = $("vocabList");
    var sec = ALL_SECTIONS[vocabSel];
    var words;
    if (sec.kind === "cat") words = WORD_DATA.categories[sec.ref].words.map(function (w) { return { en: w[0], zh: w[1] }; });
    else if (sec.kind === "sound") words = WORD_DATA.phonics[sec.ref].words.map(function (w) { return { en: w[0], zh: w[1] }; });
    else {
      words = [];
      WORD_DATA.phonics[sec.ref].pairs.forEach(function (p) {
        words.push({ en: p[0], zh: p[1] });
        words.push({ en: p[2], zh: p[3] });
      });
    }
    $("vocabCount").textContent = sec.name + " · 共 " + words.length + " 词" + (sec.tip ? " · " + sec.tip : "");
    list.innerHTML = "";
    words.forEach(function (w) {
      var row = document.createElement("button");
      row.className = "wrow";
      var ip = ipaOf(w.en);
      row.innerHTML = "<b>" + w.en + "</b>" +
        (ip ? "<span class='ipa'>" + ip + "</span>" : "") +
        "<span>" + w.zh + "</span>";
      row.onclick = function () { speakSingle(w.en, w.zh); };
      list.appendChild(row);
    });
  }

  // ---------- 能力报告 ----------
  function renderStats() {
    $("rpStreak").textContent = streak() + " 天";
    $("rpDone").textContent = state.done.length + " 天";
    $("rpDonePct").textContent = "全年进度 " + Math.round(state.done.length / DAY_COUNT * 100) + "%";
    $("rpRounds").textContent = state.totalRounds;
    $("rpWords").textContent = Math.min(state.done.length * 50, TOTAL_WORDS) + " 词";
    var box = $("monProg");
    var html = "";
    var doy = 1;
    for (var m = 0; m < 12; m++) {
      var cnt = 0;
      for (var d = 0; d < MON_DAYS[m]; d++) { if (state.done.indexOf(doy + d) >= 0) cnt++; }
      var pct = Math.round(cnt / MON_DAYS[m] * 100);
      html += "<div class='monProg'><span class='mp-name'>" + (m + 1) + "月</span>" +
        "<div class='mp-bar'><div class='mp-fill' style='width:" + pct + "%'></div></div>" +
        "<span class='mp-val'>" + cnt + "/" + MON_DAYS[m] + "</span></div>";
      doy += MON_DAYS[m];
    }
    box.innerHTML = html;
  }

  // ---------- 公共 ----------
  function refreshIcons() {
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function renderTop() {
    $("streakNum").textContent = streak();
    var now = new Date();
    $("dateChip").textContent = (now.getMonth() + 1) + "月" + now.getDate() + "日 " + WEEK[now.getDay()];
    $("footDay").textContent = "Day " + state.day;
    var pct = Math.round(state.done.length / DAY_COUNT * 100);
    $("footPct").textContent = pct + "%";
    $("footBar").style.width = pct + "%";
    var badge = $("reviewBadge");
    if (state.done.length) { badge.hidden = false; badge.textContent = state.done.length; }
    else badge.hidden = true;
  }

  function markDone(day) {
    if (state.done.indexOf(day) < 0) {
      state.done.push(day);
      store.set("done", state.done);
      renderTop();
      renderHero();
      if (state.view === "map") renderCalendar();
      if (state.view === "review") renderReview();
      if (state.view === "stats") renderStats();
    }
  }

  function setDay(d, autoplay) {
    state.day = Math.min(Math.max(d, 1), DAY_COUNT);
    store.set("day", state.day);
    stopSpeech();
    state.playing = false;
    state.idx = 0;
    state.round = 0;
    buildDay();
    renderTop();
    renderHero();
    renderSections();
    renderList();
    renderCurrent();
    renderControls();
    renderRound();
    renderQuizIntro();
    if (state.view === "map") renderCalendar();
    if (autoplay) playLoop();
  }

  // ---------- 声音下拉 ----------
  function fillVoiceSelects() {
    var enSel = $("enVoice"), zhSel = $("zhVoice");
    if (!enSel) return;
    function fill(sel, match, saved, current) {
      var keep = sel.value;
      sel.innerHTML = "";
      var o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = current ? "自动（" + current.name + "）" : "自动（跟随系统声音）";
      sel.appendChild(o0);
      voices.forEach(function (v) {
        if (v.lang && v.lang.replace("_", "-").indexOf(match) === 0) {
          var o = document.createElement("option");
          o.value = v.name; o.textContent = v.name;
          sel.appendChild(o);
        }
      });
      // 保留用户的选择：选了"自动"就停在"自动"，不再跳回具体声音
      sel.value = keep || saved || "";
    }
    fill(enSel, "en", settings.enVoice, enVoice);
    fill(zhSel, "zh", settings.zhVoice, zhVoice);
  }

  // ---------- 绑定 ----------
  function bind() {
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.onclick = function () { showView(b.getAttribute("data-view")); };
    });
    $("menuBtn").onclick = function () { $("sidebar").classList.toggle("open"); };

    $("heroPlay").onclick = playPause;
    $("heroDone").onclick = function () {
      if (state.done.indexOf(state.day) >= 0) { toast("今天已打卡"); return; }
      toast("去 6区 完成测试就自动打卡");
      $("quizBox").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    $("heroPrev").onclick = function () { setDay(state.day - 1, false); };
    $("heroNext").onclick = function () {
      if (state.done.indexOf(state.day) < 0) { toast("先在 6区 通过今天的测试（20题对16题）才能进下一天"); return; }
      setDay(state.day + 1, false);
    };

    $("playBtn").onclick = playPause;
    $("prevBtn").onclick = function () { jumpTo(state.idx - 1, true); };
    $("nextBtn").onclick = function () { jumpTo(state.idx + 1, true); };
    $("againBtn").onclick = function () { jumpTo(state.idx, true); };
    $("fcPlay").onclick = playPause;
    $("fcPrev").onclick = function () { jumpTo(state.idx - 1, true); };
    $("fcNext").onclick = function () { jumpTo(state.idx + 1, true); };

    $("rateRange").value = settings.ratePct;
    $("ratePct").textContent = settings.ratePct + "%";
    $("rateRange").oninput = function () {
      settings.ratePct = parseInt(this.value, 10);
      $("ratePct").textContent = settings.ratePct + "%";
      saveSettings();
    };
    document.querySelectorAll("#repeatToggle button").forEach(function (b) {
      b.classList.toggle("active", parseInt(b.getAttribute("data-repeat"), 10) === settings.repeat);
      b.onclick = function () {
        settings.repeat = parseInt(b.getAttribute("data-repeat"), 10);
        saveSettings();
        document.querySelectorAll("#repeatToggle button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      };
    });

    $("pauseSel").onchange = function () { settings.pause = parseInt(this.value, 10); saveSettings(); };
    $("zhChk").onchange = function () { settings.zhOn = this.checked; saveSettings(); };
    $("loopChk").onchange = function () { settings.loop = this.checked; saveSettings(); };
    $("enVoice").onchange = function () { settings.enVoice = this.value; saveSettings(); pickVoices(); };
    $("zhVoice").onchange = function () { settings.zhVoice = this.value; saveSettings(); pickVoices(); };
    $("pauseSel").value = String(settings.pause);
    $("zhChk").checked = settings.zhOn;
    $("loopChk").checked = settings.loop;

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (state.view !== "dashboard") return;
      if (e.code === "Space") { e.preventDefault(); playPause(); }
      if (e.code === "ArrowLeft") jumpTo(state.idx - 1, true);
      if (e.code === "ArrowRight") jumpTo(state.idx + 1, true);
    });
  }

  // ---------- 启动 ----------
  buildViews();
  bind();
  setDay(nextUndone(), false);
  showView("dashboard");
  refreshIcons();

  // ---------- 云端同步（换浏览器/换手机不丢学习记录） ----------
  (function () {
    if (!window.fetch) return;
    var APP = "words";
    function collect() {
      var o = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("ldw_") === 0) {
          try { o[k.slice(4)] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
        }
      }
      return o;
    }
    function hasProgress(b) {
      return !!(b && ((b.done || []).length || (b.totalRounds || 0) > 0 || (b.day || 1) > 1));
    }
    var timer = null;
    function push() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        try {
          store.set("updatedAt", Date.now());
          fetch("/.netlify/functions/progress?app=" + APP, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(collect())
          }).catch(function () {});
        } catch (e) {}
      }, 800);
    }
    var _set = store.set;
    store.set = function (k, v) { _set(k, v); if (k !== "updatedAt") push(); };
    fetch("/.netlify/functions/progress?app=" + APP)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cloud) {
        var local = collect();
        if (!cloud) { if (hasProgress(local)) push(); return; }
        var lt = local.updatedAt || 0, ct = cloud.updatedAt || 0;
        var lp = hasProgress(local), cp = hasProgress(cloud);
        if (!lp && cp || (lp && cp && ct > lt)) {
          Object.keys(cloud).forEach(function (k) {
            try { localStorage.setItem("ldw_" + k, JSON.stringify(cloud[k])); } catch (e) {}
          });
          if (!sessionStorage.getItem("cloudReloaded")) {
            sessionStorage.setItem("cloudReloaded", "1");
            location.reload();
          }
        } else if (lp && (!cp || lt > ct)) { push(); }
      })
      .catch(function () {});
  })();
})();
