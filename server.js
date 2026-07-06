const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ── ADMIN PASSWORD ────────────────────────────────────────────
// Change this! Set ADMIN_PASS in Railway environment variables
const ADMIN_PASS = process.env.ADMIN_PASS || 'lovely123';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── IN-MEMORY CONFIG (persists while server is running) ───────
// To persist across restarts, set INITIAL_CONFIG env var as JSON
let config = {
  pageName:    'Lovely Page',
  pageColor1:  '#0084ff',
  pageColor2:  '#44bec7',
  message:     'Hey! We have a special offer 🎉',
  cardTitle:   '50% Off Today Only',
  cardDesc:    "Exclusive deal for our fans. Don't miss out — offer ends at midnight!",
  cardBadge:   'Limited offer',
  cardEmoji:   '🛍️',
  cardImg:     '',
  btn1Label:   'Claim your deal →',
  btn2Label:   '',
  redirectURL: 'https://example.com',
  chips:       'Yes please!,Maybe later',
  delay:       1800,
};

// Allow seeding config from env var
try {
  if (process.env.INITIAL_CONFIG) {
    config = { ...config, ...JSON.parse(process.env.INITIAL_CONFIG) };
  }
} catch(e) { console.log('INITIAL_CONFIG parse error, using defaults'); }

// ── HELPERS ───────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ── FAN PAGE ─────────────────────────────────────────────────
// GET / → serves the fan-facing Messenger page
// URL params override config (same as before, for flexible links)
app.get('/', (req, res) => {
  const q = req.query;
  const c = {
    pageName:    q.page    || config.pageName,
    pageColor1:  q.color1  || config.pageColor1,
    pageColor2:  q.color2  || config.pageColor2,
    message:     q.msg     || config.message,
    cardTitle:   q.title   || config.cardTitle,
    cardDesc:    q.desc    || config.cardDesc,
    cardBadge:   q.badge   || config.cardBadge,
    cardEmoji:   q.cemoji  || config.cardEmoji,
    cardImg:     q.img     || config.cardImg,
    btn1Label:   q.btn1    || config.btn1Label,
    btn2Label:   q.btn2    || config.btn2Label,
    redirectURL: q.url     || config.redirectURL,
    chips:       q.chips   || config.chips,
    delay:       parseInt(q.delay || config.delay) || 1800,
  };

  res.send(fanPage(c));
});

// ── ADMIN: login page ─────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.send(adminLoginPage());
});

// ── ADMIN: dashboard (POST login) ────────────────────────────
app.post('/admin', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) {
    return res.send(adminLoginPage('Wrong password. Try again.'));
  }
  res.send(adminDashboard(config, null, req.body.pass));
});

// ── ADMIN: save config ────────────────────────────────────────
app.post('/admin/save', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) {
    return res.send(adminLoginPage('Session expired. Please log in again.'));
  }
  config = {
    pageName:    req.body.pageName    || config.pageName,
    pageColor1:  req.body.pageColor1  || config.pageColor1,
    pageColor2:  req.body.pageColor2  || config.pageColor2,
    message:     req.body.message     || config.message,
    cardTitle:   req.body.cardTitle   || config.cardTitle,
    cardDesc:    req.body.cardDesc    || config.cardDesc,
    cardBadge:   req.body.cardBadge   || config.cardBadge,
    cardEmoji:   req.body.cardEmoji   || config.cardEmoji,
    cardImg:     req.body.cardImg     || '',
    btn1Label:   req.body.btn1Label   || config.btn1Label,
    btn2Label:   req.body.btn2Label   || '',
    redirectURL: req.body.redirectURL || config.redirectURL,
    chips:       req.body.chips       || config.chips,
    delay:       parseInt(req.body.delay) || 1800,
  };
  res.send(adminDashboard(config, '✅ Saved! Your fan page is updated.', req.body.pass));
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Lovely running on port ${PORT}`);
  console.log(`Admin panel: /admin  (password: ${ADMIN_PASS})`);
});

// ═════════════════════════════════════════════════════════════
// HTML TEMPLATES
// ═════════════════════════════════════════════════════════════

function fanPage(c) {
  const ini = c.pageName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const grad = `linear-gradient(135deg,${c.pageColor1} 0%,${c.pageColor2} 100%)`;
  const chips = c.chips ? c.chips.split(',').filter(x=>x.trim()) : [];

  const cardImgHtml = c.cardImg
    ? `<img src="${esc(c.cardImg)}" alt="offer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none'">
       <div class="card-badge">${esc(c.cardBadge)}</div>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:52px">${esc(c.cardEmoji)}</div>
       <div class="card-badge">${esc(c.cardBadge)}</div>`;

  const btn2Html = c.btn2Label
    ? `<button class="card-btn secondary" onclick="handleClaim(event)">${esc(c.btn2Label)}</button>`
    : '';

  const chipsHtml = chips.map(ch =>
    `<button class="qr-chip" onclick="handleClaim()">${esc(ch.trim())}</button>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title>${esc(c.pageName)}</title>
