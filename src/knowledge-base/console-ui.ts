/**
 * 知识库管理面板界面 —— 零依赖单页（中文）。
 *
 * 由网关在 GET /kb 直接吐出。与 Studio 配套：
 *   Studio 造员工（谁用知识），本页面喂资料（知识从哪来）。
 *
 * 三块内容：
 *   左：录入资料（粘贴正文 / 选本地文本文件）
 *   中：资料清单（按目录筛选，可删除）
 *   右：检索测试（当场验证"这份资料能不能被检索到"）
 */
export const CONSOLE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>FyqyClaw 知识库管理</title>
<style>
  :root{
    --bg:#f7f7f5; --card:#ffffff; --line:#e5e3dd; --text:#2c2c2a; --muted:#6b6a65;
    --accent:#185FA5; --accent-soft:#E6F1FB; --ok:#3B6D11; --ok-soft:#EAF3DE;
    --warn:#854F0B; --warn-soft:#FAEEDA; --bad:#A32D2D; --bad-soft:#FCEBEB;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#1c1c1a; --card:#252523; --line:#3a3a37; --text:#eeede8; --muted:#a3a29b;
           --accent:#85B7EB; --accent-soft:#0C447C; --ok:#97C459; --ok-soft:#27500A;
           --warn:#EF9F27; --warn-soft:#633806; --bad:#F09595; --bad-soft:#501313; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
  header{padding:18px 24px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  header h1{margin:0 0 4px;font-size:16px;font-weight:500}
  header p{margin:0;color:var(--muted);font-size:13px}
  header a{color:var(--accent);text-decoration:none;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 12px}
  .stats{display:flex;gap:20px;padding:12px 24px;border-bottom:1px solid var(--line);flex-wrap:wrap;font-size:13px;color:var(--muted)}
  .stats b{color:var(--text);font-weight:500;font-size:15px}
  .wrap{display:grid;grid-template-columns:360px 1fr 380px;gap:16px;padding:16px;align-items:start}
  @media (max-width:1180px){ .wrap{grid-template-columns:1fr} }
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  .card h2{margin:0 0 10px;font-size:14px;font-weight:500}
  .hint{color:var(--muted);font-size:12px;margin:0 0 8px}
  textarea,input,select{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);font:inherit;font-size:13px}
  textarea{resize:vertical;min-height:70px}
  button{cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--text);border-radius:8px;padding:7px 12px;font:inherit;font-size:13px}
  button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
  @media (prefers-color-scheme: dark){ button.primary{color:#042C53} }
  button.link{border:none;color:var(--bad);padding:4px 6px}
  .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .chip{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:12px;cursor:pointer;color:var(--muted)}
  .chip.on{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
  .doc{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px}
  .doc .t{font-weight:500;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
  .doc .m{color:var(--muted);font-size:12px;margin:4px 0 6px}
  .doc .p{font-size:12px;color:var(--muted);white-space:pre-wrap;max-height:60px;overflow:hidden}
  .tag{font-size:12px;border-radius:999px;padding:2px 9px;background:var(--ok-soft);color:var(--ok);white-space:nowrap}
  .tag.i{background:var(--accent-soft);color:var(--accent)}
  .tag.w{background:var(--warn-soft);color:var(--warn)}
  .hit{border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px}
  .hit .h{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px}
  .hit .x{font-size:12px;white-space:pre-wrap}
  .msg{font-size:13px;border-radius:8px;padding:9px 11px;margin:8px 0}
  .msg.ok{background:var(--ok-soft);color:var(--ok)}
  .msg.bad{background:var(--bad-soft);color:var(--bad)}
  .empty{color:var(--muted);font-size:13px;padding:12px 0}
  .sig{margin-top:10px;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<header>
  <div>
    <h1>知识库管理</h1>
    <p>把公司的制度、产品、客户、培训、合同法务资料放进来，数字员工才有依据可答。</p>
  </div>
  <a href="/studio">数字员工工作台 →</a>
</header>

<div class="stats">
  <span>资料 <b id="sDocs">0</b> 篇</span>
  <span>分块 <b id="sChunks">0</b> 块</span>
  <span>字数 <b id="sChars">0</b></span>
  <span id="sByCat" class="hint"></span>
</div>

<div class="wrap">
  <section class="card">
    <h2>① 录入资料</h2>
    <p class="hint">可以粘贴正文，也可以选一个本地文本文件（.txt/.md/.csv/.json）。</p>
    <label class="hint">放到哪个目录</label>
    <select id="uCat"></select>
    <label class="hint" style="display:block;margin-top:8px">标题</label>
    <input id="uTitle" placeholder="如：差旅与费用报销制度"/>
    <label class="hint" style="display:block;margin-top:8px">数据范围（谁能读）</label>
    <select id="uPerm">
      <option value="internal">内部（推荐，数字员工可读）</option>
      <option value="public">公开（只能对外展示的资料）</option>
      <option value="confidential">机密（客户资料、报价底线）</option>
    </select>
    <label class="hint" style="display:block;margin-top:8px">来源（可选，便于追溯）</label>
    <input id="uSource" placeholder="如：行政部 2026 版制度文件"/>
    <label class="hint" style="display:block;margin-top:8px">正文</label>
    <textarea id="uContent" placeholder="把资料内容粘在这里…"></textarea>
    <div class="row" style="margin-top:8px">
      <input type="file" id="uFile" accept=".txt,.md,.csv,.json,.log" style="font-size:12px"/>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="primary" id="btnUpload">入库</button>
      <button id="btnClear">清空表单</button>
    </div>
    <div id="upMsg"></div>
    <div class="sig">晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心</div>
  </section>

  <section class="card">
    <h2>② 已入库资料</h2>
    <div class="chips" id="catChips"></div>
    <div id="docList"><div class="empty">还没有资料，先在左边录入吧。</div></div>
  </section>

  <section class="card">
    <h2>③ 检索测试</h2>
    <p class="hint">上传完立刻试一句真实的业务问法，看看能不能查到——这一步最值得做。</p>
    <textarea id="qInput" placeholder="例：个人抬头的餐饮发票能报销吗？"></textarea>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="btnSearch">试一下能不能查到</button>
    </div>
    <div id="qMsg"></div>
    <div id="qHits"></div>
  </section>
</div>

<script>
var state = { cats: [], filter: '', docs: [] };

function api(path, method, body){
  return fetch(path, {
    method: method || 'GET',
    headers: { 'content-type':'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){ return r.json().then(function(j){ if(!r.ok){ throw new Error(j.error || '请求失败'); } return j; }); });
}
function el(id){ return document.getElementById(id); }
function esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function loadStats(){
  return api('/api/kb/stats').then(function(s){
    el('sDocs').textContent = s.docCount;
    el('sChunks').textContent = s.chunkCount;
    el('sChars').textContent = s.totalChars;
    var parts = [];
    for (var k in s.byCategory) parts.push(k + ' ' + s.byCategory[k]);
    el('sByCat').textContent = parts.join(' · ');
  });
}

function loadDocs(){
  var q = state.filter ? ('?category=' + encodeURIComponent(state.filter)) : '';
  return api('/api/kb/docs' + q).then(function(res){
    state.docs = res.docs || [];
    renderDocs();
  });
}

function renderDocs(){
  if(!state.docs.length){
    el('docList').innerHTML = '<div class="empty">这个目录下还没有资料。</div>';
    return;
  }
  el('docList').innerHTML = state.docs.map(function(d){
    var permLabel = d.permission === 'confidential' ? '机密' : (d.permission === 'public' ? '公开' : '内部');
    var permCls = d.permission === 'confidential' ? 'tag w' : (d.permission === 'public' ? 'tag i' : 'tag');
    return '<div class="doc">' +
      '<div class="t"><span>' + esc(d.title) + '</span><button class="link" data-del="' + d.id + '">删除</button></div>' +
      '<div class="m"><span class="tag i">' + esc(d.category) + '</span> ' +
        '<span class="' + permCls + '">' + permLabel + '</span> · ' +
        d.chunkCount + ' 块' + (d.source ? (' · ' + esc(d.source)) : '') + '</div>' +
      '<div class="p">' + esc(d.content) + '</div>' +
    '</div>';
  }).join('');
}

function upload(){
  var body = {
    category: el('uCat').value,
    title: el('uTitle').value,
    permission: el('uPerm').value,
    source: el('uSource').value,
    content: el('uContent').value
  };
  el('upMsg').innerHTML = '';
  api('/api/kb/docs', 'POST', body).then(function(res){
    el('upMsg').innerHTML = '<div class="msg ok">已入库：' + esc(res.doc.title) +
      '（' + esc(res.doc.category) + '，切成 ' + res.doc.chunkCount + ' 块）。建议到右边试试能不能查到。</div>';
    el('uTitle').value = ''; el('uContent').value = ''; el('uSource').value = '';
    el('uFile').value = '';
    return Promise.all([loadStats(), loadDocs()]);
  }).catch(function(e){
    el('upMsg').innerHTML = '<div class="msg bad">入库失败：' + esc(e.message) + '</div>';
  });
}

function removeDoc(id){
  if(!confirm('确定删除这份资料吗？删除后数字员工就读不到它了。')) return;
  api('/api/kb/docs/' + id, 'DELETE').then(function(){
    return Promise.all([loadStats(), loadDocs()]);
  });
}

function search(){
  var q = el('qInput').value.trim();
  if(!q) return;
  el('qMsg').innerHTML = '';
  el('qHits').innerHTML = '';
  api('/api/kb/search', 'POST', { query: q, category: state.filter, topK: 5 }).then(function(res){
    var cls = res.grounded ? 'msg ok' : 'msg bad';
    el('qMsg').innerHTML = '<div class="' + cls + '">' + esc(res.verdict) + '</div>';
    el('qHits').innerHTML = (res.hits || []).map(function(h){
      return '<div class="hit">' +
        '<div class="h"><span>' + esc(h.category) + ' · ' + esc(h.title) + '</span><span>相关度 ' + h.score + '</span></div>' +
        '<div class="x">' + esc(h.text) + '</div>' +
      '</div>';
    }).join('');
  }).catch(function(e){
    el('qMsg').innerHTML = '<div class="msg bad">' + esc(e.message) + '</div>';
  });
}

function readFile(f){
  var fr = new FileReader();
  fr.onload = function(){
    el('uContent').value = String(fr.result || '');
    if(!el('uTitle').value) el('uTitle').value = f.name.replace(/\\.[^.]+$/, '');
    el('upMsg').innerHTML = '<div class="msg ok">已读入文件 ' + esc(f.name) + '，确认目录与标题后点「入库」。</div>';
  };
  fr.readAsText(f, 'utf-8');
}

function loadCats(){
  return api('/api/kb/categories').then(function(res){
    state.cats = res.categories || [];
    el('uCat').innerHTML = state.cats.map(function(c){
      return '<option value="' + c.value + '">' + c.value + ' —— ' + c.hint + '</option>';
    }).join('');
    el('catChips').innerHTML = '<span class="chip' + (state.filter ? '' : ' on') + '" data-cat="">全部</span>' +
      state.cats.map(function(c){
        return '<span class="chip' + (state.filter === c.value ? ' on' : '') + '" data-cat="' + c.value + '">' + c.value + '</span>';
      }).join('');
  });
}

document.addEventListener('click', function(ev){
  var t = ev.target;
  if(t.getAttribute && t.getAttribute('data-del')) removeDoc(t.getAttribute('data-del'));
  if(t.getAttribute && t.getAttribute('data-cat') !== null && t.className.indexOf('chip') >= 0){
    state.filter = t.getAttribute('data-cat') || '';
    loadCats().then(loadDocs);
  }
});

el('btnUpload').onclick = upload;
el('btnSearch').onclick = search;
el('btnClear').onclick = function(){
  el('uTitle').value = ''; el('uContent').value = ''; el('uSource').value = ''; el('upMsg').innerHTML = '';
};
el('uFile').onchange = function(ev){
  var f = ev.target.files && ev.target.files[0];
  if(f) readFile(f);
};

loadCats().then(function(){ return Promise.all([loadStats(), loadDocs()]); });
</script>
</body>
</html>`
