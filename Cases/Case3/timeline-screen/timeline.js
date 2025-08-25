// timeline.js (ES module)

// ----- Config -----
const DATA_BASE = '../data/';
const SAVE_KEY = 'case3-timeline-rail';
const ROWS = 9;                 // number of timeline slots
const MIN_TO_PROCEED = 6;       // how many slots must have at least 1 item

// ----- Fetch data -----
const [$witnesses, $drags] = await Promise.all([
  fetch(DATA_BASE + 'witnesses.json').then(r=>r.json()),
  fetch(DATA_BASE + 'draggables.json').then(r=>r.json())
]);
// Expected draggables.json shape:
// { "names":[], "times":[], "locations":[], "phrases":[] }

const $ = (q,r=document)=>r.querySelector(q);
const $truth = await fetch(DATA_BASE + 'timeline.json').then(r => r.json());

// ---------- Validation helpers ----------
const normalize = s => (s||'').toLowerCase().replace(/[^a-z0-9:]+/g,' ').trim();
const timeToMin = t => { const [H,M]=t.split(':').map(Number); return H*60+M; };
const near = (a,b,delta=4) => Math.abs(a-b) <= delta;    // +/- minutes wiggle room

function extractUserEvents() {
  // Convert each slot into a neutral event shape we can test
  return [...rail.querySelectorAll('.slot')].map((slot, idx) => {
    const pills = [...slot.querySelectorAll('.pill')];
    const names     = pills.filter(p=>p.dataset.type==='name').map(p=>p.textContent.replace(/\s*\(.+\)\s*$/,''));
    const times     = pills.filter(p=>p.dataset.type==='time').map(p=>p.textContent.replace(/\s*\(.+\)\s*$/,''));
    const locations = pills.filter(p=>p.dataset.type==='location').map(p=>p.textContent.replace(/\s*\(.+\)\s*$/,''));
    const phrases   = pills.filter(p=>p.dataset.type==='phrase').map(p=>p.textContent.replace(/\s*\(.+\)\s*$/,''));
    const minTime   = times.length ? Math.min(...times.map(timeToMin)) : null;

    return {
      slot: idx+1,
      names, times, locations, phrases,
      minTime,                         // earliest time in the slot
      hasAny: pills.length>0
    };
  });
}

function matchEvent(userEvt, truthEvt) {
  // Soft match: time ±4 min, and fuzzy who/where if present in user slot
  if (userEvt.minTime==null) return false;
  if (!near(userEvt.minTime, timeToMin(truthEvt.t))) return false;

  const hasWho   = !truthEvt.who   || userEvt.names.some(n => normalize(n).includes(normalize(truthEvt.who)));
  const hasWhere = !truthEvt.where || userEvt.locations.some(l => normalize(l).includes(normalize(truthEvt.where)));

  return hasWho && hasWhere;
}


// ----- Render draggables -----
function makeItem(text, type, id){
  const n = document.createElement('div');
  n.className = 'item';
  n.textContent = text;
  n.setAttribute('data-type', type);
  n.setAttribute('data-id', id);
  n.draggable = true;
  n.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id, text }));
  });
  return n;
}
function renderPool(sel, arr, type){
  const box = $(sel);
  box.innerHTML = '';
  arr.forEach((txt,i)=> box.appendChild(makeItem(txt, type, `${type}-${i}`)));
}
renderPool('#pool-names',     $drags.names,     'name');
renderPool('#pool-times',     $drags.times,     'time');
renderPool('#pool-locations', $drags.locations, 'location');
renderPool('#pool-phrases',   $drags.phrases,   'phrase');

// Collapsible controls
document.getElementById('expandAll')?.addEventListener('click', () => {
  document.querySelectorAll('details.coll').forEach(d => d.open = true);
});
document.getElementById('collapseAll')?.addEventListener('click', () => {
  document.querySelectorAll('details.coll').forEach(d => d.open = false);
});

// Collapse all draggables on load
document.querySelectorAll('details.coll').forEach(d => d.open = false);

// ----- Rail with fixed slots (each can hold multiple items) -----
const rail = $('#rail');
rail.innerHTML = '';
const slots = [];
for(let i=0;i<ROWS;i++){
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.innerHTML = `<h4>Slot ${String(i+1).padStart(2,'0')}</h4>`;
  slot.addEventListener('dragover', e=> e.preventDefault());
  slot.addEventListener('drop', e=>{
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain'); if(!raw) return;
    const p = JSON.parse(raw);

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.innerHTML = `${p.text} <small>(${p.type})</small>`;
    pill.setAttribute('data-id', p.id);
    pill.setAttribute('data-type', p.type);

    // allow multiples; click to remove if user changes mind
    pill.addEventListener('click', ()=> { pill.remove(); updatePlaced(); saveState(); });

    slot.appendChild(pill);
    updatePlaced();
    saveState();
  });
  rail.appendChild(slot);
  slots.push(slot);
}

// ========= VALIDATION (replace your current validation block with this) =========

// Hook up the button
const validateBtn = document.getElementById('validateBtn') || document.querySelector('button[data-action="validate"]');
const scoreBadge  = document.getElementById('scoreBadge');
const proceedBtn  = document.getElementById('toBoard');

