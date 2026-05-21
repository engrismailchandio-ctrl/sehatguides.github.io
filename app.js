// ============================================================
// app.js — SehatGuide · Application Logic
// ============================================================

// ===== SLOTS =====
function renderSlots() {
  const grid = document.getElementById('slotsGrid');
  if (!grid) return;
  const today    = document.getElementById('req-date')?.value;
  const hospital = document.getElementById('req-hospital')?.value;
  grid.innerHTML = SLOTS.map(s => {
    const booked = DB.requests.some(
      r => r.slot === s && r.date === today && r.hospital === hospital && r.status !== 'cancelled'
    );
    return `<div class="slot ${booked ? 'booked' : ''} ${selectedSlot === s ? 'selected' : ''}"
      ${booked ? '' : `onclick="selectSlot('${s}')"`} data-slot="${s}">${s}</div>`;
  }).join('');
}
function selectSlot(s) { selectedSlot = s; renderSlots(); }

// ===== VIEW ROUTING =====
function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('view-' + v);
  if (el) { el.classList.add('active'); el.scrollTop = 0; window.scrollTo(0, 0); }
  updateNav(v);
  if (v === 'patient-dash') renderPatientDash();
  if (v === 'guide-dash')   renderGuideDash();
}

function updateNav(v) {
  const nav = document.getElementById('navLinks');
  if (v === 'patient-dash' && currentUser) {
    nav.innerHTML = `
      <span style="color:rgba(255,255,255,0.7);font-size:0.85rem;padding:8px 12px;">
        👤 ${currentUser.name}
      </span>
      <button class="nav-btn solid" onclick="openBookingModal()">+ Book Guide</button>
      <button class="nav-btn outline" onclick="logout()">Logout</button>`;
  } else if (v === 'guide-dash' && currentUser) {
    nav.innerHTML = `
      <span style="color:rgba(255,255,255,0.7);font-size:0.85rem;padding:8px 12px;">
        🧑‍⚕️ ${currentUser.name}
      </span>
      <button class="nav-btn outline" onclick="logout()">Logout</button>`;
  } else {
    nav.innerHTML = `
      <button class="nav-btn outline" onclick="showView('patient-login')">Patient Login</button>
      <button class="nav-btn solid"   onclick="showView('patient-register')">Register</button>
      <button class="nav-btn gold"    onclick="showView('guide-login')">Guide Portal</button>`;
  }
}

