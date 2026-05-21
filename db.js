// ================================================================
// db.js — GuideConnect Database Layer
// ================================================================
// TWO MODES:
//   LOCAL   → uses localStorage. Works across browser TABS on the
//             same device. Good for same-computer demo.
//   FIREBASE → uses Firebase Realtime DB. Works across phones,
//             laptops, any device. Required for a live website.
//
// HOW TO SWITCH TO FIREBASE:
//   Fill in FIREBASE_CONFIG below with your project credentials.
//   The system detects the config automatically and switches modes.
// ================================================================

const FIREBASE_CONFIG = {
  apiKey:            "",   // ← paste from Firebase Console
  authDomain:        "",
  databaseURL:       "",   // e.g. "https://guideconnect-xyz-default-rtdb.firebaseio.com"
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

// ================================================================
// SEED DATA — Pre-registered users (always guaranteed in system)
// ================================================================
const SEED_PATIENTS = [
  {
    id:        'p_usama',
    name:      'Usama',
    phone:     '03069868546',
    pass:      'demo123',
    city:      'Karachi',
    condition: 'elderly',
    age:       '25'
  }
];

const SEED_GUIDES = [
  {
    id:    'g1',
    name:  'Muhammad Ismail',
    phone: '03337481559',
    pass:  'demo123',
    exp:   '3',
    lang:  'Urdu, Sindhi',
    wc:    'yes'
  },
  {
    id:    'g2',
    name:  'Wareesha Khan',
    phone: '03123900914',
    pass:  'demo123',
    exp:   '2',
    lang:  'Urdu, English',
    wc:    'yes'
  }
];

// ================================================================
// INTERNAL HELPERS
// ================================================================
const LS_KEYS = {
  patients: 'gc_patients',
  guides:   'gc_guides',
  requests: 'gc_requests'
};

function lsRead(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
function lsWrite(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  // Broadcast change to other tabs
  localStorage.setItem('gc_last_update', Date.now().toString());
}

// ================================================================
// DB OBJECT — Public API used by app.js
// ================================================================
const DB = {
  mode:     'local',   // 'local' or 'firebase'
  _fbDB:    null,
  _subs:    [],        // active Firebase subscriptions

  // ---------------------------------------------------------------
  // INIT — call once on page load
  // ---------------------------------------------------------------
  init() {
    const hasFirebase = typeof firebase !== 'undefined' &&
                        FIREBASE_CONFIG.apiKey &&
                        FIREBASE_CONFIG.databaseURL;

    if (hasFirebase) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        this._fbDB = firebase.database();
        this.mode  = 'firebase';
        console.log('%c[GuideConnect] 🔥 Firebase mode ACTIVE', 'color:green;font-weight:bold');
        this._seedFirebase();
      } catch (e) {
        console.warn('[GuideConnect] Firebase init failed, falling back to LOCAL', e);
        this.mode = 'local';
        this._seedLocal();
      }
    } else {
      console.log('%c[GuideConnect] 💾 LOCAL mode (same-device tabs only)', 'color:orange;font-weight:bold');
      this.mode = 'local';
      this._seedLocal();
    }
  },

  // ---------------------------------------------------------------
  // SEED — ensure pre-registered users always exist
  // ---------------------------------------------------------------
  _seedLocal() {
    let patients = lsRead(LS_KEYS.patients) || [];
    let guides   = lsRead(LS_KEYS.guides)   || [];
    let requests = lsRead(LS_KEYS.requests) || [];

    SEED_PATIENTS.forEach(sp => {
      if (!patients.find(p => p.id === sp.id)) patients.unshift(sp);
      else Object.assign(patients.find(p => p.id === sp.id), sp);
    });
    SEED_GUIDES.forEach(sg => {
      if (!guides.find(g => g.id === sg.id)) guides.unshift(sg);
      else Object.assign(guides.find(g => g.id === sg.id), sg);
    });

    lsWrite(LS_KEYS.patients, patients);
    lsWrite(LS_KEYS.guides,   guides);
    if (!lsRead(LS_KEYS.requests)) lsWrite(LS_KEYS.requests, requests);
  },

  _seedFirebase() {
    const ref = this._fbDB.ref('gc');
    // Seed patients
    SEED_PATIENTS.forEach(sp => ref.child('patients').child(sp.id).set(sp));
    // Seed guides
    SEED_GUIDES.forEach(sg => ref.child('guides').child(sg.id).set(sg));
  },

  // ---------------------------------------------------------------
  // PATIENT OPERATIONS
  // ---------------------------------------------------------------
  findPatient(phone) {
    if (this.mode === 'local') {
      return (lsRead(LS_KEYS.patients) || []).find(p => p.phone === phone) || null;
    }
    // Firebase: sync read via snapshot (called during login so await is ok)
    return new Promise(resolve => {
      this._fbDB.ref('gc/patients')
        .orderByChild('phone').equalTo(phone).limitToFirst(1)
        .once('value', snap => {
          const data = snap.val();
          resolve(data ? Object.values(data)[0] : null);
        });
    });
  },

  savePatient(patient) {
    if (this.mode === 'local') {
      const list = lsRead(LS_KEYS.patients) || [];
      list.push(patient);
      lsWrite(LS_KEYS.patients, list);
      return Promise.resolve();
    }
    return this._fbDB.ref('gc/patients').child(patient.id).set(patient);
  },

  findGuide(phone) {
    if (this.mode === 'local') {
      return (lsRead(LS_KEYS.guides) || []).find(g => g.phone === phone) || null;
    }
    return new Promise(resolve => {
      this._fbDB.ref('gc/guides')
        .orderByChild('phone').equalTo(phone).limitToFirst(1)
        .once('value', snap => {
          const data = snap.val();
          resolve(data ? Object.values(data)[0] : null);
        });
    });
  },

  saveGuide(guide) {
    if (this.mode === 'local') {
      const list = lsRead(LS_KEYS.guides) || [];
      list.push(guide);
      lsWrite(LS_KEYS.guides, list);
      return Promise.resolve();
    }
    return this._fbDB.ref('gc/guides').child(guide.id).set(guide);
  },

  // ---------------------------------------------------------------
  // REQUEST OPERATIONS
  // ---------------------------------------------------------------
  submitRequest(req) {
    if (this.mode === 'local') {
      const list = lsRead(LS_KEYS.requests) || [];
      list.push(req);
      lsWrite(LS_KEYS.requests, list);
      return Promise.resolve(req.id);
    }
    return this._fbDB.ref('gc/requests').child(req.id).set(req)
      .then(() => req.id);
  },

  // ★ THE CAREEM/YANGO ATOMIC LOCK ★
  // Firebase transaction ensures only ONE guide can win the race.
  // If both press Accept simultaneously, Firebase atomically lets
  // only the first commit through. The loser gets success=false.
  acceptRequest(reqId, guideId, guideName) {
    if (this.mode === 'local') {
      // localStorage — safe within same JS thread
      const list = lsRead(LS_KEYS.requests) || [];
      const req  = list.find(r => r.id === reqId);
      if (!req || req.status !== 'pending') {
        return Promise.resolve({ success: false, reason: 'already_taken' });
      }
      req.status     = 'accepted';
      req.guideId    = guideId;
      req.guideName  = guideName;
      req.acceptedAt = Date.now();
      lsWrite(LS_KEYS.requests, list);
      return Promise.resolve({ success: true });
    }

    // Firebase atomic transaction
    const ref = this._fbDB.ref('gc/requests/' + reqId);
    return new Promise(resolve => {
      ref.transaction(
        current => {
          if (!current || current.status !== 'pending') return; // abort
          return { ...current, status: 'accepted', guideId, guideName, acceptedAt: Date.now() };
        },
        (error, committed) => {
          if (error)     resolve({ success: false, reason: 'error' });
          else if (!committed) resolve({ success: false, reason: 'already_taken' });
          else           resolve({ success: true });
        }
      );
    });
  },

  completeRequest(reqId) {
    if (this.mode === 'local') {
      const list = lsRead(LS_KEYS.requests) || [];
      const req  = list.find(r => r.id === reqId);
      if (req) { req.status = 'completed'; lsWrite(LS_KEYS.requests, list); }
      return Promise.resolve();
    }
    return this._fbDB.ref('gc/requests/' + reqId + '/status').set('completed');
  },

  // ---------------------------------------------------------------
  // REAL-TIME LISTENERS
  // ---------------------------------------------------------------

  // Returns all requests; callback(requestsArray) fired on every change
  onRequests(callback) {
    if (this.mode === 'local') {
      // Poll localStorage (works across tabs via StorageEvent)
      const poll = () => callback(lsRead(LS_KEYS.requests) || []);
      poll();
      const interval = setInterval(poll, 1200);
      const onStorage = () => poll();
      window.addEventListener('storage', onStorage);
      return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
    }
    const ref = this._fbDB.ref('gc/requests');
    const handler = snap => {
      const val = snap.val();
      callback(val ? Object.values(val) : []);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  // Returns only a specific patient's requests
  onMyRequests(patientId, callback) {
    return this.onRequests(all => callback(all.filter(r => r.patientId === patientId)));
  },

  // One-time snapshot of all requests (used for slot availability)
  getRequests() {
    if (this.mode === 'local') {
      return Promise.resolve(lsRead(LS_KEYS.requests) || []);
    }
    return this._fbDB.ref('gc/requests').once('value')
      .then(snap => {
        const val = snap.val();
        return val ? Object.values(val) : [];
      });
  }
};

// Expose globally so app.js can use it
window.DB = DB;
