const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASS = process.env.ADMIN_PASS || 'lovely123';
const DATA_FILE  = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ── MULTER ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'tpl_' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── TEMPLATE DEFAULTS ─────────────────────────────────────────
function defaultTpl(id) {
  return {
    id,
    name:        'New Template',
    pageName:    'Lovely Page',
    pageColor1:  '#0084ff',
    pageColor2:  '#44bec7',
    avatarImg:   '',
    message:     'Hey! I sent you something special 🎉',
    cardTitle:   'Check this out',
    cardDesc:    'Tap below to see more.',
    cardBadge:   'New',
    cardEmoji:   '🎁',
    cardImg:     '',
    btn1Label:   'See more →',
    btn2Label:   '',
    redirectURL: 'https://example.com',
    chips:       'Yes please!,Maybe later',
    delay:       1800,
    active:      true,
  };
}

// ── LOAD / SAVE ───────────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (d.templates && d.templates.length) return d;
    }
  } catch(e) { console.log('data.json read error:', e.message); }
  // seed one default template
  return { templates: [defaultTpl('tpl_' + Date.now())] };
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let data = loadData();

// ── HELPERS ───────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function uid() { return 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
function getTpl(id) { return data.templates.find(t => t.id === id); }

// ── FAN PAGE ──────────────────────────────────────────────────
// GET /?t=ID  →  show that template
// GET /       →  show first active template
app.get('/', (req, res) => {
  let tpl;
  if (req.query.t) {
    tpl = getTpl(req.query.t);
  }
  if (!tpl) {
    tpl = data.templates.find(t => t.active);
  }
  if (!tpl) tpl = data.templates[0];
  if (!tpl) return res.send('<h2>No templates yet. Go to /admin to create one.</h2>');
  res.send(fanPage(tpl));
});

// ── ADMIN: login ──────────────────────────────────────────────
app.get('/admin', (req, res) => res.send(loginPage()));
app.post('/admin', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Wrong password.'));
  res.send(dashboardPage(req.body.pass));
});

// ── ADMIN: new template ───────────────────────────────────────
app.post('/admin/new', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  const tpl = defaultTpl(uid());
  data.templates.push(tpl);
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ New template created. Edit it below.'));
});

// ── ADMIN: edit form ──────────────────────────────────────────
app.post('/admin/edit', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  const tpl = getTpl(req.body.id);
  if (!tpl) return res.redirect('/admin');
  res.send(editPage(tpl, req.body.pass));
});

// ── ADMIN: save template ──────────────────────────────────────
app.post('/admin/save', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  const tpl = getTpl(req.body.id);
  if (!tpl) return res.redirect('/admin');
  Object.assign(tpl, {
    name:        req.body.name        || tpl.name,
    pageName:    req.body.pageName    || tpl.pageName,
    pageColor1:  req.body.pageColor1  || tpl.pageColor1,
    pageColor2:  req.body.pageColor2  || tpl.pageColor2,
    message:     req.body.message     || tpl.message,
    cardTitle:   req.body.cardTitle   || tpl.cardTitle,
    cardDesc:    req.body.cardDesc    || tpl.cardDesc,
    cardBadge:   req.body.cardBadge   || tpl.cardBadge,
    cardEmoji:   req.body.cardEmoji   || tpl.cardEmoji,
    cardImg:     req.body.cardImg     || '',
    btn1Label:   req.body.btn1Label   || tpl.btn1Label,
    btn2Label:   req.body.btn2Label   || '',
    redirectURL: req.body.redirectURL || tpl.redirectURL,
    chips:       req.body.chips       !== undefined ? req.body.chips : tpl.chips,
    delay:       parseInt(req.body.delay) || 1800,
  });
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ Saved!'));
});

// ── ADMIN: upload avatar for template ────────────────────────
app.post('/admin/avatar', upload.single('avatar'), (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.status(403).send('Unauthorized');
  const tpl = getTpl(req.body.id);
  if (!tpl || !req.file) return res.redirect('/admin');
  tpl.avatarImg = '/uploads/' + req.file.filename + '?v=' + Date.now();
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ Profile picture updated!'));
});

