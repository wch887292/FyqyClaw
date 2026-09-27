/**
 * 平台管理演示页（T3 · 私有化部署 + 权限/审计 + 数字员工市场）。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 *
 * 零依赖中文单页：团队账号（建号 + 登录态）/ 审计流水（实时）/ 数字员工市场（浏览 + 安装）。
 * 仅演示平台底座能力，生产 UI 可替换为 Electron/Web 正式控制台。
 */

export const PLATFORM_HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>平台管理 · 飞扬企源AI</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--line:#334155;--txt:#e2e8f0;--muted:#94a3b8;--brand:#38bdf8;--ok:#34d399;--warn:#fbbf24}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--txt)}
  header{padding:14px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}
  header h1{font-size:16px;margin:0}
  header a{color:var(--brand);text-decoration:none;font-size:13px;margin-left:auto}
  .wrap{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:14px;padding:16px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
  .card h2{font-size:14px;margin:0 0 10px}
  label{display:block;font-size:12px;color:var(--muted);margin:8px 0 4px}
  input,select{width:100%;background:#0b1220;border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:7px 9px;font-size:13px}
  button{background:var(--brand);color:#04222e;border:none;border-radius:6px;padding:8px 12px;font-size:13px;cursor:pointer;margin-top:8px}
  button.ghost{background:transparent;border:1px solid var(--line);color:var(--txt)}
  .row{display:flex;gap:8px;align-items:center}
  .tag{display:inline-block;font-size:11px;background:#0b1220;border:1px solid var(--line);border-radius:99px;padding:2px 8px;color:var(--muted);margin:2px 4px 2px 0}
  .ok{color:var(--ok)}.warn{color:var(--warn)}
  .muted{color:var(--muted);font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:6px 4px;border-bottom:1px solid var(--line)}
  th{color:var(--muted);font-weight:600}
  .item{border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:10px}
  .item b{font-size:13px}
  pre{background:#0b1220;border-radius:6px;padding:8px;font-size:11px;max-height:280px;overflow:auto;margin:0}
  #token{font-size:12px;color:var(--ok);word-break:break-all}
</style></head>
<body>
<header><h1>平台管理 · 企业本地私有化智能体平台</h1><a href="/studio">数字员工工作台 →</a></header>
<div class="wrap">
  <div class="card">
    <h2>① 团队账号 / RBAC</h2>
    <div class="muted" id="authState">未登录（当前以匿名只读视角浏览）</div>
    <div id="token"></div>
    <label>登录账号</label><input id="loginName" value="admin"/>
    <label>登录口令</label><input id="loginPw" type="password" value="admin123"/>
    <button onclick="doLogin()">登录</button>
    <hr style="border-color:var(--line);margin:12px 0"/>
    <label>新建账号 - 名称</label><input id="newName"/>
    <label>新建账号 - 口令</label><input id="newPw" type="password"/>
    <label>角色</label>
    <select id="newRole"><option value="viewer">viewer 只读</option><option value="operator">operator 运营</option><option value="admin">admin 管理员</option></select>
    <button class="ghost" onclick="doCreate()">建账号（需 admin）</button>
    <div class="muted" style="margin-top:10px">预置管理员 admin / admin123（演示口令，生产须换哈希+SSO）</div>
    <table style="margin-top:10px"><thead><tr><th>账号</th><th>角色</th></tr></thead><tbody id="accList"></tbody></table>
  </div>

  <div class="card">
    <h2>② 操作审计留痕</h2>
    <div class="muted">任何敏感动作（知识写删/外发/市场安装/账号管理）均留痕，可过等保「可追溯」。</div>
    <button class="ghost" onclick="loadAudit()" style="margin-bottom:8px">刷新审计</button>
    <pre id="auditBox">—</pre>
  </div>

  <div class="card">
    <h2>③ 数字员工市场</h2>
    <div class="muted">开放 plugin 生态：浏览并热插拔安装数字员工（零停机上线）。</div>
    <button class="ghost" onclick="loadMarket()" style="margin-bottom:8px">刷新市场</button>
    <div id="marketList"></div>
  </div>
</div>
<script>
let TOKEN = '';
function setToken(t){TOKEN=t;document.getElementById('token').textContent = t? '登录态 token: '+t : '';}
async function api(method,path,body){
  const opt={method,headers:{}};
  if(body){opt.headers['content-type']='application/json';opt.body=JSON.stringify(body);}
  if(TOKEN) opt.headers['x-auth-token']=TOKEN;
  const r=await fetch(path,opt); const j=await r.json().catch(()=>({})); return {status:r.status,j};
}
async function doLogin(){
  const r=await api('POST','/api/auth/login',{name:document.getElementById('loginName').value,password:document.getElementById('loginPw').value});
  if(r.j.token){setToken(r.j.token);document.getElementById('authState').innerHTML='<span class="ok">已登录</span>';loadAccounts();loadAudit();}
  else document.getElementById('authState').innerHTML='<span class="warn">'+ (r.j.error||'登录失败') +'</span>';
}
async function doCreate(){
  const r=await api('POST','/api/auth/accounts',{name:document.getElementById('newName').value,password:document.getElementById('newPw').value,role:document.getElementById('newRole').value});
  alert(r.j.error? r.j.error : '已创建账号 '+ (r.j.name||''));
  loadAccounts();loadAudit();
}
async function loadAccounts(){
  const r=await api('GET','/api/auth/accounts');
  const tb=document.getElementById('accList'); tb.innerHTML='';
  (r.j.accounts||[]).forEach(a=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+a.name+'</td><td><span class="tag">'+a.role+'</span></td>';tb.appendChild(tr);});
}
async function loadAudit(){
  const r=await api('GET','/api/audit/logs?limit=30');
  document.getElementById('auditBox').textContent = JSON.stringify(r.j.entries||[],null,2);
}
async function loadMarket(){
  const r=await api('GET','/api/market/list');
  const box=document.getElementById('marketList'); box.innerHTML='';
  (r.j.items||[]).forEach(it=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML='<b>'+it.name+'</b> <span class="tag">'+it.category+'</span>'+(it.featured?'<span class="tag">推荐</span>':'')+'<div class="muted">'+it.description+'</div><div>'+ (it.tags||[]).map(t=>'<span class="tag">'+t+'</span>').join('') +'</div>';
    const btn=document.createElement('button'); btn.textContent='安装（需 operator）';
    btn.onclick=async()=>{const rr=await api('POST','/api/market/install',{id:it.id});alert(rr.j.ok?'安装成功':('失败：'+(rr.j.error||'')));loadMarket();loadAudit();};
    div.appendChild(btn); box.appendChild(div);
  });
}
loadAccounts();loadAudit();loadMarket();
</script>
</body></html>`
