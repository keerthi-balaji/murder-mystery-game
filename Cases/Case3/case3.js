// Helpers
const el = (q, r=document) => r.querySelector(q);
const els = (q, r=document) => [...r.querySelectorAll(q)];
const loadJSON = (p) => fetch(p).then(r=>r.json());
const show = (n) => n.classList.add('show');
const hide = (n) => n.classList.remove('show');

const BASE = './data/';

// Load data
const data = await Promise.all([
  loadJSON(BASE+'map.json'),
  loadJSON(BASE+'locations.json'),
  loadJSON(BASE+'suspects.json'),
  loadJSON(BASE+'clues.json'),
  loadJSON(BASE+'timeline.json'),
  loadJSON(BASE+'answers.json'),
  loadJSON(BASE+'witnesses.json'),
  loadJSON(BASE+'instructions.json'),
  loadJSON(BASE + 'interrogation.json') 
]).then(([map, locations, suspects, clues, timeline, answers, witnesses, instructions, interrogation]) =>
  ({ map, locations, suspects, clues, timeline, answers, witnesses, instructions, interrogation })
);

// Screen toggle
{
  const params = new URLSearchParams(location.search);
  if (params.get('screen') === 'board') {
    hide(el('#screenIntro'));
    show(el('#screenInvestigation'));
    // seed the victim card once
    try { seedVictim(); } catch {}
  }
}

// Screen toggle
const goBtn = document.getElementById('goTimeline');
if (goBtn) {
  goBtn.addEventListener('click', () => {
    window.location.href = './timeline-screen/timeline.html';
  });
}

// ----------------- Modal System -----------------
const modal = el('#modal');
const modalTitle = el('#modalTitle');
const modalBody  = el('#modalBody');
const openModal = (title, html) => {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  show(modal);
  modal.setAttribute('aria-hidden','false');
};
const closeModal = () => { hide(modal); modal.setAttribute('aria-hidden','true'); };
el('.modal__close').addEventListener('click', closeModal);
el('.modal__backdrop').addEventListener('click', closeModal);

