// ================================================================
// app.js — GuideConnect Application Logic
// Depends on: db.js (window.DB must be initialized first)
// ================================================================

// ================================================================
// STATE
// ================================================================
let currentUser = null;
let currentRole = null;   // 'patient' | 'guide'
let trackInterval = null;
let trackProgress = 0;
let unsubRequests = null; // active DB listener unsubscribe fn
let selectedSlot  = null;

const SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM'
];

// ================================================================
// VIEW ROUTING
// ================================================================
function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('view-' + v);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  updateNav(v);
  if (v === 'patient-dash') initPatientDash();
  if (v === 'guide-dash')   initGuideDash();
}

function updateNav(v) {
  const nav = document.getElementById('navLinks');
  if (v === 'patient-dash' && currentUser) {
    nav.innerHTML = `<span style="color:rgba(255,255,255,0.7);font-size:0.85rem;padding:8px 12px;">👤 ${currentUser.name}</span>
                     <button class="nav-btn outline" onclick="logout()">Logout</button>`;
  } else if (v === 'guide-dash' && currentUser) {
    nav.innerHTML = `<span style="color:rgba(255,255,255,0.7);font-size:0.85rem;padding:8px 12px;">🧑‍⚕️ ${currentUser.name}</span>
                     <button class="nav-btn outline" onclick="logout()">Logout</button>`;
  } else {
    nav.innerHTML = `
      <button class="nav-btn outline" onclick="showView('patient-login')">Patient Login</button>
      <button class="nav-btn solid"   onclick="showView('patient-register')">Register Patient</button>
      <button class="nav-btn gold"    onclick="showView('guide-login')">Guide Portal</button>`;
  }
}

// ================================================================
// TOAST NOTIFICATION
// ================================================================
function toast(title, msg, type = '') {
  const t  = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  t.className = 'toast' + (type === 'alert' ? ' toast-alert' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className   = 'alert ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4500);
}

// ================================================================
// PATIENT AUTH
// ================================================================
async function registerPatient() {
  const name      = document.getElementById('pr-name').value.trim();
  const phone     = document.getElementById('pr-phone').value.trim();
  const cnic      = document.getElementById('pr-cnic').value.trim();
  const age       = document.getElementById('pr-age').value.trim();
  const city      = document.getElementById('pr-city').value.trim();
  const pass      = document.getElementById('pr-pass').value;
  const pass2     = document.getElementById('pr-pass2').value;
  const condition = document.querySelector('input[name="pr-condition"]:checked')?.value;

  if (!name || !phone || !cnic || !age || !city || !pass)
    return showAlert('preg-alert', 'Please fill all required fields.');
  if (pass !== pass2)
    return showAlert('preg-alert', 'Passwords do not match.');

  const existing = await DB.findPatient(phone);
  if (existing) return showAlert('preg-alert', 'This phone number is already registered.');

  const patient = { id: 'p_' + Date.now(), name, phone, cnic, age, city, condition, pass };
  await DB.savePatient(patient);
  currentUser = patient; currentRole = 'patient';
  toast('Account Created!', 'Welcome to GuideConnect, ' + name);
  showView('patient-dash');
}

async function loginPatient() {
  const phone = document.getElementById('pl-phone').value.trim();
  const pass  = document.getElementById('pl-pass').value;

  const patient = await DB.findPatient(phone);
  if (!patient || patient.pass !== pass)
    return showAlert('plogin-alert', 'Invalid phone number or password.');

  currentUser = patient; currentRole = 'patient';
  toast('Welcome back!', patient.name + ' — ready to book your guide.');
  showView('patient-dash');
}

function demoLoginPatient() {
  // Usama is already seeded in DB.init()
  DB.findPatient('03069868546').then(patient => {
    currentUser = patient; currentRole = 'patient';
    toast('Logged in as Usama', 'Patient dashboard ready.');
    showView('patient-dash');
  });
}

// ================================================================
// GUIDE AUTH
// ================================================================
async function registerGuide() {
  const name  = document.getElementById('gr-name').value.trim();
  const phone = document.getElementById('gr-phone').value.trim();
  const cnic  = document.getElementById('gr-cnic').value.trim();
  const exp   = document.getElementById('gr-exp').value.trim();
  const lang  = document.getElementById('gr-lang').value.trim();
  const pass  = document.getElementById('gr-pass').value;
  const pass2 = document.getElementById('gr-pass2').value;
  const wc    = document.querySelector('input[name="gr-wc"]:checked')?.value;

  if (!name || !phone || !cnic || !pass)
    return showAlert('greg-alert', 'Please fill all required fields.');
  if (pass !== pass2)
    return showAlert('greg-alert', 'Passwords do not match.');

  const existing = await DB.findGuide(phone);
  if (existing) return showAlert('greg-alert', 'Phone number already registered.');

  const guide = { id: 'g_' + Date.now(), name, phone, cnic, exp, lang, wc, pass };
  await DB.saveGuide(guide);
  currentUser = guide; currentRole = 'guide';
  toast('Guide Registered!', 'Welcome to the team, ' + name + '!');
  showView('guide-dash');
}

async function loginGuide() {
  const phone = document.getElementById('gl-phone').value.trim();
  const pass  = document.getElementById('gl-pass').value;

  const guide = await DB.findGuide(phone);
  if (!guide || guide.pass !== pass)
    return showAlert('glogin-alert', 'Invalid phone number or password.');

  currentUser = guide; currentRole = 'guide';
  toast('Guide Online', 'Welcome ' + guide.name + '! Waiting for requests.');
  showView('guide-dash');
}

async function demoLoginGuide(name) {
  const phone = name === 'Muhammad Ismail' ? '03337481559' : '03123900914';
  const guide = await DB.findGuide(phone);
  if (!guide) { toast('Not found', 'Guide not in database', 'alert'); return; }
  currentUser = guide; currentRole = 'guide';
  toast('Guide Online', 'Logged in as ' + guide.name);
  showView('guide-dash');
}

// ================================================================
// LOGOUT
// ================================================================
function logout() {
  if (unsubRequests) { unsubRequests(); unsubRequests = null; }
  if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }
  currentUser = null; currentRole = null;
  showView('landing');
}