// ── ADMIN: upload card image for template ─────────────────────
app.post('/admin/cardimg', upload.single('cardimg'), (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.status(403).send('Unauthorized');
  const tpl = getTpl(req.body.id);
  if (!tpl || !req.file) return res.redirect('/admin');
  tpl.cardImg = '/uploads/' + req.file.filename + '?v=' + Date.now();
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ Card image updated!'));
});

// ── ADMIN: remove avatar ──────────────────────────────────────
app.post('/admin/avatar/remove', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.status(403).send('Unauthorized');
  const tpl = getTpl(req.body.id);
  if (!tpl) return res.redirect('/admin');
  tpl.avatarImg = '';
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ Avatar removed.'));
});

// ── ADMIN: remove card image ──────────────────────────────────
app.post('/admin/cardimg/remove', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.status(403).send('Unauthorized');
  const tpl = getTpl(req.body.id);
  if (!tpl) return res.redirect('/admin');
  tpl.cardImg = '';
  saveData();
  res.send(editPage(tpl, req.body.pass, '✅ Card image removed.'));
});

// ── ADMIN: toggle active ──────────────────────────────────────
app.post('/admin/toggle', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  const tpl = getTpl(req.body.id);
  if (tpl) { tpl.active = !tpl.active; saveData(); }
  res.send(dashboardPage(req.body.pass, tpl ? (tpl.active ? '✅ Template activated.' : '⏸ Template paused.') : ''));
});

// ── ADMIN: delete template ────────────────────────────────────
app.post('/admin/delete', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  data.templates = data.templates.filter(t => t.id !== req.body.id);
  saveData();
  res.send(dashboardPage(req.body.pass, '🗑 Template deleted.'));
});