function textOf(pill){ return pill.textContent.replace(/\s*\(.+\)\s*$/, '').trim().toLowerCase(); }
function pillType(pill){ return pill.getAttribute('data-type'); }

// Normalize a time string like "21:27–21:35" -> ["21:27","21:35"]
function parseTimeToken(txt){
  const t = txt.replace(/\s/g,'');
  if(t.includes('–') || t.includes('-')){
    const [a,b] = t.split(/–|-/);
    return [a,b];
  }
  return [t,t];
}
function toMinutes(hhmm){ const [h,m] = hhmm.split(':').map(Number); return h*60+m; }
function inWindow(timePillTxt, winStart, winEnd){
  const [a,b] = parseTimeToken(timePillTxt);
  const A = toMinutes(a), B = toMinutes(b);
  const S = toMinutes(winStart), E = toMinutes(winEnd);
  // overlap check
  return !(B < S || A > E);
}

// Read current state of slots quickly (no spoilers, just primitives)
function currentFacts(){
  return slots.map(slot=>{
    const pills = [...slot.querySelectorAll('.pill')];
    return {
      times:     pills.filter(p=>pillType(p)==='time').map(textOf),
      names:     pills.filter(p=>pillType(p)==='name').map(textOf),
      locations: pills.filter(p=>pillType(p)==='location').map(textOf),
      phrases:   pills.filter(p=>pillType(p)==='phrase').map(textOf),
    };
  });
}

// Expected “ground truth” facts (order agnostic).
// Each fact can be satisfied if ALL of its required tokens are found together in ANY one slot.
// Time checks allow a window overlap (so “21:27–21:35” satisfies the 21:27–21:35 window).
const EXPECTED = [
  {
    id: 'ropeOut',
    win: ['21:12','21:12'],
    need: { 
      names:['evan brooks'], 
      locations:['tool shed'], 
      phrases:['rope signed out'] 
    }
  },
  {
    id: 'keyOut',
    win: ['21:18','21:18'],
    need: { 
      names:['tao nguyen'], 
      phrases:['key taken for hale'] 
    }
  },
  {
    id: 'priyaLive',
    win: ['21:27','21:35'],
    need: { 
      names:['priya nandakumar'], 
      locations:['stage front','riverfront stage'], 
      phrases:['livestream ongoing'] 
    }
  },
  {
    id: 'haleAskHatch',
    win: ['21:30','21:30'],
    need: { 
      names:['dr. marcus hale'], 
      locations:['vip corridor'], 
      phrases:['asked for the service hatch'] 
    }
  },
  {
    id: 'introVideo',
    win: ['21:31','21:31'],
    need: { 
      locations:['riverfront stage','stage front'], 
      phrases:['intro video played'] 
    }
  },
  {
    id: 'anikaRush',
    win: ['21:34','21:34'],
    need: { 
      names:['anika rao'], 
      locations:['clocktower base'], 
      phrases:['rushed past with a leather folder'] 
    }
  },
  {
    id: 'dustyExit',
    win: ['21:46','21:46'],
    need: { 
      locations:['artisan lane exit'], 
      phrases:['dusty jacket seen'] 
    }
  },
  {
    id: 'ropeBack',
    win: ['21:52','21:52'],
    need: { 
      names:['evan brooks'], 
      locations:['tool shed'] 
    }
  },
  {
    id: 'lenaOps',
    win: ['21:35','21:50'],
    need: { 
      names:['lena ortiz'],
      locations:['food court'],
      phrases:['busy at ops tent']
    }
  }
];

// after EXPECTED is defined
const FACTS_TO_PROCEED = Math.max(7, Math.ceil(EXPECTED.length * 2/3));

// For coverage we care about *time windows* present from the above facts.
const EXPECTED_WINDOWS = EXPECTED.map(e=>e.win.join('–'));

// Try to satisfy a fact in any single slot
function satisfiesFact(slot, fact){
  // Time: at least one time pill that overlaps the window
  const hasTime = slot.times.some(t => inWindow(t, fact.win[0], fact.win[1]));
  if(!hasTime) return false;

  // Required tokens
  const needNames     = (fact.need.names||[]);
  const needLocs      = (fact.need.locations||[]);
  const needPhrases   = (fact.need.phrases||[]);

  const namesOk   = needNames.every(n => slot.names.includes(n));
  const locsOk    = needLocs.length ? needLocs.some(l => slot.locations.includes(l)) : true; // allow either of stage front / riverfront stage
  const phrasesOk = needPhrases.every(p => slot.phrases.includes(p));
  return namesOk && locsOk && phrasesOk;
}

