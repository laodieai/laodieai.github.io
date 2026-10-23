/* 老爹单词库 - 365天排课 + 双语朗读引擎 */
(function () {
  "use strict";

  var DAY_COUNT = 365;
  var PER_SECTION = 10;
  var SECTIONS_PER_DAY = 5;

  // ---------- 排课：67个分类 + 23个发音专项 = 90种区，每18天一轮，全年约20轮 ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var ALL_SECTIONS = [];
  WORD_DATA.categories.forEach(function (c, i) {
    ALL_SECTIONS.push({ kind: "cat", ref: i, name: c.name, en: c.en, tip: "" });
  });
  WORD_DATA.phonics.forEach(function (p, i) {
    ALL_SECTIONS.push({ kind: p.type, ref: i, name: p.name, en: "Pronunciation", tip: p.tip || "" });
  });

  // 确定性打乱，让每天5个区主题尽量混搭
  var ORDER = ALL_SECTIONS.map(function (_, i) { return i; });
  var rnd = mulberry32(20260921);
  for (var i = ORDER.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var tmp = ORDER[i]; ORDER[i] = ORDER[j]; ORDER[j] = tmp;
  }
  var TEMPLATE_DAYS = Math.floor(ORDER.length / SECTIONS_PER_DAY); // 18

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

  // ---------- 状态 ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("ldw_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ldw_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  var state = {
    day: Math.min(Math.max(store.get("day", dayOfYear(new Date())), 1), DAY_COUNT),
    idx: 0,
    playing: false,
    round: 0,
    done: store.get("done", [])
  };
  var settings = Object.assign(
    { rate: 0.85, zhOn: true, pause: 2500, loop: true, enVoice: "", zhVoice: "" },
    store.get("settings", {})
  );
  function saveSettings() { store.set("settings", settings); }

  // 男声和搞怪声音一律不用，保证朗读音色统一（中英文固定用同一个清晰女声）
  var BAD_VOICE = /Eddy|Reed|Rocko|Grandpa|Fred|Ralph|Albert|Junior|Alex|Daniel|Thomas|Jacques|Majed|Xander|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox/;
  // 一次性迁移：清掉手动选过的声音，回到锁定的清晰女声高清版
  if (settings.v !== 3) {
    settings.enVoice = "";
    settings.zhVoice = "";
    settings.v = 3;
    saveSettings();
  }

  // ---------- 语音 ----------
  var voices = [];
  var enVoice = null, zhVoice = null;
  // 声音列表异步加载，没加载完前绝不开口（否则会临时掉回系统默认声音）
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
        var u = new SpeechSynthesisUtterance(text);
        if (voice) u.voice = voice;
        u.lang = lang;
        u.rate = rate;
        u.onend = function () { resolve(); };
        u.onerror = function () { resolve(); };
        speechSynthesis.speak(u);
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
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  // 页面关闭/刷新时立刻停止朗读
  window.addEventListener("pagehide", stopSpeech);
  window.addEventListener("beforeunload", stopSpeech);

  async function playItem(item, token) {
    var r = settings.rate;
    if (item.type === "pair") {
      var a = item.w[0], az = item.w[1], b = item.w[2], bz = item.w[3];
      await speak(a, enVoice, "en-US", r, token);
      await wait(500, token);
      await speak(b, enVoice, "en-US", r, token);
      await wait(500, token);
      await speak(a, enVoice, "en-US", r * 0.65, token);
      await wait(400, token);
      await speak(b, enVoice, "en-US", r * 0.65, token);
      if (settings.zhOn) { await wait(300, token); await speak(az + "，" + bz, zhVoice, "zh-CN", 0.95, token); }
    } else {
      var en = item.w[0], zh = item.w[1];
      await speak(en, enVoice, "en-US", r, token);          // 常速
      await wait(500, token);
      await speak(en, enVoice, "en-US", r * 0.65, token);    // 慢速
      if (settings.zhOn) { await wait(400, token); await speak(zh, zhVoice, "zh-CN", 0.95, token); }
    }
    await wait(settings.pause, token); // 跟读停顿
  }

  async function playLoop() {
    var token = ++playToken;
    state.playing = true;
    renderControls();
    while (token === playToken) {
      if (state.idx >= flat.length) {
        // 播完一整轮50词：自动标记当天完成并计数
        markDone(state.day);
        state.round++;
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
    if (!window.speechSynthesis) { alert("这个浏览器不支持朗读，请用 Safari 或 Chrome 打开。"); return; }
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

  // 跳到第i词并必定开始播放（点区标题/播放本区/点单词用）
  function playFrom(i) {
    stopSpeech();
    state.playing = false;
    state.idx = Math.min(Math.max(i, 0), flat.length - 1);
    renderCurrent();
    highlightRow();
    renderControls();
    playLoop();
  }

  // ---------- 渲染 ----------
  var flat = [];   // [{sec, item}]
  var plan = [];

  function buildDay() {
    plan = dayPlan(state.day);
    flat = [];
    plan.forEach(function (s, si) {
      s.items.forEach(function (it) { flat.push({ sec: s.sec, secIdx: si, item: it }); });
    });
  }

  function $(id) { return document.getElementById(id); }

  function fmtDate() {
    var d = new Date(new Date().getFullYear(), 0, state.day);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  function renderHeader() {
    $("dayInput").value = state.day;
    $("dateLabel").textContent = "第 " + state.day + " 天（" + fmtDate() + "）";
    $("doneCount").textContent = "今年已完成 " + state.done.length + " / 365 天";
    $("dayInput").classList.toggle("doneToday", state.done.indexOf(state.day) >= 0);
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
      head.innerHTML = "<span class='bandName'>" + (si + 1) + "区 · " + s.sec.name + " <small>" + s.sec.en + "</small></span>";
      var playBtn = document.createElement("button");
      playBtn.className = "miniBtn";
      playBtn.textContent = "播放本区";
      playBtn.onclick = function () { playFrom(si * PER_SECTION); };
      head.appendChild(playBtn);
      band.appendChild(head);
      if (s.sec.tip) {
        var tip = document.createElement("div");
        tip.className = "bandTip";
        tip.textContent = "发音提示：" + s.sec.tip;
        band.appendChild(tip);
      }
      var grid = document.createElement("div");
      grid.className = "grid";
      s.items.forEach(function (it, wi) {
        var gi = si * PER_SECTION + wi;
        var row = document.createElement("button");
        row.className = "wrow";
        row.id = "w" + gi;
        if (it.type === "pair") {
          row.innerHTML = "<b>" + it.w[0] + " / " + it.w[2] + "</b><span>" + it.w[1] + " · " + it.w[3] + "</span>";
        } else {
          row.innerHTML = "<b>" + it.w[0] + "</b><span>" + it.w[1] + "</span>";
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
      $("bigZh").textContent = it.w[1] + " · " + it.w[3];
    } else {
      $("bigWord").textContent = it.w[0];
      $("bigZh").textContent = it.w[1];
    }
    $("bigSec").textContent = "第" + (cur.secIdx + 1) + "区 · " + cur.sec.name + (cur.sec.tip ? "（" + cur.sec.tip + "）" : "");
    $("counter").textContent = "第 " + (state.idx + 1) + " / " + flat.length + " 词";
    var bar = $("bar");
    bar.style.width = Math.round(((state.idx + 1) / flat.length) * 100) + "%";
  }

  function highlightRow() {
    var old = document.querySelector(".wrow.cur");
    if (old) old.classList.remove("cur");
    var el = $("w" + state.idx);
    if (el) {
      el.classList.add("cur");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function renderControls() {
    $("playBtn").textContent = state.playing ? "暂停" : "播放";
    $("playBtn").classList.toggle("playing", state.playing);
  }

  function renderRound() {
    var el = $("roundInfo");
    if (!el) return;
    var doneToday = state.done.indexOf(state.day) >= 0;
    if (state.round > 0) {
      el.textContent = "今天已播完 " + state.round + " 轮" + (doneToday ? " · 已标记完成" : "");
    } else {
      el.textContent = doneToday ? "今天已标记完成" : "";
    }
  }

  function markDone(day) {
    if (state.done.indexOf(day) < 0) {
      state.done.push(day);
      store.set("done", state.done);
      renderHeader();
      renderCalendar();
    }
  }

  // ---------- 打卡日历 ----------
  var MON_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function renderStreak() {
    var el = $("streak");
    if (!el) return;
    var todayDoy = dayOfYear(new Date());
    var n = 0;
    var start = state.done.indexOf(todayDoy) >= 0 ? todayDoy : todayDoy - 1;
    while (start - n >= 1 && state.done.indexOf(start - n) >= 0) n++;
    el.textContent = n > 0 ? "已连续打卡 " + n + " 天 · 共完成 " + state.done.length + " 天" : "共完成 " + state.done.length + " 天";
  }
  function renderCalendar() {
    renderStreak();
    var cal = $("calendar");
    if (!cal) return;
    var todayDoy = dayOfYear(new Date());
    var doy = 1;
    var html = "";
    for (var m = 0; m < 12; m++) {
      html += "<div class='mon'><div class='monName'>" + (m + 1) + "月</div><div class='monGrid'>";
      var first = new Date(new Date().getFullYear(), m, 1).getDay();
      for (var e = 0; e < first; e++) html += "<div class='dcell empty'></div>";
      for (var d = 1; d <= MON_DAYS[m]; d++) {
        var cls = "dcell";
        if (state.done.indexOf(doy) >= 0) cls += " done";
        if (doy === todayDoy) cls += " today";
        if (doy === state.day) cls += " sel";
        html += "<div class='" + cls + "' data-doy='" + doy + "'>" + d + "</div>";
        doy++;
      }
      html += "</div></div>";
    }
    cal.innerHTML = html;
    cal.querySelectorAll(".dcell[data-doy]").forEach(function (c) {
      c.onclick = function () { setDay(parseInt(c.getAttribute("data-doy"), 10), false); };
    });
  }

  function setDay(d, autoplay) {
    state.day = Math.min(Math.max(d, 1), DAY_COUNT);
    store.set("day", state.day);
    stopSpeech();
    state.playing = false;
    state.idx = 0;
    state.round = 0;
    buildDay();
    renderHeader();
    renderSections();
    renderList();
    renderCurrent();
    renderControls();
    renderRound();
    renderCalendar();
    if (autoplay) playLoop();
  }

  // ---------- 控件绑定 ----------
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

  function bind() {
    $("playBtn").onclick = playPause;
    $("calToggle").onclick = function () {
      var cal = $("calendar");
      var open = cal.style.display !== "none";
      cal.style.display = open ? "none" : "grid";
      this.textContent = open ? "打卡日历 ▾" : "打卡日历 ▴";
    };
    $("prevBtn").onclick = function () { jumpTo(state.idx - 1, true); };
    $("nextBtn").onclick = function () { jumpTo(state.idx + 1, true); };
    $("againBtn").onclick = function () { jumpTo(state.idx, true); };
    $("prevDay").onclick = function () { setDay(state.day - 1, false); };
    $("nextDay").onclick = function () { setDay(state.day + 1, false); };
    $("todayBtn").onclick = function () { setDay(dayOfYear(new Date()), false); };
    $("dayInput").onchange = function () { setDay(parseInt(this.value, 10) || 1, false); };
    $("doneBtn").onclick = function () { markDone(state.day); renderHeader(); this.textContent = "已完成"; setTimeout(function () { $("doneBtn").textContent = "标记完成"; }, 1200); };
    $("rateSel").onchange = function () { settings.rate = parseFloat(this.value); saveSettings(); };
    $("pauseSel").onchange = function () { settings.pause = parseInt(this.value, 10); saveSettings(); };
    $("zhChk").onchange = function () { settings.zhOn = this.checked; saveSettings(); };
    $("loopChk").onchange = function () { settings.loop = this.checked; saveSettings(); };
    $("enVoice").onchange = function () { settings.enVoice = this.value; saveSettings(); pickVoices(); };
    $("zhVoice").onchange = function () { settings.zhVoice = this.value; saveSettings(); pickVoices(); };

    $("rateSel").value = String(settings.rate);
    $("pauseSel").value = String(settings.pause);
    $("zhChk").checked = settings.zhOn;
    $("loopChk").checked = settings.loop;

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); playPause(); }
      if (e.code === "ArrowLeft") jumpTo(state.idx - 1, true);
      if (e.code === "ArrowRight") jumpTo(state.idx + 1, true);
    });
  }

  // ---------- 启动 ----------
  bind();
  setDay(state.day, false);
})();