// ===== TOAST / ALERT =====
function toast(title, msg, type = '') {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  t.className = 'toast ' + (type === 'alert' ? 'toast-alert' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent  = msg;
  el.className    = 'alert ' + type;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

// ===== BOOKING MODAL =====
function openBookingModal() {
  document.getElementById('bookingModal').classList.add('show');
  bookingModalOpen = true;
  renderSlots();
}
function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('show');
  bookingModalOpen = false;
}

// ===== GUIDE REGISTER MODAL =====
function openGuideRegisterModal() {
  document.getElementById('guideRegisterModal').classList.add('show');
}
function closeGuideRegisterModal() {
  document.getElementById('guideRegisterModal').classList.remove('show');
}

// ===== AUTH =====
function registerPatient() {
  const name  = document.getElementById('pr-name').value.trim();
  const phone = document.getElementById('pr-phone').value.trim();
  const cnic  = document.getElementById('pr-cnic').value.trim();
  const age   = document.getElementById('pr-age').value.trim();
  const city  = document.getElementById('pr-city').value.trim();
  const pass  = document.getElementById('pr-pass').value;
  const pass2 = document.getElementById('pr-pass2').value;
  const condition = document.querySelector('input[name="pr-condition"]:checked')?.value;
  if (!name || !phone || !cnic || !age || !city || !pass) return showAlert('preg-alert', 'Please fill all required fields.');
  if (pass !== pass2) return showAlert('preg-alert', 'Passwords do not match.');
  if (DB.patients.find(p => p.phone === phone)) return showAlert('preg-alert', 'Phone already registered.');
  const patient = { id: 'p' + Date.now(), name, phone, cnic, age, city, condition, pass };
  DB.patients.push(patient); save();
  currentUser = patient; currentRole = 'patient';
  toast('Account Created!', 'Welcome to SehatGuide, ' + name + '!');
  showView('patient-dash');
  setTimeout(openBookingModal, 500);
}

function loginPatient() {
  const phone = document.getElementById('pl-phone').value.trim();
  const pass  = document.getElementById('pl-pass').value;
  const p = DB.patients.find(x => x.phone === phone && x.pass === pass);
  if (!p) return showAlert('plogin-alert', 'Invalid phone or password.');
  currentUser = p; currentRole = 'patient';
  toast('Welcome back!', p.name + ' — let\'s get your guide.');
  showView('patient-dash');
  setTimeout(openBookingModal, 500);
}

function demoLoginPatient() {
  let demo = DB.patients.find(p => p.id === 'p_demo');
  if (!demo) {
    demo = { id: 'p_demo', name: 'Usama Jaffar', phone: '03000000000', cnic: '42201-0000000-0', age: 65, city: 'Larkana, Sindh', condition: 'elderly', pass: 'demo123' };
    DB.patients.push(demo); save();
  } else {
    demo.name = 'Usama Jaffar'; save();
  }
  currentUser = demo; currentRole = 'patient';
  toast('Welcome, Usama!', 'Book a guide for your hospital visit.');
  showView('patient-dash');
  setTimeout(openBookingModal, 500);
}

function registerGuide() {
  const name  = document.getElementById('gr-name').value.trim();
  const phone = document.getElementById('gr-phone').value.trim();
  const cnic  = document.getElementById('gr-cnic').value.trim();
  const exp   = document.getElementById('gr-exp').value.trim();
  const lang  = document.getElementById('gr-lang').value.trim();
  const pass  = document.getElementById('gr-pass').value;
  const pass2 = document.getElementById('gr-pass2').value;
  const wc    = document.querySelector('input[name="gr-wc"]:checked')?.value;
  if (!name || !phone || !cnic || !pass) return showAlert('greg-alert', 'Please fill all required fields.');
  if (pass !== pass2) return showAlert('greg-alert', 'Passwords do not match.');
  if (DB.guides.find(g => g.phone === phone)) return showAlert('greg-alert', 'Phone already registered.');
  const guide = { id: 'g' + Date.now(), name, phone, cnic, exp, lang, wc, pass, gender: 'male', rating: 0, trips: 0 };
  DB.guides.push(guide); save();
  currentUser = guide; currentRole = 'guide';
  closeGuideRegisterModal();
  toast('Guide Registered!', 'Welcome to the team, ' + name + '!');
  showView('guide-dash');
}

function loginGuide() {
  const phone = document.getElementById('gl-phone').value.trim();
  const pass  = document.getElementById('gl-pass').value;
  const g = DB.guides.find(x => x.phone === phone && x.pass === pass);
  if (!g) return showAlert('glogin-alert', 'Invalid phone or password.');
  currentUser = g; currentRole = 'guide';
  toast('Guide Online', 'Welcome ' + g.name + '!');
  showView('guide-dash');
}

function demoLoginGuide(name) {
  const g = DB.guides.find(x => x.name === name);
  if (!g) { toast('Not found', 'Guide not in system', 'alert'); return; }
  currentUser = g; currentRole = 'guide';
  toast('Guide Online', 'Logged in as ' + g.name);
  showView('guide-dash');
}

function logout() {
  currentUser = null; currentRole = null;
  if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }
  dispatchTimers.forEach(clearTimeout); dispatchTimers = [];
  closeBookingModal();
  showView('landing');
}