els('[data-modal]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const type = btn.dataset.modal;
    if(type === 'instructions'){
      const items = data.instructions.points.map(p=>`<li>${p}</li>`).join('');
      openModal('Murder Board Instructions', `
        <p>${data.instructions.lead}</p>
        <ul>${items}</ul>
        <p><b>Goal:</b> identify culprit, time, location, method, motive. Build the logic on your board first, then submit your guess.</p>
      `);
    }
    if (type === 'interrogation') {
      const html = data.interrogation.map(s => `
      <details>
        <summary><b>${s.name}</b></summary>
        <p>${s.statement}</p>
      </details>
      `).join('');

      openModal('Interrogation Statements', `
      <p class="hint">
        Interviews are not always truthful — motives may be downplayed or misdirected.
        Cross-reference these carefully with clues and timeline events.
      </p>
      ${html}
      `);
    }

    if (type === 'suspects') {
      const grid = data.suspects.map(s => `
        <div class="flip" data-suspect="${s.name}">
          <div class="flip-inner">
            <!-- FRONT -->
            <div class="flip-face flip-front">
              <img src="${s.img}" alt="${s.name}">
              <h4>${s.name}</h4>
              <div class="hint-arrow"> ▸ </div>
            </div>

            <!-- BACK -->
            <div class="flip-face flip-back">
              <h4>${s.name}</h4>
              <div class="body">
                <p class="kv"><b>Occupation:</b> ${s.role}</p>
                <p class="kv"><b>Description:</b> ${s.description}</p>
                <p class="kv"><b>Age:</b> ${s.age ?? '—'} yrs</p>
                <p class="kv"><b>Height:</b> ${s.height_cm ? s.height_cm + ' cm' : '—'}</p>
                <p class="kv"><b>Hair Color:</b> ${s.hair_color || '—'}</p>
              </div>
              <div class="flip-actions">
                <button class="flip-btn" data-act="flip"> ◂ </button>
                <button class="flip-btn" data-act="add-chip">Add to Board</button>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      openModal('Suspect Cards', `<div class="flip-grid">${grid}</div>`);

      // Whole card flips; only "Add to Board" keeps it from flipping.
      modalBody.querySelectorAll('.flip').forEach(card => {
        card.addEventListener('click', (e) => {
          const addBtn = e.target.closest('[data-act="add-chip"]');
          if (addBtn) {
            const name = card.getAttribute('data-suspect');
            const s = data.suspects.find(x => x.name === name);
            if (s) {
              spawnCard({
                title: s.name,
                type: 'Suspect',
                body: `Role: ${s.role}\nAge: ${s.age}\nHeight: ${s.height_cm} cm\nHair: ${s.hair_color}`
              }, undefined, undefined, true);
              layoutCanvas();
            }
            return; // do not flip when adding
          }
          card.classList.toggle('flipped'); // flip on any other click
        });
      });
    }
  if (type === 'map') {
      const MAP_IMG = './data/images/map-background.png'; // your file

      const PINS = [
        { id:'clock',  name:'Clocktower Belfry', top:27, left:21 },
        { id:'clockb', name:'Clocktower Base',   top:43, left:32 },
        { id:'vip',    name:'VIP Lounge',        top:36, left:65 },
        { id:'vip-c',  name:'VIP Corridor',      top:30, left:60 },
        { id:'tunnel',   name:'Service Tunnels', top:28, left:50 },
        { id:'stage',  name:'Riverfront Stage',  top:50, left:50 },
        { id:'front',  name:'Stage Front',       top:47, left:40 },
        { id:'lane',   name:'Artisan Lane Exit', top:48, left:72 },
        { id:'food',   name:'Food Court',        top:73, left:78 },
        { id:'tool',   name:'Tool Shed', top:21, left:78 }
      ];

      openModal('Festival Map', `
        <div class="map-modal">
          <div class="map-head">
            <div class="map-zoom">
              <span>Zoom</span>
              <input id="mapZoomModal" type="range" min="0.8" max="1.7" step="0.05" value="1">
            </div>
            <div class="map-legend" id="mapLegend">Click a pin to preview the location. Double-click pin to add this location to your board.</div>
          </div>
          <div class="map-wrap">
            <div class="map-stage" id="mapStage">
              <img class="map-bg" src="${MAP_IMG}" alt="Festival Map">
              ${PINS.map(p => `<div class="map-pin" data-id="${p.id}" style="top:${p.top}%;left:${p.left}%;"></div>`).join('')}
            </div>
          </div>
          
        </div>
      `);

      const stage = modalBody.querySelector('#mapStage');
      
      const zoomInput = modalBody.querySelector('#mapZoomModal');
      let scale = 1, panX = 0, panY = 0;
      const applyTransform = () => { stage.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`; };
      zoomInput.addEventListener('input', e => { scale = Number(e.target.value); applyTransform(); });

      let dragging=false, sx=0, sy=0, ox=0, oy=0;
      stage.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX; sy=e.clientY; ox=panX; oy=panY; });
      window.addEventListener('mouseup', ()=> dragging=false);
      window.addEventListener('mousemove', e=>{
        if(!dragging) return;
        panX = ox + (e.clientX - sx);
        panY = oy + (e.clientY - sy);
        applyTransform();
      });

      // Create one reusable infobox inside the stage (so it pans/zooms with the map)
const infoBox = document.createElement('div');
infoBox.className = 'map-infobox';
infoBox.style.display = 'none';
stage.appendChild(infoBox);