function validateTimeline(){
  const state = currentFacts();

  // Score facts
  const results = EXPECTED.map(fact => {
    const ok = state.some(slot => satisfiesFact(slot, fact));
    return { id: fact.id, ok, win: fact.win };
  });
  const correct = results.filter(r=>r.ok).length;
  const scorePct = Math.round((correct / EXPECTED.length) * 100);
  proceedBtn.disabled = correct < FACTS_TO_PROCEED;

  // Coverage: how many distinct expected time windows are represented somewhere
  const presentWindows = new Set();
  state.forEach(slot=>{
    slot.times.forEach(t=>{
      EXPECTED.forEach(f=>{
        if(inWindow(t, f.win[0], f.win[1])) presentWindows.add(f.win.join('–'));
      });
    });
  });
  const covPct = Math.round((presentWindows.size / EXPECTED_WINDOWS.length) * 100);

  // Badge + proceed gating
  if(scoreBadge){
    scoreBadge.textContent = `Score ${scorePct}% · Coverage ${covPct}%`;
  }
  proceedBtn.disabled = correct < 6; // require 6/8 factual checkpoints before moving on

  // Friendly feedback (non-spoiler)
  const missing = results.filter(r=>!r.ok).map(r=>{
    const [ws,we] = r.win;
    return `You may be missing the event around ${ws}${ws!==we?`–${we}`:''}.`;
  });

  showValidationModal(scorePct, covPct, missing);
}

function showValidationModal(score, cov, lines){
  // reuse your existing modal scaffolding if you like — here’s a simple version:
  const modal = document.getElementById('modal');
  const body  = document.getElementById('modalBody');
  if(!modal || !body) return;

  body.innerHTML = `
    <h3>Timeline Check</h3>
    <p>This non-spoiler check scores how many concrete, witness-backed facts your rail currently satisfies.</p>
    <p><b>Score:</b> ${score}% &nbsp;&nbsp; <b>Coverage:</b> ${cov}%</p>
    ${lines.length ? `<ul>${lines.map(x=>`<li>${x}</li>`).join('')}</ul>` : `<p>Nice! You’ve covered all key checkpoints.</p>`}
  `;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}

// wire button
if(validateBtn){
  validateBtn.addEventListener('click', validateTimeline);
}


// ----- Save / Load / Reset -----
function serialize(){
  return slots.map(s=>{
    return [...s.querySelectorAll('.pill')].map(p=>({
      id: p.getAttribute('data-id'),
      type: p.getAttribute('data-type'),
      text: p.textContent.replace(/\s*\(.+\)\s*$/,'') // strip " (type)"
    }));
  });
}
function hydrate(state){
  state.forEach((arr,idx)=>{
    const s = slots[idx]; if(!s) return;
    // Clear existing (keep title)
    s.querySelectorAll('.pill').forEach(n=>n.remove());
    arr.forEach(p=>{
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${p.text} <small>(${p.type})</small>`;
      pill.setAttribute('data-id', p.id);
      pill.setAttribute('data-type', p.type);
      pill.addEventListener('click', ()=> { pill.remove(); updatePlaced(); saveState(); });
      s.appendChild(pill);
    });
  });
  updatePlaced();
}
function saveState(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(serialize()));
}
function loadState(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return;
  try { hydrate(JSON.parse(raw)); } catch {}
}
function resetState(){
  localStorage.removeItem(SAVE_KEY);
  slots.forEach(s=> s.querySelectorAll('.pill').forEach(n=>n.remove()));
  updatePlaced();
}

// ----- Status + Proceed button -----
function updatePlaced(){
  const count = rail.querySelectorAll('.pill').length;
  $('#placedCount').textContent = `${count} items placed`;

  // consider slot "filled" if it has at least one pill
  const filled = slots.filter(s => s.querySelector('.pill')).length;
  const btn = $('#toBoard');
  btn.disabled = filled < MIN_TO_PROCEED;
}

// Proceed to Screen 3 (board)
$('#toBoard').addEventListener('click', ()=>{
  saveState();
  window.location.href = '../case3.html?screen=board';
});

// Reset button
$('#resetTimeline').addEventListener('click', resetState);

// Load saved state on open
loadState();

// ----- Witness statements modal -----
const modal = $('#modal'), modalBody = $('#modalBody');
function showModal(on){ modal.classList.toggle('show', on); modal.setAttribute('aria-hidden', on ? 'false':'true'); }
$('#openWitness').addEventListener('click', ()=>{
  modalBody.innerHTML = $witnesses.map(w=>`
    <details>
      <summary><b>${w.name}</b>${w.where ? ` — <i>${w.where}</i>`:''}${w.time ? ` @ ${w.time}`:''}</summary>
      <p>${w.statement}</p>
    </details>
  `).join('');
  showModal(true);
});
document.querySelector('.modal__close').addEventListener('click', ()=> showModal(false));
document.querySelector('.modal__backdrop').addEventListener('click', ()=> showModal(false));

function clearCase3Storage() {
  const toDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    // catch timeline + board + any case3-prefixed keys
    if (k.toLowerCase().includes('case3') || k.toLowerCase().startsWith('c3-') || k.toLowerCase().includes('timeline') || k.toLowerCase().includes('board')) {
      toDelete.push(k);
    }
  }
  toDelete.forEach(k => localStorage.removeItem(k));
}

document.addEventListener('click', (e) => {
  const exitLink = e.target.closest('a[data-exit]');
  if (!exitLink) return;
  e.preventDefault();
  clearCase3Storage();
  window.location.href = exitLink.href;
});
