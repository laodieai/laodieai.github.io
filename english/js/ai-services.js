/* ============================================================
 * AI 服务接口层（可替换，不含任何密钥）
 * ------------------------------------------------------------
 * 本站是纯静态 GitHub Pages，没有后端。浏览器端代码人人可见，
 * 因此【绝不能】把模型 API Key 写在这里或提交到 Git。
 *
 * 以后想启用 AI：自己部署一个小后端（Cloudflare Worker /
 * Vercel / 自己的服务器都可以，免费额度通常够用），由后端保管
 * 密钥并转发请求，然后把下面的 ENDPOINT 填成后端地址即可，
 * 网站其余代码不用改。后端约定见 window.EngAI.guide。
 * ============================================================ */
(function(){
  "use strict";

  /* 以后填这里，例如："https://你的-worker.workers.dev/api/english"
     留空字符串 = 尚未配置，所有 AI 功能显示「尚未配置」，不影响基础课程 */
  var ENDPOINT = "";
  var TIMEOUT_MS = 20000;

  function notConfigured(kindName){
    return { ok:false, code:"not_configured",
      message:"AI「"+kindName+"」尚未配置。发音、听力、跟读、听写、测试等基础功能都可离线正常使用。" };
  }
  function fail(kindName, err){
    var msg = err && err.name==="AbortError" ? "AI 服务响应超时，请点重试"
            : "连不上 AI 服务（网络或后端未启动），请点重试";
    return { ok:false, code:"request_failed", message:msg };
  }

  /* 统一 POST：path 形如 "/chat"，payload 由后端自己解释 */
  function post(path, kindName, payload){
    if(!ENDPOINT) return Promise.resolve(notConfigured(kindName));
    var ctrl = (typeof AbortController!=="undefined") ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(ENDPOINT.replace(/\/+$/,"")+path, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload || {}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r){
      clearTimeout(timer);
      if(!r.ok) return { ok:false, code:"http_"+r.status, message:"AI 服务返回错误（"+r.status+"），请点重试" };
      return r.json().then(function(d){ return { ok:true, data:d }; })
        .catch(function(){ return { ok:false, code:"bad_response", message:"AI 服务返回格式不正确，请点重试" }; });
    }).catch(function(e){ clearTimeout(timer); return fail(kindName, e); });
  }

  window.EngAI = {
    configured: !!ENDPOINT,
    endpoint: ENDPOINT,
    /* 情景对话：{message, mode:"bilingual"|"english", day} -> 后端回 {reply:"..."} */
    chat: function(message, opts){
      opts = opts || {};
      return post("/chat", "情景对话", { message:message, mode:opts.mode||"bilingual", day:opts.day||1 });
    },
    /* 语法/拼写批改：{text, ref} -> {reply:"..."} */
    correct: function(text, ref){
      return post("/correct", "语法批改", { text:text, ref:ref||"" });
    },
    /* 书写评分：{text, prompt} -> {reply:"..."} */
    writingScore: function(text, prompt){
      return post("/writing", "书写评分", { text:text, prompt:prompt||"" });
    },
    /* 以下三类以后接专门服务（音素级发音评估 / STT / 高质量 TTS），
       未配置时同样明确返回 not_configured，不伪装 */
    pronounce: function(){ return Promise.resolve(notConfigured("音素级发音评估")); },
    stt:       function(){ return Promise.resolve(notConfigured("语音转文字")); },
    tts:       function(){ return Promise.resolve(notConfigured("高质量真人发音")); },
    guide:
      "配置方法（不要把密钥放在网页里）：\n"+
      "1) 部署一个小后端（推荐 Cloudflare Worker 免费版）。\n"+
      "2) 密钥只保存在后端的环境变量里（如 API_KEY），前端代码永远接触不到。\n"+
      "3) 后端实现 POST /chat，收 {message, mode, day}，回 {reply:\"...\"}。\n"+
      "4) 把本文件顶部的 ENDPOINT 改成后端地址并重新部署网站即可。\n"+
      "没配置之前，浏览器自带发音、麦克风录音对照、听写校对、间隔复习和测试全部正常可用。"
  };
})();