// ===== SUBMIT REQUEST =====
function submitRequest() {
  const hospital    = document.getElementById('req-hospital').value;
  const date        = document.getElementById('req-date').value;
  const notes       = document.getElementById('req-notes').value;
  const needsWheelchair = document.getElementById('req-wheelchair')?.checked;
  if (!hospital)    return showAlert('req-alert', 'Please select a hospital.');
  if (!date)        return showAlert('req-alert', 'Please select a date.');
  if (!selectedSlot) return showAlert('req-alert', 'Please select a time slot.');

  const conflict = DB.requests.find(
    r => r.slot === selectedSlot && r.date === date && r.hospital === hospital && r.status !== 'cancelled'
  );
  if (conflict) return showAlert('req-alert', 'This slot is already booked. Please choose another.');

  const conditionType = needsWheelchair ? 'wheelchair' : (currentUser.condition || 'standard');
  const fee = PRICES[conditionType] || PRICES.standard;

  const req = {
    id: 'r' + Date.now(),
    patientId: currentUser.id,
    patientName: currentUser.name,
    patientCondition: conditionType,
    patientCity: currentUser.city,
    hospital, date,
    slot: selectedSlot,
    notes,
    needsWheelchair,
    fee,
    status: 'pending',
    guideId: null,
    guideName: null,
    timestamp: Date.now()
  };
  DB.requests.push(req); save();
  selectedSlot = null;
  dispatchReqId = req.id;

  // Close booking modal and go to patient dash → My Requests
  closeBookingModal();
  showView('patient-dash');
  toast('Request Sent! 📤', 'Finding a guide at ' + hospital.split(',')[0] + '…');

  // Simulate dispatch in background — update My Requests
  autoSimulateDispatch(req);
}

// ===== AUTO DISPATCH (background — updates My Requests card) =====
function autoSimulateDispatch(req) {
  dispatchTimers.forEach(clearTimeout); dispatchTimers = [];

  // Show "Notifying guides…" status after 1.5s
  dispatchTimers.push(setTimeout(() => {
    renderPatientDash();
  }, 1500));

  // Guide accepts after ~3.5s
  dispatchTimers.push(setTimeout(() => {
    const freshReq = DB.requests.find(r => r.id === req.id);
    if (!freshReq || freshReq.status !== 'pending') return;

    // Pick a guide from same/any hospital
    const availableGuides = DB.guides.filter(g => g.id === 'g1' || g.id === 'g2');
    const acceptor = availableGuides[Math.floor(Math.random() * availableGuides.length)];

    freshReq.status    = 'accepted';
    freshReq.guideId   = acceptor.id;
    freshReq.guideName = acceptor.name;
    freshReq.guideGender = acceptor.gender;
    save();
    renderPatientDash();
    toast('Guide Confirmed! ✅', acceptor.name + ' is ready at the hospital entrance.', '');
  }, 3500));
}