<meta name="theme-color" content="${esc(c.pageColor1)}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#fff;-webkit-font-smoothing:antialiased}
.phone{width:100%;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column}
.status-bar{display:none}
.chat-header{background:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e4e6eb}
.back-arrow{color:${esc(c.pageColor1)};font-size:24px;font-weight:300;cursor:pointer;flex-shrink:0}
.hdr-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;position:relative;background:${grad}}
.active-dot{width:11px;height:11px;background:#31a24c;border:2px solid #fff;border-radius:50%;position:absolute;bottom:0;right:0}
.hdr-name{font-size:16px;font-weight:700;color:#050505;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hdr-status{font-size:12px;color:#65676b}
.hdr-actions{display:flex;gap:10px;flex-shrink:0}
.hdr-icon{width:34px;height:34px;border-radius:50%;background:#f0f2f5;display:flex;align-items:center;justify-content:center;cursor:pointer}
.hdr-icon svg{width:18px;height:18px;fill:${esc(c.pageColor1)}}
.chat-body{background:#fff;padding:14px 0 8px;flex:1}
.date-sep{text-align:center;font-size:11px;color:#8a8d91;padding:4px 0 12px}
.msg-row{display:flex;align-items:flex-end;gap:8px;padding:2px 12px}
.msg-row.in{justify-content:flex-start}
.msg-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;background:${grad};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.bubble{max-width:72%;font-size:15px;line-height:1.45;padding:9px 14px;border-radius:18px;word-break:break-word}
.bubble.in{background:#f0f2f5;color:#050505;border-bottom-left-radius:4px}
.card-wrap{padding:6px 12px 6px 48px}
.tpl-card{border-radius:16px;border:1px solid #dddfe2;overflow:hidden;background:#fff;max-width:80%;cursor:pointer}
.tpl-card:active{transform:scale(.98)}
.card-image{width:100%;aspect-ratio:1/1;position:relative;overflow:hidden;background:${grad}}
.card-badge{position:absolute;top:10px;left:10px;background:rgba(255,255,255,.92);color:${esc(c.pageColor1)};font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;letter-spacing:.05em;text-transform:uppercase}
.card-body{padding:13px 14px 11px;background:#fff}
.card-title{font-size:15px;font-weight:700;color:#050505;margin-bottom:5px;line-height:1.3}
.card-desc{font-size:13px;color:#65676b;line-height:1.5;margin-bottom:12px}
.card-divider{border:none;border-top:1px solid #e4e6eb;margin:0 0 10px}
.card-btn{display:block;width:100%;padding:9px 0;border-radius:8px;font-size:14px;font-weight:700;text-align:center;cursor:pointer;border:none;margin-bottom:7px;font-family:inherit;transition:opacity .15s}
.card-btn:last-child{margin-bottom:0}
.card-btn:active{opacity:.8}
.card-btn.primary{background:${esc(c.pageColor1)};color:#fff}
.card-btn.secondary{background:#f0f2f5;color:#050505}
.qr-row{display:flex;gap:8px;padding:6px 12px 4px 48px;flex-wrap:wrap}
.qr-chip{font-size:13px;font-weight:600;color:${esc(c.pageColor1)};border:1.5px solid ${esc(c.pageColor1)};border-radius:20px;padding:6px 14px;cursor:pointer;background:#fff;white-space:nowrap;font-family:inherit}
.seen-row{text-align:right;padding:5px 14px 8px;font-size:11px;color:#8a8d91}
.input-bar{background:#fff;border-top:1px solid #e4e6eb;padding:10px 12px;display:flex;align-items:center;gap:9px;position:sticky;bottom:0}
.input-icon-btn{width:36px;height:36px;border-radius:50%;background:#f0f2f5;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:20px;color:${esc(c.pageColor1)}}
.input-field{flex:1;background:#f0f2f5;border-radius:22px;padding:9px 16px;font-size:15px;color:#050505;border:none;outline:none;font-family:inherit}
.input-field::placeholder{color:#8a8d91}
.send-btn{width:36px;height:36px;border-radius:50%;background:#d0d3d8;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.send-btn svg{width:18px;height:18px;fill:#fff;margin-left:2px}
.typing{display:flex;align-items:flex-end;gap:8px;padding:4px 12px 8px}
.typing-bubble{background:#f0f2f5;border-radius:18px;border-bottom-left-radius:4px;padding:10px 14px;display:flex;gap:4px;align-items:center}
.typing-dot{width:8px;height:8px;border-radius:50%;background:#8a8d91;animation:bounce 1.2s ease-in-out infinite}
.typing-dot:nth-child(2){animation-delay:.15s}
.typing-dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
</style>
</head>
<body>
<div class="phone">

  <div class="chat-header">
    <div class="back-arrow">&#8249;</div>
    <div class="hdr-avatar">${ini}<div class="active-dot"></div></div>
    <div style="flex:1;min-width:0">
      <div class="hdr-name">${esc(c.pageName)}</div>
      <div class="hdr-status">Active now</div>
    </div>
    <div class="hdr-actions">
      <div class="hdr-icon" onclick="handleClaim()"><svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg></div>
      <div class="hdr-icon" onclick="handleClaim()"><svg viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg></div>
    </div>
  </div>
  <div class="chat-body">
    <div class="date-sep" id="dsep">Today</div>
    <div class="typing" id="typ">
      <div class="msg-avatar">${ini}</div>
      <div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
    </div>
    <div id="msgs" style="display:none">
      <div class="msg-row in">
        <div class="msg-avatar">${ini}</div>
        <div class="bubble in">${esc(c.message)}</div>
      </div>
      <div class="card-wrap">
        <div class="tpl-card" onclick="handleClaim()">
          <div class="card-image">${cardImgHtml}</div>
          <div class="card-body">
            <div class="card-title">${esc(c.cardTitle)}</div>
            <div class="card-desc">${esc(c.cardDesc)}</div>
            <hr class="card-divider">
            <button class="card-btn primary" onclick="handleClaim(event)">${esc(c.btn1Label)}</button>
            ${btn2Html}
          </div>
        </div>
      </div>
      ${chipsHtml ? `<div class="qr-row">${chipsHtml}</div>` : ''}
      <div class="seen-row" id="seen">Seen</div>
    </div>
  </div>
  <div class="input-bar">
    <div class="input-icon-btn" onclick="handleClaim()">＋</div>
    <input class="input-field" id="msgInput" type="text" placeholder="Message…" autocomplete="off">
    <div class="input-icon-btn emoji-btn" id="emojiBtn" onclick="handleClaim()">🙂</div>
    <div class="send-btn" id="sendBtn" onclick="handleClaim()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
  </div>
</div>

<script>
(function(){
  var now=new Date();
  var t=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  document.getElementById('dsep').textContent='Today at '+t;
  document.getElementById('seen').textContent='Seen · '+t;
  setTimeout(function(){
    document.getElementById('typ').style.display='none';
    document.getElementById('msgs').style.display='block';
  },${c.delay});

  window.handleClaim=function(e){if(e)e.stopPropagation();window.location.href='${esc(c.redirectURL)}';}

  // Input: redirect on Enter key
  var inp=document.getElementById('msgInput');
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&inp.value.trim()){handleClaim();}
  });
  // Show send button blue when typing, hide emoji btn
  inp.addEventListener('input',function(){
    var hasText=inp.value.length>0;
    document.getElementById('emojiBtn').style.display=hasText?'none':'flex';
    document.getElementById('sendBtn').style.background=hasText?'${esc(c.pageColor1)}':'#d0d3d8';
  });
})();
</script>
</body>
</html>`;
}

// ── ADMIN LOGIN PAGE ──────────────────────────────────────────
function adminLoginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lovely Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:380px;box-shadow:0 2px 20px rgba(0,0,0,.08)}
.logo{font-size:28px;font-weight:800;color:#0084ff;margin-bottom:6px;letter-spacing:-0.03em}
.logo span{color:#111}
.sub{font-size:14px;color:#65676b;margin-bottom:28px}
label{display:block;font-size:13px;font-weight:600;color:#444;margin-bottom:6px}
input[type=password]{width:100%;padding:11px 14px;border:1.5px solid #dddfe2;border-radius:10px;font-size:15px;font-family:inherit;outline:none;transition:border .15s}
input[type=password]:focus{border-color:#0084ff}
.error{background:#fff0f0;color:#c00;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:16px;border:1px solid #ffd0d0}
button{width:100%;margin-top:16px;background:#0084ff;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:12px 0;cursor:pointer;font-family:inherit;transition:opacity .15s}
button:hover{opacity:.9}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Lovely<span>.</span></div>
  <div class="sub">Admin Panel — enter your password</div>
  ${error ? `<div class="error">${esc(error)}</div>` : ''}
  <form method="POST" action="/admin" autocomplete="on">
    <label>Password</label>
    <input type="password" name="pass" id="pass" placeholder="••••••••" autofocus required autocomplete="current-password">
    <button type="submit">Sign in →</button>
  </form>
</div>
</body>
</html>`;
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────
function adminDashboard(cfg, success, pass) {
  const ini = cfg.pageName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const grad = cfg.pageColor1 + ', ' + cfg.pageColor2;
  const chips = cfg.chips ? cfg.chips.split(',').filter(x=>x.trim()) : [];
  const chipsHtml = chips.map(ch=>`<div style="font-size:11px;font-weight:600;color:${esc(cfg.pageColor1)};border:1.5px solid ${esc(cfg.pageColor1)};border-radius:16px;padding:4px 10px;white-space:nowrap">${esc(ch.trim())}</div>`).join('');
  const cardImgHtml = cfg.cardImg
    ? `<img src="${esc(cfg.cardImg)}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none'">`
    : `<div style="font-size:36px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${esc(cfg.cardEmoji)}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lovely Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;min-height:100vh;-webkit-font-smoothing:antialiased}
.topbar{background:#fff;border-bottom:1px solid #e4e6eb;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:10}
.logo{font-size:22px;font-weight:800;color:#0084ff;letter-spacing:-0.03em}
.logo span{color:#111}
.preview-link{font-size:13px;color:#0084ff;text-decoration:none;font-weight:600;padding:7px 14px;background:#e8f4ff;border-radius:8px}
.preview-link:hover{background:#d0eaff}
.layout{display:grid;grid-template-columns:1fr 360px;gap:0;min-height:calc(100vh - 58px)}
.form-col{padding:28px 28px 100px;max-width:820px}
.preview-col{background:#e9ebee;border-left:1px solid #dddfe2;position:sticky;top:58px;height:calc(100vh - 58px);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 16px;overflow-y:auto}
.preview-label{font-size:11px;font-weight:700;color:#8a8d91;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}
.success{background:#f0fff4;color:#166534;font-size:14px;padding:12px 16px;border-radius:10px;margin-bottom:24px;border:1px solid #bbf7d0;font-weight:500}
.section{background:#fff;border-radius:14px;padding:24px;margin-bottom:20px;border:1px solid #e4e6eb}
.section-title{font-size:13px;font-weight:700;color:#65676b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px;display:flex;align-items:center;gap:8px}
.section-title span{font-size:16px}
.field{margin-bottom:16px}
.field:last-child{margin-bottom:0}
.row-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
label{display:block;font-size:13px;font-weight:600;color:#444;margin-bottom:5px}
input[type=text],input[type=url],input[type=color],input[type=number],textarea{width:100%;padding:10px 13px;border:1.5px solid #dddfe2;border-radius:9px;font-size:14px;font-family:inherit;outline:none;transition:border .15s;color:#111;background:#fff}
input[type=text]:focus,input[type=url]:focus,input[type=number]:focus,textarea:focus{border-color:#0084ff}
textarea{resize:vertical;min-height:72px;line-height:1.5}
input[type=color]{padding:4px 6px;height:40px;cursor:pointer;border-radius:9px}
.hint{font-size:11px;color:#8a8d91;margin-top:4px}
.save-bar{position:fixed;bottom:0;left:0;right:360px;background:#fff;border-top:1px solid #e4e6eb;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:9}
.save-btn{background:#0084ff;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:12px 40px;cursor:pointer;font-family:inherit;transition:opacity .15s}
.save-btn:hover{opacity:.9}
.url-box{background:#f7f8fa;border:1px solid #e4e6eb;border-radius:9px;padding:10px 13px;font-size:12px;color:#333;word-break:break-all;flex:1}
.url-box strong{color:#0084ff}
/* ── MINI PHONE ── */
.mini-phone{width:240px;border-radius:28px;background:#1c1c1e;border:6px solid #1c1c1e;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,.22)}
.mp-header{background:#fff;padding:8px 10px;display:flex;align-items:center;gap:7px;border-bottom:1px solid #e4e6eb}
.mp-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;position:relative;background:linear-gradient(135deg,${esc(cfg.pageColor1)},${esc(cfg.pageColor2)})}
.mp-dot{width:8px;height:8px;background:#31a24c;border:2px solid #fff;border-radius:50%;position:absolute;bottom:0;right:0}
.mp-name{font-size:12px;font-weight:700;color:#050505}
.mp-stat{font-size:9px;color:#65676b}
.mp-body{background:#fff;padding:10px 0 6px}
.mp-datesep{text-align:center;font-size:9px;color:#8a8d91;padding:2px 0 8px}
.mp-msgrow{display:flex;align-items:flex-end;gap:6px;padding:2px 8px}
.mp-msgav{width:22px;height:22px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,${esc(cfg.pageColor1)},${esc(cfg.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff}
.mp-bubble{max-width:65%;font-size:11px;line-height:1.4;padding:6px 10px;border-radius:14px;background:#f0f2f5;color:#050505;border-bottom-left-radius:3px;word-break:break-word}
.mp-cardwrap{padding:4px 8px 4px 36px}
.mp-card{border-radius:10px;border:1px solid #dddfe2;overflow:hidden;background:#fff;max-width:180px}
.mp-cardimg{width:100%;aspect-ratio:1/1;position:relative;overflow:hidden;background:linear-gradient(135deg,${esc(cfg.pageColor1)},${esc(cfg.pageColor2)})}
.mp-badge{position:absolute;top:6px;left:6px;background:rgba(255,255,255,.92);color:${esc(cfg.pageColor1)};font-size:7px;font-weight:700;padding:2px 6px;border-radius:12px;text-transform:uppercase;letter-spacing:.04em}
.mp-cardbody{padding:8px 9px 7px}
.mp-cardtitle{font-size:10px;font-weight:700;color:#050505;margin-bottom:3px;line-height:1.3}
.mp-carddesc{font-size:8px;color:#65676b;line-height:1.4;margin-bottom:7px}
.mp-carddiv{border:none;border-top:1px solid #e4e6eb;margin:0 0 6px}
.mp-cardbtn{display:block;width:100%;padding:5px 0;border-radius:5px;font-size:9px;font-weight:700;text-align:center;border:none;cursor:pointer;font-family:inherit;margin-bottom:4px;background:${esc(cfg.pageColor1)};color:#fff}
.mp-qrrow{display:flex;gap:4px;padding:4px 8px 3px 36px;flex-wrap:wrap}
.mp-seen{text-align:right;padding:3px 10px 5px;font-size:8px;color:#8a8d91}
.mp-inputbar{background:#fff;border-top:1px solid #e4e6eb;padding:7px 8px;display:flex;align-items:center;gap:6px}
.mp-inputfield{flex:1;background:#f0f2f5;border-radius:16px;padding:6px 10px;font-size:10px;color:#8a8d91}
.mp-sendbtn{width:26px;height:26px;border-radius:50%;background:${esc(cfg.pageColor1)};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mp-sendbtn svg{width:12px;height:12px;fill:#fff;margin-left:1px}
@media(max-width:900px){.layout{grid-template-columns:1fr}.preview-col{display:none}.save-bar{right:0}}
@media(max-width:600px){.row-2{grid-template-columns:1fr}}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">Lovely<span>.</span> <span style="font-size:13px;font-weight:500;color:#65676b">Admin</span></div>
  <a href="/" target="_blank" class="preview-link">Open fan page ↗</a>
</div>

<div class="layout">

  <!-- FORM COLUMN -->
  <div class="form-col">
    ${success ? `<div class="success">${esc(success)}</div>` : ''}

    <form method="POST" action="/admin/save">
      <input type="hidden" name="pass" value="${esc(pass || '')}">

      <div class="section">
        <div class="section-title"><span>👤</span> Page / Sender</div>
        <div class="field">
          <label>Page name</label>
          <input type="text" name="pageName" value="${esc(cfg.pageName)}" placeholder="NVMax Official">
        </div>
        <div class="row-2">
          <div class="field">
            <label>Avatar color 1</label>
            <input type="color" name="pageColor1" value="${esc(cfg.pageColor1)}">
            <div class="hint">Gradient start</div>
          </div>
          <div class="field">
            <label>Avatar color 2</label>
            <input type="color" name="pageColor2" value="${esc(cfg.pageColor2)}">
            <div class="hint">Gradient end</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span>💬</span> Opening message</div>
        <div class="field">
          <label>Bubble text</label>
          <input type="text" name="message" value="${esc(cfg.message)}" placeholder="Hey! We have something for you 🎉">
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span>🃏</span> Card content</div>
        <div class="field">
          <label>Title</label>
          <input type="text" name="cardTitle" value="${esc(cfg.cardTitle)}" placeholder="50% Off Today Only">
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="cardDesc">${esc(cfg.cardDesc)}</textarea>
        </div>
        <div class="row-2">
          <div class="field">
            <label>Badge label</label>
            <input type="text" name="cardBadge" value="${esc(cfg.cardBadge)}" placeholder="Limited offer">
          </div>
          <div class="field">
            <label>Emoji (no image)</label>
            <input type="text" name="cardEmoji" value="${esc(cfg.cardEmoji)}" placeholder="🛍️">
          </div>
        </div>
        <div class="field">
          <label>Card image URL <span style="font-weight:400;color:#8a8d91">(optional — overrides emoji)</span></label>
          <input type="url" name="cardImg" value="${esc(cfg.cardImg)}" placeholder="https://cdn.example.com/banner.jpg">
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span>🔘</span> Buttons & redirect</div>
        <div class="field">
          <label>Primary button label</label>
          <input type="text" name="btn1Label" value="${esc(cfg.btn1Label)}" placeholder="Claim your deal →">
        </div>
        <div class="field">
          <label>Secondary button label <span style="font-weight:400;color:#8a8d91">(leave empty to hide)</span></label>
          <input type="text" name="btn2Label" value="${esc(cfg.btn2Label)}" placeholder="Learn more">
        </div>
        <div class="field">
          <label>Redirect URL <span style="color:#c00">*</span></label>
          <input type="url" name="redirectURL" value="${esc(cfg.redirectURL)}" placeholder="https://scrollgallery.com/offer1" required>
          <div class="hint">Where fans go when they click the button</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span>⚡</span> Quick reply chips</div>
        <div class="field">
          <label>Chips (comma separated)</label>
          <input type="text" name="chips" value="${esc(cfg.chips)}" placeholder="Yes please!,Maybe later,Tell me more">
          <div class="hint">Leave empty to hide chips</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span>⚙️</span> Settings</div>
        <div class="field">
          <label>Typing delay (ms)</label>
          <input type="number" name="delay" value="${cfg.delay}" min="500" max="5000" step="100">
          <div class="hint">How long typing dots show before message appears</div>
        </div>
      </div>

      <div class="save-bar">
        <div class="url-box" id="urlBox"><strong>https://your-app.railway.app/</strong></div>
        <button type="submit" class="save-btn">Save & go live →</button>
      </div>

    </form>
  </div>

  <!-- PREVIEW COLUMN -->
  <div class="preview-col">
    <div class="preview-label">Preview</div>
    <div class="mini-phone">
      <div style="background:${esc(cfg.pageColor1)};height:6px"></div>
      <div class="mp-header">
        <div class="mp-av">${ini}<div class="mp-dot"></div></div>
        <div>
          <div class="mp-name">${esc(cfg.pageName)}</div>
          <div class="mp-stat">Active now</div>
        </div>
      </div>
      <div class="mp-body">
        <div class="mp-datesep">Today</div>
        <div class="mp-msgrow">
          <div class="mp-msgav">${ini}</div>
          <div class="mp-bubble">${esc(cfg.message)}</div>
        </div>
        <div class="mp-cardwrap">
          <div class="mp-card">
            <div class="mp-cardimg">
              ${cardImgHtml}
              <div class="mp-badge">${esc(cfg.cardBadge)}</div>
            </div>
            <div class="mp-cardbody">
              <div class="mp-cardtitle">${esc(cfg.cardTitle)}</div>
              <div class="mp-carddesc">${esc(cfg.cardDesc)}</div>
              <hr class="mp-carddiv">
              <button class="mp-cardbtn">${esc(cfg.btn1Label)}</button>
            </div>
          </div>
        </div>
        ${chipsHtml ? `<div class="mp-qrrow">${chipsHtml}</div>` : ''}
        <div class="mp-seen">Seen · just now</div>
      </div>
      <div class="mp-inputbar">
        <div class="mp-inputfield">Message…</div>
        <div class="mp-sendbtn"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
      </div>
    </div>
  </div>

</div>

<script>
document.getElementById('urlBox').innerHTML = '<strong>' + window.location.origin + '/</strong>';
</script>
</body>
</html>`;
}
