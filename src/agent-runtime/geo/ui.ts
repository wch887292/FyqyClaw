/**
 * GEO 自动化面板 —— 零依赖单页（中文、离线可用）。
 * 三栏：① 品牌内容包（投喂） ② 跑一次工作流 ③ 定时任务状态与启停。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */
export const GEO_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GEO 自动化 · 飞虹智</title>
<style>
  :root { --bg:#0f1115; --card:#1a1d24; --line:#2a2f3a; --fg:#e8eaed; --sub:#9aa3b2; --accent:#5b8def; --ok:#34c759; --warn:#ff9f0a; --red:#ff453a; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
  header { padding:18px 24px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
  header h1 { margin:0; font-size:18px; }
  header .links a { color:var(--accent); text-decoration:none; margin-left:16px; font-size:13px; }
  main { padding:24px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
  @media (max-width:1100px){ main { grid-template-columns:1fr; } }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
  .card h2 { margin:0 0 12px; font-size:15px; }
  button { background:var(--accent); color:#fff; border:0; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:13px; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--fg); }
  button:disabled { opacity:.5; cursor:not-allowed; }
  pre { background:#0b0d11; border:1px solid var(--line); border-radius:8px; padding:10px; max-height:320px; overflow:auto; font-size:12px; white-space:pre-wrap; word-break:break-all; }
  .hint { color:var(--sub); font-size:12px; margin:6px 0 12px; }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; margin:2px; border:1px solid var(--line); }
  .pill.ok { color:var(--ok); border-color:var(--ok); }
  .pill.warn { color:var(--warn); border-color:var(--warn); }
  .pill.red { color:var(--red); border-color:var(--red); }
  .job { border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:10px; }
  .job .row { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .job .meta { color:var(--sub); font-size:12px; margin-top:4px; }
</style>
</head>
<body>
<header>
  <h1>🌐 GEO 自动化工作台</h1>
  <div class="links">
    <a href="/studio">数字员工工作台 →</a>
    <a href="/kb">知识库管理 →</a>
  </div>
</header>
<main>
  <section class="card">
    <h2>① 品牌内容投喂</h2>
    <div class="hint">真实读取 llms.txt / GEO 品牌事实页，抽成结构化内容包，供多平台分发复用。</div>
    <button id="btnFeed">投喂一次</button>
    <div id="feedOut" style="margin-top:12px;"></div>
  </section>

  <section class="card">
    <h2>② 跑一次 GEO 工作流</h2>
    <div class="hint">编排：投喂 → 多平台分发（默认需人工确认，不真发）→ 收录排名查询。</div>
    <button id="btnRun">运行工作流</button>
    <div id="runOut" style="margin-top:12px;"></div>
  </section>

  <section class="card">
    <h2>③ 定时任务</h2>
    <div class="hint">轻量调度器：默认 geo-daily 每 6 小时跑一次（禁用中，需手动启动）。</div>
    <button id="btnRefresh" class="ghost">刷新状态</button>
    <div id="jobs" style="margin-top:12px;"></div>
  </section>
</main>

<script>
const $ = (s) => document.querySelector(s)
function esc(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) }

async function feed(){
  const out = $('#feedOut'); out.innerHTML = '读取中…'
  try {
    const r = await fetch('/api/geo/feed', {method:'POST', headers:{'content-type':'application/json'}, body:'{}'})
    const d = await r.json()
    if(!d.ok){ out.innerHTML = '<pre class="red">'+esc(d.error||'失败')+'</pre>'; return }
    const p = d.package
    out.innerHTML = '<div>品牌：<b>'+esc(p.brand)+'</b></div>'+
      '<div class="hint">来源：'+ (p.sources||[]).map(esc).join('，') +'</div>'+
      '<div class="hint">一句话：'+esc(p.oneLiner)+'</div>'+
      '<div>事实（前 8 条）：</div><pre>'+ esc((p.facts||[]).slice(0,8).join('\\n')) +'</pre>'
  } catch(e){ out.innerHTML = '<pre class="red">'+esc(e.message)+'</pre>' }
}

async function run(){
  const out = $('#runOut'); out.innerHTML = '运行中…'
  try {
    const r = await fetch('/api/geo/run', {method:'POST', headers:{'content-type':'application/json'}, body:'{}'})
    const d = await r.json()
    if(!d.ok){ out.innerHTML = '<pre class="red">'+esc(d.error||'失败')+'</pre>'; return }
    const dist = (d.distribute||[]).map(x =>
      '<span class="pill '+(x.published?'ok':(x.needsApproval?'warn':'red'))+'">'+esc(x.platform)+' · '+(x.published?'已发':(x.needsApproval?'待人工确认':'拦截'))+'</span>'
    ).join('')
    const rank = d.rank ? (d.rank.items||[]).map(it =>
      '<div>· '+esc(it.platform)+' / '+esc(it.keyword)+'：'+(it.indexed?('第'+it.rank+'名'):'未收录')+'</div>'
    ).join('') : '<div class="hint">无收录数据</div>'
    out.innerHTML = '<div>分发计划：</div><div>'+dist+'</div>'+
      '<div style="margin-top:8px">收录查询：</div><div class="hint">provider='+esc(d.rank?d.rank.provider:'-')+'</div>'+rank
  } catch(e){ out.innerHTML = '<pre class="red">'+esc(e.message)+'</pre>' }
}

async function jobs(){
  const box = $('#jobs')
  try {
    const r = await fetch('/api/geo/schedule'); const d = await r.json()
    if(!d.jobs || d.jobs.length===0){ box.innerHTML = '<div class="hint">暂无任务</div>'; return }
    box.innerHTML = d.jobs.map(j => {
      const cls = j.enabled ? 'ok' : 'warn'
      const tag = j.enabled ? '运行中' : '已停止'
      const last = j.lastRunAt ? new Date(j.lastRunAt).toLocaleString('zh-CN') : '未运行'
      return '<div class="job"><div class="row"><div><b>'+esc(j.id)+'</b> <span class="pill '+cls+'">'+tag+'</span></div>'+
        '<div><button class="ghost" data-act="run" data-id="'+esc(j.id)+'">立即跑</button> '+
        (j.enabled ? '<button class="ghost" data-act="stop" data-id="'+esc(j.id)+'">停止</button>'
                   : '<button class="ghost" data-act="start" data-id="'+esc(j.id)+'">启动</button>')+
        '</div></div>'+
        '<div class="meta">'+esc(j.spec)+' · 已跑 '+j.runCount+' 次 · 最近：'+last+' · '+(j.lastResult||'-')+'</div></div>'
    }).join('')
    box.querySelectorAll('button[data-act]').forEach(b => b.onclick = async () => {
      const act = b.dataset.act, id = b.dataset.id
      await fetch('/api/geo/schedule/'+act, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id})})
      jobs()
    })
  } catch(e){ box.innerHTML = '<pre class="red">'+esc(e.message)+'</pre>' }
}

$('#btnFeed').onclick = feed
$('#btnRun').onclick = run
$('#btnRefresh').onclick = jobs
jobs()
</script>
</body>
</html>`