// ===== PATIENT DASHBOARD =====
function renderPatientDash() {
  if (!currentUser) return;

  // Portal header info
  const nameEl = document.getElementById('pd-name');
  if (nameEl) nameEl.textContent = currentUser.name;
  const condMap = { elderly: '👴 Elderly Patient', wheelchair: '♿ Wheelchair User', rural: '🚌 Rural Visitor' };
  const condEl = document.getElementById('pd-condition');
  if (condEl) condEl.textContent = condMap[currentUser.condition] || 'Patient';

  // Refresh slots
  const d = document.getElementById('req-date');
  if (d && !d.value) {
    const t = new Date();
    d.min = t.toISOString().split('T')[0];
    d.value = t.toISOString().split('T')[0];
  }
  renderSlots();

  // My Requests
  const myReqs = DB.requests.filter(r => r.patientId === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
  const container = document.getElementById('myRequests');
  if (!container) return;
  if (myReqs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No requests yet. Click <strong>+ Book Guide</strong> above or the button below.</p><button class="btn btn-teal" style="margin-top:14px;" onclick="openBookingModal()">+ Book a Guide</button></div>';
    return;
  }

  container.innerHTML = myReqs.map(r => {
    const cls = { pending: 'status-pending', accepted: 'status-accepted', completed: 'status-completed', cancelled: 'status-pending' }[r.status] || 'status-pending';
    const dot = { pending: 'dot-yellow', accepted: 'dot-green', completed: 'dot-blue' }[r.status] || 'dot-yellow';

    const guideGenderIcon = r.guideGender === 'female' ? '👩‍⚕️' : '🧑‍⚕️';
    const statusTxt = {
      pending:   `<span class="dispatch-inline-anim">🔍 Searching for available guide…</span>`,
      accepted:  `<div class="guide-accepted-banner">
                    <div class="guide-accepted-avatar">${guideGenderIcon}</div>
                    <div>
                      <div style="font-weight:700;font-size:0.95rem;">${r.guideName}</div>
                      <div style="font-size:0.8rem;opacity:0.85;">✅ Confirmed · Waiting at hospital entrance</div>
                    </div>
                  </div>`,
      completed: '🏁 Complete — all stops done',
      cancelled: '❌ Cancelled'
    }[r.status] || '';

    const fee = r.fee ? `<br/>💳 Service Fee: <strong>PKR ${r.fee}</strong>` : '';
    const wcTag = r.needsWheelchair ? `<span class="wc-badge">♿ Wheelchair Requested</span>` : '';

    return `<div class="status-card ${cls}">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <strong style="font-size:0.92rem;">${r.hospital}</strong>
        <span style="font-size:0.78rem;"><span class="status-dot ${dot}"></span>${r.status.toUpperCase()}</span>
      </div>
      ${wcTag}
      <div class="req-info">📅 ${r.date} &nbsp;|&nbsp; 🕐 ${r.slot}${fee}${r.notes ? '<br/>📝 ' + r.notes : ''}</div>
      <div style="margin-top:10px;">${statusTxt}</div>
      ${r.status === 'accepted' ? `<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn btn-teal" style="padding:8px 18px;font-size:0.83rem;" onclick="trackAndScroll('${r.id}')">📍 Live Track Journey</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

function trackAndScroll(reqId) {
  const req = DB.requests.find(r => r.id === reqId);
  if (!req) return;
  startTracking('patient', req);
  setTimeout(() => {
    const card = document.getElementById('trackingCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

// ===== GUIDE DASHBOARD =====
function renderGuideDash() {
  if (!currentUser) return;
  const nameEl = document.getElementById('gd-name');
  if (nameEl) nameEl.textContent = currentUser.name;

  const pContainer = document.getElementById('guideRequests');
  const pending       = DB.requests.filter(r => r.status === 'pending').sort((a, b) => b.timestamp - a.timestamp);
  const recentlyTaken = DB.requests.filter(r => r.status === 'accepted' && r.guideId !== currentUser.id && (Date.now() - r.timestamp) < 120000);
  const accepted      = DB.requests.filter(r => r.guideId === currentUser.id);

  if (pending.length === 0 && recentlyTaken.length === 0) {
    pContainer.innerHTML = '<div class="empty-state"><div class="icon">🔔</div><p>No pending requests right now.</p></div>';
  } else {
    const ci = { elderly: '👴', wheelchair: '♿', rural: '🚌' };
    pContainer.innerHTML = pending.map(r => `
      <div class="request-item" id="reqItem_${r.id}">
        <div class="req-details">
          <h4>${r.patientName} ${ci[r.patientCondition] || ''} ${r.needsWheelchair ? '<span class="wc-badge" style="font-size:0.72rem;">♿ Wheelchair</span>' : ''}</h4>
          <span>📍 ${r.hospital}</span><br/>
          <span>📅 ${r.date} 🕐 ${r.slot}</span><br/>
          <span>🏙️ ${r.patientCity}</span>
          ${r.notes ? `<br/><span>📝 ${r.notes}</span>` : ''}
          <br/><span style="color:var(--teal);font-weight:600;">💳 PKR ${r.fee || 500}</span>
        </div>
        <button class="btn-accept" id="accBtn_${r.id}" onclick="acceptRequest('${r.id}')">Accept ✅</button>
      </div>`).join('')
    + recentlyTaken.map(r => `
      <div class="request-item frozen" style="opacity:0.7;">
        <div class="req-details">
          <h4>${r.patientName} <span class="badge badge-frozen">🔒 Taken</span></h4>
          <span>📍 ${r.hospital}</span><br/>
          <span style="color:#991B1B;font-size:0.8rem;">✅ Accepted by ${r.guideName}</span>
        </div>
        <button class="btn-accept" disabled style="background:#D1D5DB;">🔒 Frozen</button>
      </div>`).join('');
  }

  const aContainer = document.getElementById('guideAccepted');
  if (accepted.length === 0) {
    aContainer.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No accepted jobs yet.</p></div>';
  } else {
    aContainer.innerHTML = accepted.sort((a, b) => b.timestamp - a.timestamp).map(r => `
      <div class="status-card status-accepted" style="margin-bottom:12px;">
        <strong>${r.patientName}</strong>
        <div class="req-info">
          📍 ${r.hospital}<br/>
          📅 ${r.date} 🕐 ${r.slot}
          ${r.needsWheelchair ? '<br/>♿ <em>Wheelchair required</em>' : ''}
          <br/>💳 PKR ${r.fee || 500}
        </div>
        <button class="btn btn-teal" style="margin-top:10px;padding:7px 16px;font-size:0.82rem;"
          onclick="startTracking('guide', DB.requests.find(x=>x.id==='${r.id}'))">
          🗺️ Navigate Patient
        </button>
      </div>`).join('');
  }
}

function acceptRequest(reqId) {
  const req = DB.requests.find(r => r.id === reqId);
  if (!req || req.status !== 'pending') {
    toast('Slot Taken', 'Another guide already accepted.', 'alert');
    renderGuideDash();
    return;
  }
  req.status    = 'accepted';
  req.guideId   = currentUser.id;
  req.guideName = currentUser.name;
  req.guideGender = currentUser.gender;
  save();
  const btn  = document.getElementById('accBtn_' + reqId);
  const item = document.getElementById('reqItem_' + reqId);
  if (btn) { btn.disabled = true; btn.textContent = 'Accepted ✅'; }
  if (item) item.classList.add('frozen');
  toast('Request Accepted!', 'You are assigned to ' + req.patientName + '. Wait at the entrance of ' + req.hospital);
  renderGuideDash();
  startTracking('guide', req);
}

// ===== LIVE TRACKING — Hospital Journey =====
const JOURNEY_STOPS = [
  { id: 'entrance', label: 'Entrance',   icon: '🚶', p: 0.30 },
  { id: 'reception', label: 'Reception', icon: '🏥', p: 0.42 },
  { id: 'opd',       label: 'OPD',       icon: '👨‍⚕️', p: 0.57 },
  { id: 'labs',      label: 'Labs',      icon: '🔬', p: 0.73 },
  { id: 'pharmacy',  label: 'Pharmacy',  icon: '💊', p: 0.90 },
];

const HOSPITAL_ROOMS = {
  entrance:  { x: 0.15, y: 0.80 },
  reception: { x: 0.30, y: 0.55 },
  opd:       { x: 0.55, y: 0.35 },
  labs:      { x: 0.75, y: 0.55 },
  pharmacy:  { x: 0.80, y: 0.75 },
};
const roomOrder = ['entrance', 'reception', 'opd', 'labs', 'pharmacy'];

function getCurrentStop(p) {
  let idx = 0;
  JOURNEY_STOPS.forEach((s, i) => { if (p >= s.p) idx = i; });
  return idx;
}

function getAgentPos(p) {
  if (p < 0.30) return { x: 0.10, y: 0.88 };
  const stopIdx = getCurrentStop(p);
  const cur  = JOURNEY_STOPS[stopIdx];
  const next = JOURNEY_STOPS[stopIdx + 1];
  if (!next) return HOSPITAL_ROOMS[cur.id];
  const segP = (p - cur.p) / (next.p - cur.p);
  const a = HOSPITAL_ROOMS[cur.id];
  const b = HOSPITAL_ROOMS[next.id];
  return { x: a.x + (b.x - a.x) * segP, y: a.y + (b.y - a.y) * segP };
}

function startTracking(role, req) {
  if (!req) return;
  const isPatient = (role === 'patient');
  const sectionId = isPatient ? 'trackingSection' : 'guideTracking';
  const section   = document.getElementById(sectionId);
  if (!section) return;

  if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }
  trackProgress = 0;

  const stageBarHTML = JOURNEY_STOPS.map(s =>
    `<div class="jstage" id="jstage_${s.id}"><span class="jicon">${s.icon}</span>${s.label}</div>`
  ).join('');

  section.innerHTML = `
    <div class="tracking-box">
      <canvas id="trackCanvas" width="500" height="260"></canvas>
    </div>
    <div class="journey-stages">${stageBarHTML}</div>
    <div class="track-info">
      <div class="eta" id="trackETA">Departing…</div>
      <div id="trackStatus" style="font-size:0.82rem;color:rgba(255,255,255,0.65);margin-top:4px;">
        ${isPatient ? 'Heading to hospital' : 'Patient on the way'}
      </div>
    </div>
    <div class="track-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#10B981"></div> Guide + Patient</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(27,140,140,0.5)"></div> Planned Route</div>
      <div class="legend-item"><div class="legend-dot" style="background:#3B82F6"></div> Visited</div>
    </div>`;

  const canvas = document.getElementById('trackCanvas');

  function drawMap(p) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0B2545';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (p < 0.28) {
      // External travel map
      ctx.strokeStyle = 'rgba(27,140,140,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.9); ctx.lineTo(W * 0.85, H * 0.2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10B981'; ctx.beginPath();
      ctx.arc(W * 0.85, H * 0.2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '11px DM Sans'; ctx.textAlign = 'center';
      ctx.fillText('🏥 Hospital', W * 0.85, H * 0.12);
      // Moving dot
      const px = W * (0.08 + (0.85 - 0.08) * (p / 0.28));
      const py = H * (0.9  + (0.2  - 0.9)  * (p / 0.28));
      const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
      ctx.beginPath(); ctx.arc(px, py, 12 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${0.3 - pulse * 0.2})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fillStyle = '#10B981'; ctx.fill();
      ctx.font = '10px DM Sans'; ctx.textAlign = 'center';
      ctx.fillText('🚗', px, py - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '8px DM Sans'; ctx.textAlign = 'left';
      ctx.fillText('🗺️ Traveling to hospital', 14, H - 12);
    } else {
      // Inside hospital
      const rooms = HOSPITAL_ROOMS;
      Object.entries(rooms).forEach(([name, pos]) => {
        const stopInfo = JOURNEY_STOPS.find(s => s.id === name);
        const stopIdx  = JOURNEY_STOPS.indexOf(stopInfo);
        const done     = stopInfo && p >= stopInfo.p;
        ctx.beginPath(); ctx.arc(pos.x * W, pos.y * H, 14, 0, Math.PI * 2);
        ctx.fillStyle = done ? 'rgba(16,185,129,0.3)' : 'rgba(27,140,140,0.15)';
        ctx.fill();
        ctx.strokeStyle = done ? '#10B981' : 'rgba(27,140,140,0.6)';
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = done ? '#10B981' : 'rgba(255,255,255,0.5)';
        ctx.font = '10px DM Sans'; ctx.textAlign = 'center';
        ctx.fillText(stopInfo ? stopInfo.icon : '🏢', pos.x * W, pos.y * H + 4);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px DM Sans';
        ctx.fillText(name.charAt(0).toUpperCase() + name.slice(1), pos.x * W, pos.y * H + 20);
      });
      // Planned route
      ctx.strokeStyle = 'rgba(27,140,140,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      roomOrder.forEach((r, i) => {
        const pos = rooms[r];
        if (i === 0) ctx.moveTo(pos.x * W, pos.y * H);
        else ctx.lineTo(pos.x * W, pos.y * H);
      }); ctx.stroke(); ctx.setLineDash([]);
      // Completed path
      const activeStop = getCurrentStop(p);
      if (activeStop > 0) {
        ctx.strokeStyle = 'rgba(16,185,129,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= activeStop; i++) {
          const pos = rooms[roomOrder[i]];
          if (i === 0) ctx.moveTo(pos.x * W, pos.y * H);
          else ctx.lineTo(pos.x * W, pos.y * H);
        } ctx.stroke();
      }
      // Moving agent
      const agentPt = getAgentPos(p);
      const ax = agentPt.x * W, ay = agentPt.y * H;
      const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
      ctx.beginPath(); ctx.arc(ax, ay, 16 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${0.35 - pulse * 0.25})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(ax, ay, 8, 0, Math.PI * 2); ctx.fillStyle = '#10B981'; ctx.fill();
      ctx.font = '10px DM Sans'; ctx.textAlign = 'center';
      ctx.fillText('🧑‍⚕️', ax, ay - 13); ctx.fillText('👤', ax + 10, ay - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '8px DM Sans'; ctx.textAlign = 'left';
      ctx.fillText('🏥 Inside hospital — guide & patient', 14, H - 12);
    }

    // ETA & status
    const etaEl    = document.getElementById('trackETA');
    const statusEl = document.getElementById('trackStatus');
    if (!etaEl) return;
    if (p < 0.25) {
      etaEl.textContent = 'Traveling…';
      if (statusEl) statusEl.textContent = `${isPatient ? 'Heading' : 'Patient heading'} to hospital (${Math.round(p / 0.25 * 100)}%)`;
    } else if (p < 0.30) {
      etaEl.textContent = 'Arrived 🎉';
      if (statusEl) statusEl.textContent = 'Guide meeting patient at entrance';
    } else {
      const stopIdx = getCurrentStop(p);
      const curStop = JOURNEY_STOPS[stopIdx];
      const nextStop = JOURNEY_STOPS[stopIdx + 1];
      const stopsLeft = JOURNEY_STOPS.length - 1 - stopIdx;
      etaEl.textContent = curStop.icon + ' ' + curStop.label;
      if (statusEl) statusEl.textContent = nextStop
        ? `Next: ${nextStop.icon} ${nextStop.label} — ${stopsLeft} stop${stopsLeft !== 1 ? 's' : ''} remaining`
        : 'Almost done — Pharmacy visit in progress';
    }

    JOURNEY_STOPS.forEach((s, i) => {
      const el = document.getElementById('jstage_' + s.id);
      if (!el) return;
      const prevP = i === 0 ? 0 : JOURNEY_STOPS[i - 1].p;
      if (p >= s.p)   el.className = 'jstage done';
      else if (p >= prevP) el.className = 'jstage active';
      else               el.className = 'jstage';
    });
  }

  let lastCompletedToast = false;
  trackInterval = setInterval(() => {
    if (trackProgress < 1) trackProgress += 0.0025;
    else {
      clearInterval(trackInterval); trackInterval = null;
      if (!lastCompletedToast) {
        lastCompletedToast = true;
        const freshReq = DB.requests.find(r => r.id === req.id);
        if (freshReq) { freshReq.status = 'completed'; save(); }
        JOURNEY_STOPS.forEach(s => {
          const el = document.getElementById('jstage_' + s.id);
          if (el) el.className = 'jstage done';
        });
        const etaEl    = document.getElementById('trackETA');
        const statusEl = document.getElementById('trackStatus');
        if (etaEl)    etaEl.textContent    = 'Complete ✅';
        if (statusEl) statusEl.textContent = 'Medical process complete — journey finished!';
        toast('Journey Complete! 🎉', 'All hospital stops done. Please rate your guide.', '');
        const guide = DB.guides.find(g => g.id === req.guideId);
        setTimeout(() => showRating(guide ? guide.name : req.guideName || 'Guide', req), 800);
      }
      return;
    }
    drawMap(trackProgress);
  }, 50);
}

// ===== RATING =====
function showRating(guideName, req) {
  currentRating = 0;
  document.getElementById('ratingGuideName').textContent = guideName;
  document.getElementById('ratingComment').value = '';
  setStar(0);
  document.getElementById('ratingOverlay').classList.add('show');
}
function setStar(n) {
  currentRating = n;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('lit', parseInt(btn.dataset.star) <= n);
  });
}
function submitRating() {
  if (currentRating === 0) return setStar(5);
  closeRating();
  toast('Rating Submitted ⭐', 'Thank you, ' + currentUser?.name + '! Your feedback matters.', '');
}
function closeRating() {
  document.getElementById('ratingOverlay').classList.remove('show');
  renderPatientDash();
}

// ===== POLL =====
setInterval(() => {
  if (currentRole === 'guide'   && document.getElementById('view-guide-dash')?.classList.contains('active'))   renderGuideDash();
  if (currentRole === 'patient' && document.getElementById('view-patient-dash')?.classList.contains('active')) renderPatientDash();
}, 2000);

// ===== INIT =====
(function init() {
  const d = document.getElementById('req-date');
  if (d) {
    const t = new Date();
    d.min   = t.toISOString().split('T')[0];
    d.value = t.toISOString().split('T')[0];
  }
  document.getElementById('req-date')?.addEventListener('change', renderSlots);
  document.getElementById('req-hospital')?.addEventListener('change', renderSlots);
  renderSlots();
})();
