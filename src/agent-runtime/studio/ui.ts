/**
 * Studio 界面 —— 零依赖单页应用（中文）。
 *
 * 由网关在 GET /studio 直接吐出，老板用浏览器打开即可：
 *  左：对话式创建（说一句大白话 → 自动解析成员工草稿）
 *  中：已上线的数字员工卡片（可试运行 / 下线）
 *  右：试运行面板（回复 + 执行轨迹，能看到"查了哪些资料、有没有外发"）
 *
 * 不引入任何前端框架与 CDN，纯原生 JS，离线可用（契合本地私有化定位）。
 */
export const STUDIO_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>FyqyClaw 数字员工工作台</title>
<style>
  :root{
    --bg:#f7f7f5; --card:#ffffff; --line:#e5e3dd; --text:#2c2c2a; --muted:#6b6a65;
    --accent:#185FA5; --accent-soft:#E6F1FB; --ok:#3B6D11; --ok-soft:#EAF3DE; --warn:#854F0B; --warn-soft:#FAEEDA;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#1c1c1a; --card:#252523; --line:#3a3a37; --text:#eeede8; --muted:#a3a29b;
           --accent:#85B7EB; --accent-soft:#0C447C; --ok:#97C459; --ok-soft:#27500A; --warn:#EF9F27; --warn-soft:#633806; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
  header{padding:20px 24px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  header h1{margin:0 0 4px;font-size:16px;font-weight:500}
  header p{margin:0;color:var(--muted);font-size:13px}
  header a{color:var(--accent);text-decoration:none;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 12px;white-space:nowrap}
  .wrap{display:grid;grid-template-columns:340px 1fr 380px;gap:16px;padding:16px;align-items:start}
  @media (max-width:1180px){ .wrap{grid-template-columns:1fr} }
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  .card h2{margin:0 0 10px;font-size:14px;font-weight:500}
  .card h3{margin:14px 0 6px;font-size:13px;font-weight:500;color:var(--muted)}
  .hint{color:var(--muted);font-size:12px;margin:0 0 10px}
  textarea,input,select{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);font:inherit;font-size:13px}
  textarea{resize:vertical;min-height:64px}
  button{cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--text);border-radius:8px;padding:7px 12px;font:inherit;font-size:13px}
  button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
  @media (prefers-color-scheme: dark){ button.primary{color:#042C53} }
  button:disabled{opacity:.5;cursor:not-allowed}
  .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .chip{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;color:var(--muted)}
  .chip:hover{border-color:var(--accent);color:var(--accent)}
  .reply{white-space:pre-wrap;background:var(--accent-soft);border-radius:8px;padding:10px;font-size:13px;margin:10px 0}
  .emp{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px}
  .emp.sel{border-color:var(--accent)}
  .emp .t{font-weight:500;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
  .emp .s{color:var(--muted);font-size:12px;margin:4px 0 8px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{font-size:12px;border-radius:999px;padding:2px 9px;background:var(--ok-soft);color:var(--ok)}
  .tag.g{background:var(--warn-soft);color:var(--warn)}
  .trace{font-size:12px;color:var(--muted);border-left:2px solid var(--line);padding-left:10px;margin-top:10px}
  .trace div{margin:3px 0}
  .out{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:13px;margin-top:10px}
  .cb{display:flex;align-items:center;gap:6px;font-size:13px;margin:4px 0;color:var(--text)}
  .cb input{width:auto}
  .empty{color:var(--muted);font-size:13px;padding:12px 0}
  .sig{margin-top:8px;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<header>
  <div>
    <h1>数字员工工作台</h1>
    <p>不用写代码：说一句话，或选一选，就能做出你自己的 AI 数字员工，并当场试用。</p>
  </div>
  <a href="/kb">知识库管理 →</a>
  <a href="/platform">平台管理 →</a>
</header>

<div class="wrap">
  <section class="card">
    <h2>① 用一句话创建</h2>
    <p class="hint">像跟同事交代事情一样说就行。</p>
    <textarea id="chatInput" placeholder="例：做一个客服数字员工，读产品资料，回答客户询价，回复要简洁"></textarea>
    <div class="chips">
      <span class="chip" data-ex="做一个客服数字员工，读产品资料，回答客户询价，回复简洁">客服示例</span>
      <span class="chip" data-ex="帮我审采购合同的风险条款，读合同法务资料">合同示例</span>
      <span class="chip" data-ex="核发票能不能报销，按公司报销制度来">报销示例</span>
      <span class="chip" data-ex="给新产品写朋友圈文案，读产品资料">文案示例</span>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="btnChat">解析这句话</button>
      <button id="btnForm">手动填写</button>
    </div>
    <div class="reply" id="chatReply" style="display:none"></div>

    <h3>员工设置</h3>
    <label class="hint">名称</label>
    <input id="fName" placeholder="如：客服小飞"/>
    <label class="hint" style="margin-top:8px;display:block">角色</label>
    <select id="fRole"></select>
    <label class="hint" style="margin-top:8px;display:block">一句话业务场景</label>
    <textarea id="fScenario" placeholder="它具体帮你干什么"></textarea>
    <label class="hint" style="margin-top:8px;display:block">它可以读哪些资料</label>
    <div id="fCats"></div>
    <label class="hint" style="margin-top:8px;display:block">数据范围</label>
    <select id="fClear"></select>
    <label class="hint" style="margin-top:8px;display:block">回复风格</label>
    <select id="fStyle"></select>
    <label class="cb" style="margin-top:10px">
      <input type="checkbox" id="fExternal"/> 允许对接外部系统（合同/发票/简历类默认关闭）
    </label>
    <div class="row" style="margin-top:12px">
      <button class="primary" id="btnCreate">创建并上线</button>
    </div>
    <div class="sig">晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心</div>
  </section>

  <section class="card">
    <h2>② 已上线的数字员工</h2>
    <p class="hint">创建后立即生效，可随时试运行或下线。</p>
    <div id="empList"><div class="empty">还没有数字员工，先用左边创建吧。</div></div>
  </section>

  <section class="card">
    <h2>③ 当场试一下</h2>
    <p class="hint" id="tryWho">先在中间选一个数字员工。</p>
    <textarea id="tryInput" placeholder="输入一个真实问题，看看它怎么答"></textarea>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="btnTry" disabled>试运行</button>
    </div>
    <div id="tryTrace"></div>
    <div id="tryOut"></div>
  </section>
</div>

<script>
var state = { blueprints:null, employees:[], selected:null, draft:{} };

function api(path, method, body){
  return fetch(path, {
    method: method || 'GET',
    headers: { 'content-type':'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){ return r.json().then(function(j){ if(!r.ok){ throw new Error(j.error || '请求失败'); } return j; }); });
}

function el(id){ return document.getElementById(id); }

function loadBlueprints(){
  return api('/api/studio/blueprints').then(function(bp){
    state.blueprints = bp;
    var opts = bp.roles.map(function(r){
      return '<option value="' + r.role + '">' + r.label + ' — ' + r.hint + '</option>';
    }).join('');
    el('fRole').innerHTML = opts;
    el('fClear').innerHTML = bp.clearances.map(function(c){
      return '<option value="' + c.value + '">' + c.label + '（' + c.hint + '）</option>';
    }).join('');
    el('fStyle').innerHTML = bp.styles.map(function(s){
      return '<option value="' + s.value + '">' + s.label + ' — ' + s.hint + '</option>';
    }).join('');
    el('fCats').innerHTML = bp.categories.map(function(c){
      return '<label class="cb"><input type="checkbox" value="' + c.value + '" data-cat="1"/> ' + c.label + ' <span class="hint">（' + c.hint + '）</span></label>';
    }).join('');
    applyRoleDefaults();
  });
}

function roleBp(role){
  if(!state.blueprints) return null;
  for(var i=0;i<state.blueprints.roles.length;i++){
    if(state.blueprints.roles[i].role === role) return state.blueprints.roles[i];
  }
  return null;
}

function applyRoleDefaults(){
  var bp = roleBp(el('fRole').value);
  if(!bp) return;
  if(!el('fName').value) el('fName').placeholder = bp.suggestedName;
  el('fClear').value = bp.defaultClearance;
  var boxes = el('fCats').querySelectorAll('input[data-cat]');
  for(var i=0;i<boxes.length;i++){
    boxes[i].checked = bp.defaultCategories.indexOf(boxes[i].value) >= 0;
  }
  el('fExternal').checked = bp.defaultAllowExternal;
  el('fExternal').disabled = !bp.externalAllowed;
}

function readForm(){
  var cats = [];
  var boxes = el('fCats').querySelectorAll('input[data-cat]');
  for(var i=0;i<boxes.length;i++){ if(boxes[i].checked) cats.push(boxes[i].value); }
  return {
    name: el('fName').value,
    role: el('fRole').value,
    scenario: el('fScenario').value,
    categories: cats,
    clearance: el('fClear').value,
    allowExternal: el('fExternal').checked,
    outputStyle: el('fStyle').value
  };
}

function fillForm(d){
  if(d.name !== undefined) el('fName').value = d.name || '';
  if(d.role) el('fRole').value = d.role;
  if(d.scenario !== undefined) el('fScenario').value = d.scenario || '';
  if(d.clearance) el('fClear').value = d.clearance;
  if(d.outputStyle) el('fStyle').value = d.outputStyle;
  if(d.allowExternal !== undefined) el('fExternal').checked = !!d.allowExternal;
  if(d.categories && d.categories.length){
    var boxes = el('fCats').querySelectorAll('input[data-cat]');
    for(var i=0;i<boxes.length;i++){ boxes[i].checked = d.categories.indexOf(boxes[i].value) >= 0; }
  } else if(d.role){
    applyRoleDefaults();
  }
}

function sendChat(){
  var text = el('chatInput').value.trim();
  if(!text) return;
  el('chatReply').style.display = 'block';
  el('chatReply').textContent = '正在理解…';
  api('/api/studio/chat', 'POST', { text: text, draft: readForm() }).then(function(res){
    el('chatReply').textContent = res.reply;
    state.draft = res.draft || {};
    fillForm(state.draft);
  }).catch(function(e){ el('chatReply').textContent = '出错了：' + e.message; });
}

function createEmployee(){
  var d = readForm();
  api('/api/studio/employees', 'POST', { draft: d }).then(function(){
    el('chatReply').style.display = 'block';
    el('chatReply').textContent = '已上线：' + d.name + '。可以在中间卡片里点「试运行」。';
    el('fName').value = ''; el('fScenario').value = '';
    loadEmployees();
  }).catch(function(e){ alert(e.message); });
}

function loadEmployees(){
  return api('/api/studio/employees').then(function(res){
    state.employees = res.employees || [];
    renderEmployees();
  });
}

function renderEmployees(){
  if(!state.employees.length){
    el('empList').innerHTML = '<div class="empty">还没有数字员工，先用左边创建吧。</div>';
    return;
  }
  var html = state.employees.map(function(e){
    var sel = state.selected === e.id ? ' sel' : '';
    var cat = (e.categories || []).map(function(c){ return '<span class="tag">' + c + '</span>'; }).join('');
    var ext = e.allowExternal ? '<span class="tag g">可外发</span>' : '<span class="tag">纯本地</span>';
    var cle = e.clearance === 'confidential' ? '机密' : (e.clearance === 'public' ? '公开' : '内部');
    return '<div class="emp' + sel + '">' +
      '<div class="t"><span>' + e.name + '</span><span class="hint">' + e.role + '</span></div>' +
      '<div class="s">' + (e.scenario || '') + '（数据范围：' + cle + '）</div>' +
      '<div class="tags">' + cat + ext + '</div>' +
      '<div class="row" style="margin-top:10px">' +
        '<button data-try="' + e.id + '">试运行</button>' +
        '<button data-del="' + e.id + '">下线</button>' +
      '</div></div>';
  }).join('');
  el('empList').innerHTML = html;
}

function selectForTry(id){
  state.selected = id;
  var emp = null;
  for(var i=0;i<state.employees.length;i++){ if(state.employees[i].id === id) emp = state.employees[i]; }
  if(emp){
    el('tryWho').textContent = '正在试运行：' + emp.name + '（' + emp.scenario + '）';
    el('btnTry').disabled = false;
  }
  renderEmployees();
}

function tryRun(){
  if(!state.selected) return;
  var msg = el('tryInput').value.trim();
  if(!msg) return;
  el('tryTrace').innerHTML = '<div class="trace">正在运行…</div>';
  el('tryOut').innerHTML = '';
  api('/api/studio/employees/' + state.selected + '/test', 'POST', { message: msg }).then(function(res){
    var tr = (res.trace || []).map(function(t){ return '<div>' + t.detail + '</div>'; }).join('');
    el('tryTrace').innerHTML = tr ? '<div class="trace"><div style="margin-bottom:4px">执行过程</div>' + tr + '</div>' : '';
    var g = res.grounded ? '<span class="tag">有知识库依据</span>' : '<span class="tag g">无依据（不会编造）</span>';
    el('tryOut').innerHTML = '<div class="tags" style="margin-top:10px">' + g + '</div><div class="out">' + (res.reply || '') + '</div>';
  }).catch(function(e){ el('tryTrace').innerHTML = '<div class="trace">出错了：' + e.message + '</div>'; });
}

function removeEmployee(id){
  if(!confirm('确定下线这个数字员工吗？')) return;
  api('/api/studio/employees/' + id, 'DELETE').then(function(){
    if(state.selected === id){ state.selected = null; el('btnTry').disabled = true; el('tryWho').textContent = '先在中间选一个数字员工。'; }
    loadEmployees();
  });
}

document.addEventListener('click', function(ev){
  var t = ev.target;
  if(t.getAttribute && t.getAttribute('data-try')) selectForTry(t.getAttribute('data-try'));
  if(t.getAttribute && t.getAttribute('data-del')) removeEmployee(t.getAttribute('data-del'));
  if(t.getAttribute && t.getAttribute('data-ex')){ el('chatInput').value = t.getAttribute('data-ex'); sendChat(); }
});

el('btnChat').onclick = sendChat;
el('btnCreate').onclick = createEmployee;
el('btnTry').onclick = tryRun;
el('btnForm').onclick = function(){ fillForm(readForm()); el('chatReply').style.display='none'; };
el('fRole').onchange = applyRoleDefaults;

loadBlueprints().then(loadEmployees);
</script>
</body>
</html>`
