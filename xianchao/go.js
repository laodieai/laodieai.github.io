// 老爹现炒饭店扫码点菜：GitHub 固定入口 → 跳到老爹 Mac 上正在运行的点菜系统（公网网址写在 live.json）
(function () {
  var REPO_API = 'https://api.github.com/repos/laodieai/laodieai.github.io/contents/xianchao/live.json?ref=main';
  function timeout(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]); }
  function clean(u) { u = String(u || '').trim().replace(/\/+$/, ''); return /^https:\/\/[a-z0-9.-]+$/i.test(u) ? u : ''; }
  function fromPages() { return timeout(fetch('live.json?ts=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }), 6000).then(function (j) { return clean(j.url); }); }
  function fromApi() {
    return timeout(fetch(REPO_API + '&ts=' + Date.now(), { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json' } }).then(function (r) { return r.json(); }), 6000).then(function (j) { return clean(j.url); });
  }
  function alive(u) { return u ? timeout(fetch(u + '/api/ping?ts=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }), 8000).then(function (j) { if (!j.ok) throw 0; return u; }) : Promise.reject(0); }
  window.goLive = function (path, failHtml) {
    var tried = {};
    function tryUrl(get) { return get().then(function (u) { if (!u || tried[u]) throw 0; tried[u] = 1; return alive(u); }); }
    function attempt() {
      return tryUrl(fromPages).catch(function () { return tryUrl(fromApi); });
    }
    attempt().catch(function () { tried = {}; return new Promise(function (r) { setTimeout(r, 2500); }).then(attempt); })
      .then(function (u) { location.replace(u + path); })
      .catch(function () { var m = document.getElementById('msg'); if (m) m.innerHTML = failHtml; });
  };
})();
