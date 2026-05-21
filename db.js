// ============================================================
// db.js — SehatGuide · Data Layer & Shared State
// ============================================================

const DB = {
  patients: JSON.parse(localStorage.getItem('sg_patients') || '[]'),

  guides: (function () {
    const stored = JSON.parse(localStorage.getItem('sg_guides') || '[]');
    const seed = [
      {
        id: 'g1', name: 'Muhammad Ismail', phone: '03337481559',
        pass: 'demo123', exp: '3', lang: 'Urdu, Sindhi', wc: 'yes', gender: 'male',
        hospital: 'Aga Khan University Hospital, Karachi', rating: 4.9, trips: 142
      },
      {
        id: 'g2', name: 'Wareesha Khan', phone: '03123900914',
        pass: 'demo123', exp: '2', lang: 'Urdu, English', wc: 'yes', gender: 'female',
        hospital: 'Mayo Hospital, Lahore', rating: 4.8, trips: 98
      }
    ];
    seed.forEach(s => {
      const existing = stored.find(g => g.id === s.id);
      if (!existing) stored.unshift(s);
      else Object.assign(existing, s);
    });
    return stored;
  })(),

  requests: JSON.parse(localStorage.getItem('sg_requests') || '[]'),
};

// ---- Shared mutable state ----
let currentUser    = null;
let currentRole    = null;
let trackInterval  = null;
let trackProgress  = 0;
let dispatchReqId  = null;
let dispatchTimers = [];
let currentRating  = 0;
let selectedSlot   = null;
let bookingModalOpen = false;

const SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM'
];

const PRICES = {
  standard: 500,
  wheelchair: 800,
  rural: 650,
  elderly: 600
};

const save = () => {
  localStorage.setItem('sg_patients',  JSON.stringify(DB.patients));
  localStorage.setItem('sg_guides',    JSON.stringify(DB.guides));
  localStorage.setItem('sg_requests',  JSON.stringify(DB.requests));
};