function showInfoAtPin(pinEl, L){
  if(!L) return;
  infoBox.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <h5>${L.name}</h5>
    <p>${L.desc}</p>
  `;
  // position above the pin using its % coordinates
  const topPct  = parseFloat(pinEl.style.top);
  const leftPct = parseFloat(pinEl.style.left);
  infoBox.style.top  = topPct + '%';
  infoBox.style.left = leftPct + '%';
  infoBox.style.display = 'block';

  infoBox.querySelector('.close').onclick = (e)=>{
    e.stopPropagation();
    infoBox.style.display = 'none';
  };
}




      const legend = modalBody.querySelector('#mapLegend');
      modalBody.querySelectorAll('.map-pin').forEach(pin=>{
        modalBody.querySelectorAll('.map-pin').forEach(pin=>{
          pin.addEventListener('click', ()=>{
            const id = pin.dataset.id;
            const L = data.locations.find(l => l.id === id);
            if (L){
              //legend.textContent = `${L.name}: ${L.desc}`; // keep the legend if you like
              showInfoAtPin(pin, L);                       // floating box near the pin
            }
          });

          pin.addEventListener('dblclick', ()=>{
            const id = pin.dataset.id;
            const L = data.locations.find(l => l.id === id);
            if (L){
              spawnCard({ title:L.name, type:'Location', body:L.desc }, undefined, undefined, true);
              legend.textContent = `${L.name} added to board.`;
              infoBox.style.display = 'none'; // optional: hide after adding
            }
          });
        });

      });

      applyTransform();
    }



  });
});


// ----------------- Timeline -----------------
// ----------------- Interactive Number-Line Timeline -----------------

// after:
const trackEl    = el('.numline-track');
const handle     = el('#numlineHandle');
const pop        = el('#numlinePopover');
const timeBadge  = el('#numlineTime');
const rangeEl    = el('#timeRange');

// build 12 divisions (13 tick marks incl. ends)
const ticksEl = el('.numline-ticks');
if (ticksEl) {
  ticksEl.innerHTML = Array.from({ length: 13 }, (_, i) =>
    `<span style="left:${(i / 12) * 100}%"></span>`
  ).join('');
}


// group events by minute offset from 21:00
const eventsByMinute = {};
data.timeline.forEach(e => {
  const [H, M] = e.t.split(':').map(Number);
  const minute = (H * 60 + M) - (21 * 60);
  if (minute >= 0 && minute <= 60) {
    (eventsByMinute[minute] ||= []).push(e);
  }
});

function setHandleAt(minute) {
  minute = Math.max(0, Math.min(60, Math.round(minute)));
  rangeEl.value = String(minute);
  handle.setAttribute('aria-valuenow', minute);

  const rect = trackEl.getBoundingClientRect();
  const leftPx = 14 + (rect.width * (minute / 60)); // 14px matches track padding
  handle.style.left = leftPx + 'px';

  const timeStr = `21:${String(minute).padStart(2,'0')}`;
  timeBadge.textContent = timeStr;
  timeBadge.style.left = leftPx + 'px';

  const evs = eventsByMinute[minute];
  if (evs) {
    pop.innerHTML = `
      <h5>${timeStr}</h5>
      ${evs.map(e => `<p><b>${e.who}</b> at <b>${e.where}</b>: ${e.event}</p>`).join('')}
    `;
    pop.style.left = leftPx + 'px';
    pop.hidden = false;
  } else {
    pop.hidden = true;
  }
}

// native range input drives the handle
rangeEl.addEventListener('input', e => setHandleAt(Number(e.target.value)));

// drag the custom handle
(() => {
  let dragging = false, startX = 0, startVal = 0, rect;
  const onMove = x => {
    const dx = x - startX;
    const minute = startVal + (dx / rect.width) * 60;
    setHandleAt(minute);
  };
  handle.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startVal = Number(rangeEl.value);
    rect = trackEl.getBoundingClientRect(); e.preventDefault();
  });
  window.addEventListener('mousemove', e => dragging && onMove(e.clientX));
  window.addEventListener('mouseup',   () => dragging = false);

  // keyboard support
  handle.addEventListener('keydown', e => {
    const v = Number(rangeEl.value);
    if (e.key === 'ArrowLeft')  setHandleAt(v - 1);
    if (e.key === 'ArrowRight') setHandleAt(v + 1);
    if (e.key === 'Home')       setHandleAt(0);
    if (e.key === 'End')        setHandleAt(60);
  });
})();

// initialize
setHandleAt(0);


// Map drawer toggle
const mapBtn = document.getElementById('toggleMap');
const mapDrawer = document.getElementById('mapDrawer');
if (mapBtn && mapDrawer) {
  mapBtn.addEventListener('click', ()=>{
    mapDrawer.classList.toggle('open');
    // ensure canvas/board remains sized after layout change
    layoutCanvas();
  });
}

function populateAnswerDropdowns() {
  // Elements
  const culSel = el('#ansCulprit');
  const timeSel = el('#ansTime');
  const locSel = el('#ansLocation');
  const methodSel = el('#ansMethod');
  const motiveSel = el('#ansMotive');

  // Utils
  const setOptions = (sel, opts, placeholder='— Select —') => {
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder;
    sel.appendChild(ph);
    opts.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  };

  // Build option lists
  const suspects = data.suspects.map(s => s.name);
  const times = [...new Set(data.timeline.map(e => e.t))].sort();  // unique, sorted
  const locations = data.locations.map(l => l.name);

  // Use concise, guided choices for method & motive
  const methods = [
    'Pushed from belfry with rope involved',
    'Pushed with grease on railing',
    'Pushed; rope + grease',
    'Other'
  ];

  // If you want these to match the chips exactly, you can sync with the motives array,
  // but here’s a safe curated list:
  const motives = [
    'Artifact smuggling profits',
    'Budget scandal fallout',
    'Reputation/access control',
    'Career rivalry',
    'Debt/payment',
    'Other'
  ];

  // Populate
  setOptions(culSel, suspects, '— Choose culprit —');
  setOptions(timeSel, times, '— Choose time —');
  setOptions(locSel, locations, '— Choose location —');
  setOptions(methodSel, methods, '— Choose method —');
  setOptions(motiveSel, motives, '— Choose motive —');
}

// Call it once data is ready (after you load data and before user interaction)
populateAnswerDropdowns();


// ----------------- Chips -----------------
const mkChip = (html, payload) => {
  const d = document.createElement('div');
  d.className='chip'; d.innerHTML = html;
  d.draggable = true; d.dataset.payload = JSON.stringify(payload);
  d.addEventListener('dragstart', e=> e.dataTransfer.setData('text/plain', d.dataset.payload));
  return d;
};
const suspectsWrap = el('#suspectChips');
data.suspects.forEach(s=> suspectsWrap.append(
  mkChip(`👤 <b>${s.name}</b> <small>— ${s.role}</small>`, {
    title:s.name, type:'Suspect',
    body:`Role: ${s.role}\nAlibi: ${s.alibi}\nMotive: ${s.motive}\nNotes: ${s.notes}`
  })
));
const motives = [
  {name:'Artifact Smuggling Profits', who:'Dr. Marcus Hale', desc:'Sale of museum artifacts to private buyers.'},
  {name:'Budget Scandal Fallout', who:'Lena Ortiz', desc:'Reputation risk from pending article.'},
  {name:'Reputation/Access Control', who:'Tao Nguyen', desc:'Key control liability & reputation.'},
  {name:'Career Rivalry', who:'Priya Nandakumar', desc:'Leaked interview caused conflict.'},
  {name:'Debt/Payment', who:'Evan Brooks', desc:'Cash “consulting” from Hale.'}
];
const motivesWrap = el('#motiveChips');
motives.forEach(m=> motivesWrap.append(
  mkChip(`🎯 <b>${m.name}</b> <small>(${m.who})</small>`, {
    title:m.name, type:'Motive', body:`Suspect: ${m.who}\nWhy: ${m.desc}`
  })
));
const cluesWrap = el('#clueChips');
data.clues.forEach(c=> cluesWrap.append(
  mkChip(`🧩 <b>${c.name}</b> <small>— ${c.at}</small>`, {
    title:c.name, type:'Clue', body:`Found at: ${c.at}\n${c.hint}`
  })
));
// const timeWrap = el('#timeChips');
// data.timeline.forEach(e=> timeWrap.append(
//  mkChip(`⏱️ <b>${e.t}</b> <small>${e.who} @ ${e.where}</small>`, {
//    title:`${e.t} — ${e.who}`, type:'Timeline', body:`Where: ${e.where}\nEvent: ${e.event}`
//  })
//));
const locWrap = el('#locationChips');
data.locations.forEach(L=> locWrap.append(
  mkChip(`📍 <b>${L.name}</b>`, {title:L.name, type:'Location', body:L.desc})
));

// ----------------- Board (scrollable + auto-scroll) -----------------
const board = el('#board');
const inner = el('.board-inner');
const connector = document.createElement('canvas'); connector.className = 'connector';
inner.appendChild(connector);
const ctx = connector.getContext('2d');

let cards = []; let edges = []; let idSeq = 0; let lastSelect = null;

const layoutCanvas = () => {
  // cover the entire working area (not just viewport)
  connector.width = inner.scrollWidth;
  connector.height = inner.scrollHeight;
  drawEdges();
};
window.addEventListener('resize', layoutCanvas);
board.addEventListener('scroll', drawEdges);


const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

function spawnCard({title,type,body}, x=60+Math.random()*80, y=60+Math.random()*80, avoid=false){
  const wrap = document.createElement('div'); wrap.className='card';
  if(avoid){ // simple anti-overlap
    let tries=0; while(cards.some(c=>Math.abs(c.x-x)<220 && Math.abs(c.y-y)<140) && tries<40){ x+=24; y+=24; tries++; }
  }
  wrap.style.left = x+'px'; wrap.style.top = y+'px';
  wrap.innerHTML = `<h4>${title} <small style="color:#9aa3b2">(${type})</small></h4><p>${body.replace(/\n/g,'<br>')}</p>`;
  inner.appendChild(wrap);

  const thisId = ++idSeq;
  const sz = {w: wrap.offsetWidth || 220, h: wrap.offsetHeight || 130};
  cards.push({id:thisId,x,y,...sz,title,type,body});

  // drag with auto-scroll
  let dragging=false, dx=0, dy=0;
  wrap.addEventListener('mousedown', e=>{ dragging=true; const r=wrap.getBoundingClientRect(); dx=e.clientX-r.left; dy=e.clientY-r.top; });
  window.addEventListener('mouseup', ()=> dragging=false);
  window.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const rect = inner.getBoundingClientRect();
    const nx = clamp(e.clientX - rect.left - dx + inner.scrollLeft, 0, inner.clientWidth - sz.w);
    const ny = clamp(e.clientY - rect.top  - dy + inner.scrollTop, 0, inner.clientHeight - sz.h);
    wrap.style.left = nx+'px'; wrap.style.top = ny+'px';
    const c = cards.find(c=>c.id===thisId); c.x=nx; c.y=ny;
    // auto-scroll near edges of outer board viewport
    const view = board.getBoundingClientRect(); const m=60;
    if(e.clientX > view.right - m) board.scrollLeft += 20;
    if(e.clientX < view.left  + m) board.scrollLeft -= 20;
    if(e.clientY > view.bottom - m) board.scrollTop  += 20;
    if(e.clientY < view.top   + m) board.scrollTop  -= 20;
    drawEdges();
  });

  // shift-click to thread
  wrap.addEventListener('click', (e)=>{
    if(!e.shiftKey){ lastSelect=thisId; return; }
    if(lastSelect && lastSelect!==thisId){ edges.push([lastSelect,thisId]); lastSelect=null; drawEdges(); updateProgress(); }
  });

  layoutCanvas(); updateProgress();
}

function drawEdges(){
  ctx.clearRect(0,0,connector.width,connector.height);
  ctx.strokeStyle='#4c5a88'; ctx.lineWidth=2;
  for(const [a,b] of edges){
    const A=cards.find(c=>c.id===a), B=cards.find(c=>c.id===b); if(!A||!B) continue;
    const ax=A.x+A.w/2, ay=A.y+A.h/2, bx=B.x+B.w/2, by=B.y+B.h/2;
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  }
}

// DnD
['dragover','drop'].forEach(evt=> board.addEventListener(evt, e=> e.preventDefault()));
board.addEventListener('drop', e=>{
  const payload = e.dataTransfer.getData('text/plain'); if(!payload) return;
  const obj = JSON.parse(payload);
  const r = inner.getBoundingClientRect();
  const x = e.clientX - r.left + inner.scrollLeft - 40;
  const y = e.clientY - r.top  + inner.scrollTop  - 40;
  spawnCard(obj, x, y, true);
});

// Seed victim card once
let seeded = false;
function seedVictim(){
  if(seeded) return; seeded = true;
  spawnCard({
    title:'Victim: Anika Rao',
    type:'Victim',
    body:'Investigative journalist. Found 21:40 at Harbor Clocktower Belfry during Riverlight Festival.'
  }, 120, 100);
}

// Save / Load / Clear
const saveBoard = () => localStorage.setItem('case3-board', JSON.stringify({cards,edges}));
const loadBoard = () => {
  const raw = localStorage.getItem('case3-board'); if(!raw) return;
  const state = JSON.parse(raw);
  cards=[]; edges=[]; idSeq=0;
  inner.querySelectorAll('.card').forEach(n=>n.remove());
  state.cards.forEach(c=> spawnCard(c, c.x, c.y));
  edges = state.edges || []; drawEdges(); updateProgress();
};
const clearBoard = () => {
  localStorage.removeItem('case3-board');
  cards=[]; edges=[]; idSeq=0;
  inner.querySelectorAll('.card').forEach(n=>n.remove());
  drawEdges(); updateProgress();
  seedVictim();
};
el('#saveBoard').addEventListener('click', ()=>{ saveBoard(); el('#progressBadge').textContent='Progress: saved'; setTimeout(updateProgress,800); });
el('#clearBoard').addEventListener('click', clearBoard);
window.addEventListener('load', loadBoard);

// Progress (non-spoiler)
function updateProgress(){
  const have = {
    culprit: cards.some(c=>/marcus\s+hale/i.test(c.title)||/marcus\s+hale/i.test(c.body)),
    location: cards.some(c=>/clocktower|belfry/i.test(c.title)||/clocktower|belfry/i.test(c.body)),
    time: cards.some(c=>/21:40/.test(c.title)||/21:40/.test(c.body)),
    method: cards.some(c=>/rope|grease|pushed/i.test(c.body)),
    motive: cards.some(c=>/artifact|smuggl/i.test(c.body))
  };
  const checks = Object.values(have).filter(Boolean).length;
  const links  = Math.min(edges.length, 6);
  const pct = Math.round(((checks/5)*0.7 + (links/6)*0.3) * 100);
  el('#progressBadge').textContent = `Progress: ${pct}%`;
}

// Hints (no spoilers)
el('#hintBtn').addEventListener('click', ()=>{
  let hint = 'Try connecting timeline events to related locations and suspects.';
  if(!cards.some(c=>/Clocktower|Belfry/i.test(c.title))) hint = 'Get a Clocktower/Belfry card on the board from the Locations or map.';
  if(!cards.some(c=>/21:40/.test(c.title)||/21:40/.test(c.body))) hint = 'There is a critical event at 21:40—make it a card.';
  if(!cards.some(c=>/artifact|smuggl/i.test(c.body))) hint = 'Look for paperwork about “donors” that is really a buyer list.';
  el('#checkResult').textContent = `Hint: ${hint}`;
});

// Validation (non-spoiler, stays on Screen 2)
el('#solutionForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const guess = {
    culprit:(fd.get('culprit')||'').toLowerCase(),
    time:(fd.get('time')||''),
    location:(fd.get('location')||'').toLowerCase(),
    method:(fd.get('method')||'').toLowerCase(),
    motive:(fd.get('motive')||'').toLowerCase()
  };
  const score = [
    guess.culprit.includes('marcus hale'),
    guess.time.includes('21:40'),
    guess.location.includes('clocktower') && guess.location.includes('belfry'),
    (guess.method.includes('push')||guess.method.includes('pushed')) && (guess.method.includes('rope')||guess.method.includes('grease')),
    (guess.motive.includes('artifact') && (guess.motive.includes('smuggl')||guess.motive.includes('sell')))
  ];
  const correct = score.filter(Boolean).length;
  if(correct===5){ el('#checkResult').textContent = '✅ Correct!'; }
  else{
    const hints = [
      'Culprit not quite right.',
      'Time needs adjusting.',
      'Location is off.',
      'Method description is missing key elements.',
      'Motive needs to be more specific.'
    ].filter((_,i)=>!score[i]).slice(0,2);
    el('#checkResult').textContent = `❌ Not yet. ${correct}/5 match. ${hints.join(' ')}`;
  }
  updateProgress();
});

// --- Library: default collapsed + Collapse All button ---
const libraryPanel = el('#libraryPanel');
if (libraryPanel) {
  const libSections = [...libraryPanel.querySelectorAll('details')];

  // Ensure all library sections are collapsed on load
  libSections.forEach(d => { d.open = false; });

  // Collapse All button
  const collapseBtn = el('#collapseAll');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      libSections.forEach(d => { d.open = false; });
    });
  }
}


// Initial canvas
layoutCanvas();