// ── ADMIN: duplicate template ─────────────────────────────────
app.post('/admin/duplicate', (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.send(loginPage('Session expired.'));
  const tpl = getTpl(req.body.id);
  if (tpl) {
    const copy = { ...tpl, id: uid(), name: tpl.name + ' (copy)' };
    data.templates.push(copy);
    saveData();
  }
  res.send(dashboardPage(req.body.pass, '✅ Template duplicated.'));
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Lovely running on port ${PORT}`);
});

// =============================================================
// FAN PAGE
// =============================================================
function fanPage(c) {
  const ini = c.pageName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const grad = `linear-gradient(135deg,${c.pageColor1} 0%,${c.pageColor2} 100%)`;
  const chips = c.chips ? c.chips.split(',').filter(x=>x.trim()) : [];

  const avatarInner = c.avatarImg
    ? `<img src="${esc(c.avatarImg)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`
    : ini;

  const cardImgHtml = c.cardImg
    ? `<img src="${esc(c.cardImg)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none'"><div class="card-badge">${esc(c.cardBadge)}</div>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:52px">${esc(c.cardEmoji)}</div><div class="card-badge">${esc(c.cardBadge)}</div>`;

  const btn2Html = c.btn2Label
    ? `<button class="card-btn secondary" onclick="go(event)">${esc(c.btn2Label)}</button>` : '';

  const chipsHtml = chips.map(ch =>
    `<button class="qr-chip" onclick="go()">${esc(ch.trim())}</button>`
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
.chat-header{background:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e4e6eb;position:sticky;top:0;z-index:5}
.back-arrow{color:${esc(c.pageColor1)};font-size:24px;font-weight:300;cursor:pointer;flex-shrink:0}
.hdr-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;position:relative;background:${grad};overflow:hidden}
.active-dot{width:11px;height:11px;background:#31a24c;border:2px solid #fff;border-radius:50%;position:absolute;bottom:0;right:0;z-index:2}
.hdr-name{font-size:16px;font-weight:700;color:#050505;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hdr-status{font-size:12px;color:#65676b}
.hdr-actions{display:flex;gap:10px;flex-shrink:0}
.hdr-icon{width:34px;height:34px;border-radius:50%;background:#f0f2f5;display:flex;align-items:center;justify-content:center;cursor:pointer}
.hdr-icon svg{width:18px;height:18px;fill:${esc(c.pageColor1)}}
.chat-body{background:#fff;padding:14px 0 8px;flex:1}
.date-sep{text-align:center;font-size:11px;color:#8a8d91;padding:4px 0 12px}
.msg-row{display:flex;align-items:flex-end;gap:8px;padding:2px 12px}
.msg-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;background:${grad};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;overflow:hidden}
.bubble{max-width:72%;font-size:15px;line-height:1.45;padding:9px 14px;border-radius:18px;word-break:break-word;background:#f0f2f5;color:#050505;border-bottom-left-radius:4px}
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
    <div class="hdr-avatar">${avatarInner}<div class="active-dot"></div></div>
    <div style="flex:1;min-width:0">
      <div class="hdr-name">${esc(c.pageName)}</div>
      <div class="hdr-status">Active now</div>
    </div>
    <div class="hdr-actions">
      <div class="hdr-icon" onclick="go()"><svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg></div>
      <div class="hdr-icon" onclick="go()"><svg viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg></div>
    </div>
  </div>
  <div class="chat-body">
    <div class="date-sep" id="dsep">Today</div>
    <div class="typing" id="typ">
      <div class="msg-avatar">${avatarInner}</div>
      <div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
    </div>
    <div id="msgs" style="display:none">
      <div class="msg-row">
        <div class="msg-avatar">${avatarInner}</div>
        <div class="bubble">${esc(c.message)}</div>
      </div>
      <div class="card-wrap">
        <div class="tpl-card" onclick="go()">
          <div class="card-image">${cardImgHtml}</div>
          <div class="card-body">
            <div class="card-title">${esc(c.cardTitle)}</div>
            <div class="card-desc">${esc(c.cardDesc)}</div>
            <hr class="card-divider">
            <button class="card-btn primary" onclick="go(event)">${esc(c.btn1Label)}</button>
            ${btn2Html}
          </div>
        </div>
      </div>
      ${chipsHtml ? `<div class="qr-row">${chipsHtml}</div>` : ''}
      <div class="seen-row" id="seen">Seen</div>
    </div>
  </div>
  <div class="input-bar">
    <div class="input-icon-btn" onclick="go()">＋</div>
    <input class="input-field" id="inp" type="text" placeholder="Message…" autocomplete="off">
    <div class="input-icon-btn" id="emj" onclick="go()">🙂</div>
    <div class="send-btn" id="snd" onclick="go()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
  </div>
</div>
<script>
(function(){
  var t=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  document.getElementById('dsep').textContent='Today at '+t;
  document.getElementById('seen').textContent='Seen · '+t;
  setTimeout(function(){
    document.getElementById('typ').style.display='none';
    document.getElementById('msgs').style.display='block';
  },${c.delay});
  window.go=function(e){if(e)e.stopPropagation();window.location.href='${esc(c.redirectURL)}';}
  var inp=document.getElementById('inp');
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&inp.value.trim())go();});
  inp.addEventListener('input',function(){
    var h=inp.value.length>0;
    document.getElementById('emj').style.display=h?'none':'flex';
    document.getElementById('snd').style.background=h?'${esc(c.pageColor1)}':'#d0d3d8';
  });
})();
</script>
</body>
</html>`;
}

// =============================================================
// LOGIN PAGE
// =============================================================
function loginPage(err) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lovely Admin</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,Arial,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:380px;box-shadow:0 2px 20px rgba(0,0,0,.08)}.logo{font-size:28px;font-weight:800;color:#0084ff;margin-bottom:6px}.sub{font-size:14px;color:#65676b;margin-bottom:28px}label{display:block;font-size:13px;font-weight:600;color:#444;margin-bottom:6px}input[type=password]{width:100%;padding:11px 14px;border:1.5px solid #dddfe2;border-radius:10px;font-size:15px;font-family:inherit;outline:none}.error{background:#fff0f0;color:#c00;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:16px;border:1px solid #ffd0d0}button{width:100%;margin-top:16px;background:#0084ff;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:12px 0;cursor:pointer;font-family:inherit}</style></head>
<body><div class="card"><div class="logo">Lovely.</div><div class="sub">Admin — enter your password</div>
${err ? `<div class="error">${esc(err)}</div>` : ''}
<form method="POST" action="/admin" autocomplete="on"><label>Password</label><input type="password" name="pass" placeholder="••••••••" autofocus required autocomplete="current-password"><button type="submit">Sign in →</button></form>
</div></body></html>`;
}

// =============================================================
// DASHBOARD PAGE — template grid
// =============================================================
function dashboardPage(pass, msg) {
  const cards = data.templates.map(t => {
    const ini = t.pageName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const avHtml = t.avatarImg
      ? `<img src="${esc(t.avatarImg)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,${esc(t.pageColor1)},${esc(t.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">${ini}</div>`;
    const imgHtml = t.cardImg
      ? `<img src="${esc(t.cardImg)}" style="width:100%;height:100%;object-fit:cover;display:block">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${esc(t.pageColor1)},${esc(t.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:32px">${esc(t.cardEmoji)}</div>`;
    return `
    <div class="tcard ${t.active ? '' : 'paused'}">
      <div class="tcard-img">${imgHtml}
        <div class="tcard-badge">${esc(t.cardBadge)}</div>
        <div class="tcard-status">${t.active ? '● Live' : '⏸ Paused'}</div>
      </div>
      <div class="tcard-body">
        <div class="tcard-av">${avHtml}</div>
        <div class="tcard-info">
          <div class="tcard-name">${esc(t.name)}</div>
          <div class="tcard-page">${esc(t.pageName)}</div>
        </div>
      </div>
      <div class="tcard-msg">${esc(t.message.slice(0,60))}${t.message.length>60?'…':''}</div>
      <div class="tcard-title">${esc(t.cardTitle)}</div>
      <div class="tcard-url"><span>→</span> ${esc((t.redirectURL||'').replace(/^https?:\/\//,'').slice(0,36))}</div>
      <div class="tcard-link">Fan link: <a href="/?t=${esc(t.id)}" target="_blank">/?t=${esc(t.id)}</a></div>
      <div class="tcard-actions">
        <form method="POST" action="/admin/edit" style="flex:1"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(t.id)}"><button class="btn-edit">✏️ Edit</button></form>
        <form method="POST" action="/admin/duplicate"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(t.id)}"><button class="btn-dup" title="Duplicate">⧉</button></form>
        <form method="POST" action="/admin/toggle"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(t.id)}"><button class="btn-toggle" title="${t.active ? 'Pause' : 'Activate'}">${t.active ? '⏸' : '▶'}</button></form>
        <form method="POST" action="/admin/delete" onsubmit="return confirm('Delete this template?')"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(t.id)}"><button class="btn-del" title="Delete">🗑</button></form>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lovely Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Arial,sans-serif;background:#f0f2f5;min-height:100vh;-webkit-font-smoothing:antialiased}
.topbar{background:#fff;border-bottom:1px solid #e4e6eb;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:10}
.logo{font-size:22px;font-weight:800;color:#0084ff}
.topbar-right{display:flex;gap:10px;align-items:center}
.main{max-width:1200px;margin:0 auto;padding:28px 20px 60px}
.msg{background:#f0fff4;color:#166534;font-size:14px;padding:12px 16px;border-radius:10px;margin-bottom:24px;border:1px solid #bbf7d0;font-weight:500}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;margin-top:24px}
.tcard{background:#fff;border-radius:14px;border:1.5px solid #e4e6eb;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .2s}
.tcard:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
.tcard.paused{opacity:.6}
.tcard-img{height:160px;position:relative;overflow:hidden}
.tcard-badge{position:absolute;top:8px;left:8px;background:rgba(255,255,255,.9);color:#0084ff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;text-transform:uppercase;letter-spacing:.05em}
.tcard-status{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);color:#fff;font-size:9px;font-weight:700;padding:3px 8px;border-radius:12px}
.tcard-body{display:flex;align-items:center;gap:10px;padding:12px 14px 0}
.tcard-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;overflow:hidden;border:2px solid #e4e6eb}
.tcard-name{font-size:14px;font-weight:700;color:#050505}
.tcard-page{font-size:11px;color:#65676b}
.tcard-msg{font-size:12px;color:#65676b;padding:6px 14px 0;line-height:1.4}
.tcard-title{font-size:13px;font-weight:700;color:#050505;padding:4px 14px 0}
.tcard-url{font-size:11px;color:#0084ff;padding:3px 14px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tcard-url span{color:#8a8d91}
.tcard-link{font-size:10px;color:#8a8d91;padding:4px 14px 8px}
.tcard-link a{color:#0084ff;text-decoration:none}
.tcard-actions{display:flex;gap:6px;padding:10px 12px 12px;border-top:1px solid #f0f2f5;margin-top:auto}
.btn-edit{flex:1;background:#0084ff;color:#fff;border:none;border-radius:8px;padding:8px 0;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.btn-dup,.btn-toggle,.btn-del{width:34px;height:34px;border:1.5px solid #e4e6eb;border-radius:8px;background:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;font-family:inherit}
.btn-del{border-color:#ffd0d0;color:#c00}
.btn-new{background:#0084ff;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.btn-out{background:#fff;color:#444;border:1.5px solid #e4e6eb;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center}
.empty{text-align:center;padding:60px 20px;color:#8a8d91;font-size:15px}
</style></head>
<body>
<div class="topbar">
  <div class="logo">Lovely.</div>
  <div class="topbar-right">
    <a href="/" target="_blank" class="btn-out">Open fan page ↗</a>
    <form method="POST" action="/admin/new" style="display:inline"><input type="hidden" name="pass" value="${esc(pass)}"><button type="submit" class="btn-new">+ New template</button></form>
  </div>
</div>
<div class="main">
  ${msg ? `<div class="msg">${esc(msg)}</div>` : ''}
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:20px;font-weight:800;color:#111">Templates <span style="font-size:14px;font-weight:500;color:#8a8d91">(${data.templates.length})</span></div>
  </div>
  ${data.templates.length === 0
    ? '<div class="empty">No templates yet.<br>Click "+ New template" to create your first one.</div>'
    : `<div class="grid">${cards}</div>`}
</div>
</body></html>`;
}

// =============================================================
// EDIT PAGE — single template editor
// =============================================================
function editPage(tpl, pass, msg) {
  const ini = tpl.pageName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const avHtml = tpl.avatarImg
    ? `<img src="${esc(tpl.avatarImg)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,${esc(tpl.pageColor1)},${esc(tpl.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff">${ini}</div>`;
  const cardPreviewHtml = tpl.cardImg
    ? `<img src="${esc(tpl.cardImg)}" style="width:100%;height:100%;object-fit:cover;display:block">`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${esc(tpl.pageColor1)},${esc(tpl.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:40px">${esc(tpl.cardEmoji)}</div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edit — ${esc(tpl.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Arial,sans-serif;background:#f0f2f5;min-height:100vh;-webkit-font-smoothing:antialiased}
.topbar{background:#fff;border-bottom:1px solid #e4e6eb;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:10}
.logo{font-size:18px;font-weight:800;color:#0084ff}
.back-link{font-size:13px;color:#0084ff;text-decoration:none;font-weight:600;padding:7px 14px;background:#e8f4ff;border-radius:8px}
.layout{display:grid;grid-template-columns:1fr 300px;gap:0;min-height:calc(100vh - 58px)}
.form-col{padding:24px 28px 100px}
.preview-col{background:#e9ebee;border-left:1px solid #dddfe2;position:sticky;top:58px;height:calc(100vh - 58px);display:flex;flex-direction:column;align-items:center;padding:20px 12px;overflow-y:auto}
.preview-label{font-size:11px;font-weight:700;color:#8a8d91;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
.msg{background:#f0fff4;color:#166534;font-size:14px;padding:12px 16px;border-radius:10px;margin-bottom:20px;border:1px solid #bbf7d0;font-weight:500}
.section{background:#fff;border-radius:14px;padding:22px;margin-bottom:16px;border:1px solid #e4e6eb}
.section-title{font-size:12px;font-weight:700;color:#65676b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.field{margin-bottom:14px}.field:last-child{margin-bottom:0}
.row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
label{display:block;font-size:13px;font-weight:600;color:#444;margin-bottom:4px}
input[type=text],input[type=url],input[type=number],textarea{width:100%;padding:9px 12px;border:1.5px solid #dddfe2;border-radius:9px;font-size:14px;font-family:inherit;outline:none;color:#111;background:#fff;transition:border .15s}
input[type=text]:focus,input[type=url]:focus,input[type=number]:focus,textarea:focus{border-color:#0084ff}
input[type=color]{padding:3px 5px;height:38px;cursor:pointer;border-radius:9px;border:1.5px solid #dddfe2;width:100%}
textarea{resize:vertical;min-height:68px;line-height:1.5}
.hint{font-size:11px;color:#8a8d91;margin-top:3px}
.save-bar{position:fixed;bottom:0;left:0;right:300px;background:#fff;border-top:1px solid #e4e6eb;padding:12px 24px;display:flex;align-items:center;gap:12px;z-index:9}
.save-btn{background:#0084ff;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:11px 36px;cursor:pointer;font-family:inherit}
.url-box{flex:1;background:#f7f8fa;border:1px solid #e4e6eb;border-radius:9px;padding:9px 12px;font-size:12px;color:#333;word-break:break-all}
.url-box strong{color:#0084ff}
/* avatar & card img upload */
.img-upload-row{display:flex;align-items:center;gap:14px;margin-top:4px}
.img-thumb{width:60px;height:60px;border-radius:50%;border:2px solid #e4e6eb;overflow:hidden;flex-shrink:0;background:#f0f2f5}
.img-thumb.square{border-radius:10px}
.file-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:#f0f2f5;border-radius:8px;font-size:12px;font-weight:600;color:#333;cursor:pointer;border:1.5px solid #dddfe2}
.file-btn:hover{background:#e4e6eb}
.rm-btn{padding:6px 10px;background:#fff0f0;border-radius:8px;font-size:12px;font-weight:600;color:#c00;cursor:pointer;border:1.5px solid #ffd0d0;font-family:inherit}
/* mini phone */
.mini-phone{width:220px;border-radius:26px;background:#1c1c1e;border:5px solid #1c1c1e;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.2)}
.mp-hdr{background:#fff;padding:7px 10px;display:flex;align-items:center;gap:7px;border-bottom:1px solid #e4e6eb}
.mp-av{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,${esc(tpl.pageColor1)},${esc(tpl.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;position:relative}
.mp-dot{width:8px;height:8px;background:#31a24c;border:2px solid #fff;border-radius:50%;position:absolute;bottom:0;right:0}
.mp-name{font-size:11px;font-weight:700;color:#050505}
.mp-stat{font-size:8px;color:#65676b}
.mp-body{background:#fff;padding:8px 0 6px}
.mp-datesep{text-align:center;font-size:8px;color:#8a8d91;padding:2px 0 7px}
.mp-msgrow{display:flex;align-items:flex-end;gap:5px;padding:2px 7px}
.mp-msgav{width:20px;height:20px;border-radius:50%;flex-shrink:0;overflow:hidden;background:linear-gradient(135deg,${esc(tpl.pageColor1)},${esc(tpl.pageColor2)});display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff}
.mp-bub{max-width:62%;font-size:9px;line-height:1.4;padding:5px 9px;border-radius:12px;background:#f0f2f5;color:#050505;border-bottom-left-radius:3px;word-break:break-word}
.mp-cwrap{padding:3px 7px 3px 32px}
.mp-card{border-radius:9px;border:1px solid #dddfe2;overflow:hidden;max-width:155px}
.mp-cimg{width:100%;aspect-ratio:1/1;position:relative;overflow:hidden;background:linear-gradient(135deg,${esc(tpl.pageColor1)},${esc(tpl.pageColor2)})}
.mp-cbadge{position:absolute;top:5px;left:5px;background:rgba(255,255,255,.9);color:${esc(tpl.pageColor1)};font-size:6px;font-weight:700;padding:2px 5px;border-radius:10px;text-transform:uppercase}
.mp-cbody{background:#fff;padding:6px 8px 5px}
.mp-ctitle{font-size:9px;font-weight:700;color:#050505;margin-bottom:2px}
.mp-cdesc{font-size:7px;color:#65676b;margin-bottom:5px;line-height:1.4}
.mp-cdiv{border:none;border-top:1px solid #e4e6eb;margin:0 0 5px}
.mp-cbtn{display:block;width:100%;padding:4px 0;border-radius:4px;font-size:8px;font-weight:700;text-align:center;border:none;background:${esc(tpl.pageColor1)};color:#fff;font-family:inherit}
.mp-qrrow{display:flex;gap:4px;padding:3px 7px 2px 32px;flex-wrap:wrap}
.mp-chip{font-size:7px;font-weight:600;color:${esc(tpl.pageColor1)};border:1px solid ${esc(tpl.pageColor1)};border-radius:10px;padding:2px 6px}
.mp-seen{text-align:right;padding:2px 9px 4px;font-size:7px;color:#8a8d91}
.mp-input{background:#fff;border-top:1px solid #e4e6eb;padding:6px 8px;display:flex;align-items:center;gap:5px}
.mp-ifield{flex:1;background:#f0f2f5;border-radius:12px;padding:4px 8px;font-size:8px;color:#8a8d91}
.mp-isend{width:22px;height:22px;border-radius:50%;background:${esc(tpl.pageColor1)};display:flex;align-items:center;justify-content:center}
.mp-isend svg{width:10px;height:10px;fill:#fff;margin-left:1px}
@media(max-width:860px){.layout{grid-template-columns:1fr}.preview-col{display:none}.save-bar{right:0}}
@media(max-width:600px){.row-2{grid-template-columns:1fr}}
</style></head>
<body>
<div class="topbar">
  <div class="logo">Lovely. <span style="font-size:13px;font-weight:500;color:#65676b">/ ${esc(tpl.name)}</span></div>
  <a href="/admin" class="back-link" onclick="history.back();return false">← All templates</a>
</div>
<div class="layout">
  <div class="form-col">
    ${msg ? `<div class="msg">${esc(msg)}</div>` : ''}

    <form method="POST" action="/admin/save">
      <input type="hidden" name="pass" value="${esc(pass)}">
      <input type="hidden" name="id"   value="${esc(tpl.id)}">

      <div class="section">
        <div class="section-title">📋 Template name</div>
        <div class="field">
          <label>Internal name (for your reference)</label>
          <input type="text" name="name" value="${esc(tpl.name)}" placeholder="e.g. Deborah 62">
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Page / Sender</div>
        <div class="field">
          <label>Page name (shown in chat header)</label>
          <input type="text" name="pageName" value="${esc(tpl.pageName)}" placeholder="NVMax Official">
        </div>
        <div class="row-2">
          <div class="field"><label>Avatar color 1</label><input type="color" name="pageColor1" value="${esc(tpl.pageColor1)}"><div class="hint">Used if no photo</div></div>
          <div class="field"><label>Avatar color 2</label><input type="color" name="pageColor2" value="${esc(tpl.pageColor2)}"></div>
        </div>
        <div class="field">
          <label>Profile photo</label>
          <div class="img-upload-row">
            <div class="img-thumb">${avHtml}</div>
            <div>
              <form method="POST" action="/admin/avatar" enctype="multipart/form-data">
                <input type="hidden" name="pass" value="${esc(pass)}">
                <input type="hidden" name="id"   value="${esc(tpl.id)}">
                <label class="file-btn">📷 Upload photo<input type="file" name="avatar" accept="image/*" onchange="this.form.submit()" style="display:none"></label>
              </form>
              ${tpl.avatarImg ? `<form method="POST" action="/admin/avatar/remove" style="margin-top:6px"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(tpl.id)}"><button type="submit" class="rm-btn">✕ Remove</button></form>` : ''}
              <div class="hint" style="margin-top:5px">JPG/PNG · max 8MB</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💬 Opening message</div>
        <div class="field">
          <input type="text" name="message" value="${esc(tpl.message)}" placeholder="Hey! I sent you something 🎉">
        </div>
      </div>

      <div class="section">
        <div class="section-title">🃏 Card</div>
        <div class="field"><label>Title</label><input type="text" name="cardTitle" value="${esc(tpl.cardTitle)}"></div>
        <div class="field"><label>Description</label><textarea name="cardDesc">${esc(tpl.cardDesc)}</textarea></div>
        <div class="row-2">
          <div class="field"><label>Badge label</label><input type="text" name="cardBadge" value="${esc(tpl.cardBadge)}"></div>
          <div class="field"><label>Emoji (fallback)</label><input type="text" name="cardEmoji" value="${esc(tpl.cardEmoji)}"></div>
        </div>
        <div class="field">
          <label>Card image</label>
          <div class="img-upload-row">
            <div class="img-thumb square" style="width:70px;height:70px;border-radius:10px;overflow:hidden;background:#f0f2f5">${cardPreviewHtml}</div>
            <div>
              <form method="POST" action="/admin/cardimg" enctype="multipart/form-data">
                <input type="hidden" name="pass" value="${esc(pass)}">
                <input type="hidden" name="id"   value="${esc(tpl.id)}">
                <label class="file-btn">🖼 Upload image<input type="file" name="cardimg" accept="image/*" onchange="this.form.submit()" style="display:none"></label>
              </form>
              ${tpl.cardImg ? `<form method="POST" action="/admin/cardimg/remove" style="margin-top:6px"><input type="hidden" name="pass" value="${esc(pass)}"><input type="hidden" name="id" value="${esc(tpl.id)}"><button type="submit" class="rm-btn">✕ Remove</button></form>` : ''}
              <div class="hint" style="margin-top:5px">Or paste URL below</div>
            </div>
          </div>
          <input type="url" name="cardImg" value="${esc(tpl.cardImg)}" placeholder="https://..." style="margin-top:8px">
        </div>
      </div>

      <div class="section">
        <div class="section-title">🔘 Buttons & redirect</div>
        <div class="field"><label>Primary button</label><input type="text" name="btn1Label" value="${esc(tpl.btn1Label)}"></div>
        <div class="field"><label>Secondary button <span style="font-weight:400;color:#8a8d91">(leave empty to hide)</span></label><input type="text" name="btn2Label" value="${esc(tpl.btn2Label)}"></div>
        <div class="field"><label>Redirect URL ★</label><input type="url" name="redirectURL" value="${esc(tpl.redirectURL)}" required><div class="hint">Where fans go when they click anything</div></div>
      </div>

      <div class="section">
        <div class="section-title">⚡ Quick replies</div>
        <div class="field"><input type="text" name="chips" value="${esc(tpl.chips)}" placeholder="Yes!,Maybe later,Tell me more"><div class="hint">Comma separated — leave empty to hide</div></div>
      </div>

      <div class="section">
        <div class="section-title">⚙️ Settings</div>
        <div class="field"><label>Typing delay (ms)</label><input type="number" name="delay" value="${tpl.delay}" min="0" max="5000" step="100"><div class="hint">0 = instant</div></div>
      </div>

      <div class="save-bar">
        <div class="url-box" id="urlBox"><strong>…/?t=${esc(tpl.id)}</strong></div>
        <button type="submit" class="save-btn">Save →</button>
      </div>
    </form>
  </div>

  <!-- PREVIEW -->
  <div class="preview-col">
    <div class="preview-label">Preview</div>
    <div class="mini-phone">
      <div style="background:${esc(tpl.pageColor1)};height:5px"></div>
      <div class="mp-hdr">
        <div class="mp-av">${avHtml}<div class="mp-dot"></div></div>
        <div><div class="mp-name">${esc(tpl.pageName)}</div><div class="mp-stat">Active now</div></div>
      </div>
      <div class="mp-body">
        <div class="mp-datesep">Today</div>
        <div class="mp-msgrow">
          <div class="mp-msgav">${avHtml}</div>
          <div class="mp-bub">${esc(tpl.message)}</div>
        </div>
        <div class="mp-cwrap">
          <div class="mp-card">
            <div class="mp-cimg">${cardPreviewHtml}<div class="mp-cbadge">${esc(tpl.cardBadge)}</div></div>
            <div class="mp-cbody">
              <div class="mp-ctitle">${esc(tpl.cardTitle)}</div>
              <div class="mp-cdesc">${esc(tpl.cardDesc)}</div>
              <hr class="mp-cdiv">
              <button class="mp-cbtn">${esc(tpl.btn1Label)}</button>
            </div>
          </div>
        </div>
        ${tpl.chips ? `<div class="mp-qrrow">${tpl.chips.split(',').filter(x=>x.trim()).map(ch=>`<div class="mp-chip">${esc(ch.trim())}</div>`).join('')}</div>` : ''}
        <div class="mp-seen">Seen · just now</div>
      </div>
      <div class="mp-input">
        <div class="mp-ifield">Message…</div>
        <div class="mp-isend"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
      </div>
    </div>
  </div>
</div>
<script>
document.getElementById('urlBox').innerHTML='<strong>'+window.location.origin+'/?t=${esc(tpl.id)}</strong>';
</script>
</body></html>`;
}