// ================================================================
// PATIENT DASHBOARD
// ================================================================
function initPatientDash() {
  if (!currentUser) return;
  document.getElementById('pd-name').textContent = currentUser.name;
  const condMap = { elderly: '👴 Elderly Patient', wheelchair: '♿ Wheelchair User', rural: '🚌 Rural Visitor' };
  document.getElementById('pd-condition').textContent = condMap[currentUser.condition] || 'Patient';

  const d = document.getElementById('req-date');
  if (d && !d.value) { const t = new Date(); d.min = d.value = t.toISOString().split('T')[0]; }

  renderSlots();

  // Subscribe to this patient's requests for live status updates
  if (unsubRequests) unsubRequests();
  unsubRequests = DB.onMyRequests(currentUser.id, requests => {
    renderMyRequests(requests);
    // If a request just got accepted, start tracking automatically
    const accepted = requests.find(r => r.status === 'accepted' && !r._trackingStarted);
    if (accepted) {
      accepted._trackingStarted = true;
      toast('🎉 Guide Assigned!', accepted.guideName + ' accepted your request and is on the way!');
      startTracking('patient', accepted);
    }
  });
}

async function renderSlots() {
  const grid     = document.getElementById('slotsGrid');
  const hospital = document.getElementById('req-hospital')?.value;
  const date     = document.getElementById('req-date')?.value;
  if (!grid) return;

  const all     = await DB.getRequests();
  const booked  = all.filter(r => r.hospital === hospital && r.date === date && r.status !== 'cancelled')
                     .map(r => r.slot);

  grid.innerHTML = SLOTS.map(s => {
    const taken = booked.includes(s);
    return `<div class="slot ${taken ? 'booked' : ''} ${selectedSlot === s ? 'selected' : ''}"
                 ${taken ? '' : `onclick="selectSlot('${s}')"`}>${s}${taken ? '<br/><span style="font-size:0.65rem;opacity:.6">Booked</span>' : ''}</div>`;
  }).join('');
}

function selectSlot(s) { selectedSlot = s; renderSlots(); }

