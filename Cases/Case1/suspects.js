function showOverlay(contentHtml) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `<div class="overlay-content">${contentHtml}<br><button onclick="hideOverlay()">Close</button></div>`;
  overlay.classList.remove('hidden');
}
function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

fetch('data/suspects.json')
  .then(res => res.json())
  .then(suspects => {
    const list = document.getElementById('suspects-list');
    list.innerHTML = suspects.map((sus, i) =>
      `<div class="suspect-card" onclick="showSuspect(${i})">
        <img src="${sus.image}" alt="${sus.name}" class="suspect-img"/>
        <div>${sus.name}</div>
      </div>`
    ).join('');
    window.showSuspect = idx => {
      const s = suspects[idx];
      showOverlay(`<h2>${s.name}</h2><p>${s.details}</p>`);
    };
  });