function renderMyRequests(requests) {
  const container = document.getElementById('myRequests');
  if (!container) return;
  const sorted = [...requests].sort((a, b) => b.timestamp - a.timestamp);
  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No requests yet.</p></div>';
    return;
  }
  container.innerHTML = sorted.map(r => {
    const cls  = { pending: 'status-pending', accepted: 'status-accepted', completed: 'status-completed' }[r.status] || 'status-pending';
    const dot  = { pending: 'dot-yellow', accepted: 'dot-green', completed: 'dot-blue' }[r.status] || 'dot-yellow';
    const info = { pending: '⏳ Broadcasting to all guides…', accepted: '✅ Guide: ' + r.guideName, completed: '🏁 Journey Complete' }[r.status];
    return `<div class="status-card ${cls}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:0.9rem;">${r.hospital}</strong>
        <span style="font-size:0.78rem;"><span class="status-dot ${dot}"></span>${r.status.toUpperCase()}</span>
      </div>
      <div class="req-info">📅 ${r.date} &nbsp;|&nbsp; 🕐 ${r.slot}<br/>${info}${r.notes ? '<br/>📝 ' + r.notes : ''}</div>
      ${r.status === 'accepted' ? `<button class="btn btn-teal" style="margin-top:10px;padding:7px 16px;font-size:0.82rem;" onclick="startTracking('patient', ${JSON.stringify(r).replace(/"/g,'&quot;')})">📍 Track Guide</button>` : ''}
    </div>`;
  }).join('');
}

async function submitRequest() {
  const hospital = document.getElementById('req-hospital').value;
  const date     = document.getElementById('req-date').value;
  const notes    = document.getElementById('req-notes').value.trim();

  if (!hospital)   return showAlert('req-alert', 'Please select a hospital.');
  if (!date)       return showAlert('req-alert', 'Please select a date.');
  if (!selectedSlot) return showAlert('req-alert', 'Please select a time slot.');

  // Check slot availability
  const all      = await DB.getRequests();
  const conflict = all.find(r => r.hospital === hospital && r.date === date && r.slot === selectedSlot && r.status !== 'cancelled');
  if (conflict)  return showAlert('req-alert', 'This slot is already booked. Please pick another.');

  const req = {
    id:               'r_' + Date.now(),
    patientId:        currentUser.id,
    patientName:      currentUser.name,
    patientCondition: currentUser.condition,
    patientCity:      currentUser.city,
    hospital, date,
    slot:             selectedSlot,
    notes,
    status:           'pending',
    guideId:          null,
    guideName:        null,
    timestamp:        Date.now()
  };

  await DB.submitRequest(req);
  selectedSlot = null;
  toast('📡 Request Broadcast', 'Sent to all available guides simultaneously!');
  showAlert('req-alert', '✅ Request sent! Muhammad Ismail & Wareesha Khan have been notified.', 'success');
  renderSlots();
}

// ================================================================
// GUIDE DASHBOARD
// ================================================================
function initGuideDash() {
  if (!currentUser) return;
  document.getElementById('gd-name').textContent = currentUser.name;

  if (unsubRequests) unsubRequests();
  unsubRequests = DB.onRequests(requests => {
    renderGuideRequests(requests);
    renderGuideAccepted(requests);
  });
}

function renderGuideRequests(requests) {
  const container = document.getElementById('guideRequests');
  if (!container) return;

  const pending = requests.filter(r => r.status === 'pending').sort((a, b) => b.timestamp - a.timestamp);
  // Show recently-taken (last 2 min) so the second guide sees the lock
  const taken   = requests.filter(r => r.status === 'accepted' && r.guideId !== currentUser.id && Date.now() - r.acceptedAt < 120000);

  const condIcons = { elderly: '👴', wheelchair: '♿', rural: '🚌' };

  if (pending.length === 0 && taken.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🔔</div><p>No pending requests. New requests appear here instantly.</p></div>';
    return;
  }

  const pendingHTML = pending.map(r => `
    <div class="request-item" id="ri_${r.id}">
      <div class="req-details">
        <h4>${r.patientName} ${condIcons[r.patientCondition] || ''}</h4>
        <span>📍 ${r.hospital}</span><br/>
        <span>📅 ${r.date} &nbsp; 🕐 ${r.slot}</span><br/>
        <span>🏙️ From: ${r.patientCity}</span>
        ${r.notes ? `<br/><span>📝 ${r.notes}</span>` : ''}
      </div>
      <button class="btn-accept" onclick="handleAccept('${r.id}')">Accept ✅</button>
    </div>`).join('');

  // 🔒 FROZEN cards for requests taken by the other guide
  const frozenHTML = taken.map(r => `
    <div class="request-item frozen">
      <div class="req-details">
        <h4>${r.patientName} ${condIcons[r.patientCondition] || ''}
          <span class="badge badge-frozen" style="margin-left:6px;">🔒 Locked</span>
        </h4>
        <span>📍 ${r.hospital}</span><br/>
        <span style="color:#991B1B;font-size:0.82rem;margin-top:4px;display:block;">
          Accepted by ${r.guideName} — no longer available
        </span>
      </div>
      <button disabled style="background:#D1D5DB;color:#6B7280;border:none;padding:9px 16px;border-radius:8px;font-size:0.85rem;cursor:not-allowed;">🔒 Frozen</button>
    </div>`).join('');

  container.innerHTML = pendingHTML + frozenHTML;
}

function renderGuideAccepted(requests) {
  const container = document.getElementById('guideAccepted');
  if (!container) return;
  const myJobs = requests.filter(r => r.guideId === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
  if (myJobs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No accepted jobs yet.</p></div>';
    return;
  }
  container.innerHTML = myJobs.map(r => `
    <div class="status-card status-accepted" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${r.patientName}</strong>
        <span class="badge badge-accepted">${r.status.toUpperCase()}</span>
      </div>
      <div class="req-info">📍 ${r.hospital}<br/>📅 ${r.date} &nbsp; 🕐 ${r.slot}</div>
      ${r.status !== 'completed' ? `<button class="btn btn-teal" style="margin-top:10px;padding:7px 16px;font-size:0.82rem;" onclick='startTracking("guide",${JSON.stringify(r)})'>🗺️ Navigate to Patient</button>` : '<div style="margin-top:8px;color:#065F46;font-size:0.85rem;">✅ Journey Complete</div>'}
    </div>`).join('');
}

async function handleAccept(reqId) {
  // Find the request from DB
  const all = await DB.getRequests();
  const req = all.find(r => r.id === reqId);
  if (!req) return;

  const result = await DB.acceptRequest(reqId, currentUser.id, currentUser.name);

  if (result.success) {
    toast('✅ Request Accepted!', 'Head to ' + req.hospital + ' to meet ' + req.patientName);
    startTracking('guide', { ...req, guideId: currentUser.id, guideName: currentUser.name, status: 'accepted' });
  } else {
    // 🔒 Race lost — show Careem-style locked feedback
    toast('🔒 Request Locked', 'Another guide accepted first. Wait for the next request.', 'alert');
    // Re-render to show the frozen card
    const updated = await DB.getRequests();
    renderGuideRequests(updated);
  }
}

// ================================================================
// LIVE TRACKING — Canvas Animation
// ================================================================
function startTracking(role, req) {
  if (!req) return;
  if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }
  trackProgress = 0;

  const hospCoords = {
    'Aga Khan University Hospital, Karachi': { x: 0.72, y: 0.35, label: 'AKUH Karachi' },
    'Mayo Hospital, Lahore':                 { x: 0.28, y: 0.32, label: 'Mayo Lahore'  }
  };
  const hosp = hospCoords[req.hospital] || { x: 0.5, y: 0.4, label: req.hospital };

  const container = role === 'patient'
    ? document.getElementById('trackingSection')
    : document.getElementById('guideTracking');
  if (!container) return;

  container.innerHTML = `
    <div class="tracking-box">
      <canvas id="trackCanvas" width="500" height="260"></canvas>
    </div>
    <div class="track-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#10B981;"></div> ${role === 'patient' ? 'Guide' : 'You'}</div>
      <div class="legend-item"><div class="legend-dot" style="background:#3B82F6;"></div> Hospital</div>
      <div class="legend-item"><div class="legend-dot" style="background:#F59E0B;"></div> ${role === 'patient' ? 'Your Pickup' : 'Patient'}</div>
    </div>
    <div class="track-info">
      <div class="eta" id="trackETA">--</div>
      <div id="trackStatus" style="color:rgba(255,255,255,0.75);font-size:0.82rem;margin-top:4px;">Calculating route…</div>
      <div style="margin-top:8px;color:rgba(255,255,255,0.55);font-size:0.78rem;">📍 ${req.hospital} &nbsp;|&nbsp; 👤 ${req.patientName}</div>
    </div>`;

  const canvas = document.getElementById('trackCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const guideStart = { x: 0.08, y: 0.82 };
  const patientPos = { x: 0.50, y: 0.65 };
  const hospPos    = { x: hosp.x, y: hosp.y };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function getGuidePos(p) {
    return p <= 0.5
      ? { x: lerp(guideStart.x, patientPos.x, p / 0.5),   y: lerp(guideStart.y, patientPos.y, p / 0.5) }
      : { x: lerp(patientPos.x, hospPos.x, (p - 0.5) / 0.5), y: lerp(patientPos.y, hospPos.y, (p - 0.5) / 0.5) };
  }

  function drawMap() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0B2545'; ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // Dashed path lines
    const pts = [guideStart, patientPos, hospPos].map(p => ({ x: p.x*W, y: p.y*H }));
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    ctx.setLineDash([]);

    // Progress trail
    const gp = getGuidePos(trackProgress);
    const gx = gp.x * W, gy = gp.y * H;
    ctx.strokeStyle = 'rgba(16,185,129,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    if (trackProgress <= 0.5) { ctx.lineTo(gx, gy); }
    else { ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(gx, gy); }
    ctx.stroke();

    // Hospital pin
    [[hospPos, '#3B82F6', '🏥', hosp.label],
     [patientPos, '#F59E0B', role === 'patient' ? '👤' : '📍', role === 'patient' ? 'You' : req.patientName]
    ].forEach(([pos, color, emoji, label]) => {
      const px = pos.x * W, py = pos.y * H;
      ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI*2);
      ctx.fillStyle = color + '33'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
      ctx.font = '12px serif'; ctx.textAlign = 'center';
      ctx.fillText(emoji, px, py - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px DM Sans';
      ctx.fillText(label, px, py + 22);
    });

    // Pulsing guide dot
    const pulse = (Math.sin(Date.now() / 280) + 1) / 2;
    ctx.beginPath(); ctx.arc(gx, gy, 14 + pulse * 7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(16,185,129,${0.35 - pulse * 0.25})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(16,185,129,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(gx, gy, 5, 0, Math.PI*2);
    ctx.fillStyle = '#10B981'; ctx.fill();
    ctx.font = '11px serif'; ctx.textAlign = 'center';
    ctx.fillText('🧑‍⚕️', gx, gy - 13);

    // ETA update
    const remaining = Math.round((1 - trackProgress) * 12);
    const etaEl    = document.getElementById('trackETA');
    const statusEl = document.getElementById('trackStatus');
    if (etaEl) {
      if (trackProgress >= 1) {
        etaEl.textContent   = 'Arrived ✅';
        if (statusEl) statusEl.textContent = 'Patient delivered to ' + hosp.label;
      } else if (trackProgress < 0.5) {
        etaEl.textContent   = remaining + ' min';
        if (statusEl) statusEl.textContent = role === 'patient' ? 'Guide is heading to your location…' : 'En route to patient pickup…';
      } else {
        etaEl.textContent   = remaining + ' min';
        if (statusEl) statusEl.textContent = 'Heading to ' + hosp.label + '…';
      }
    }
  }

  trackInterval = setInterval(() => {
    if (trackProgress < 1) {
      trackProgress += 0.0035;
    } else {
      clearInterval(trackInterval); trackInterval = null;
      DB.completeRequest(req.id);
      toast('Journey Complete ✅', 'Patient delivered to ' + hosp.label);
    }
    drawMap();
  }, 60);
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  DB.init();

  const d = document.getElementById('req-date');
  if (d) { const t = new Date(); d.min = d.value = t.toISOString().split('T')[0]; }
  document.getElementById('req-date')?.addEventListener('change', renderSlots);
  document.getElementById('req-hospital')?.addEventListener('change', renderSlots);
});
