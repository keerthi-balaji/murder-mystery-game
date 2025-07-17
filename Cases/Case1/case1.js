function showPopup(type) {
  const popup = document.getElementById("popup");
  const content = document.getElementById("popup-content");

  fetch(`data/${type}.txt`)
    .then(res => res.text())
    .then(text => {
      content.innerText = text;
      popup.classList.remove("hidden");
    });
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// Utility to show overlay
function showOverlay(contentHtml) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `<div class="overlay-content">${contentHtml}<br><button onclick="hideOverlay()">Close</button></div>`;
  overlay.classList.remove('hidden');
}
function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

// Load logic clues
fetch('data/logic-clues.json')
  .then(res => res.json())
  .then(clues => {
    document.getElementById('logic-clues').innerHTML =
      `<h3>Logic Clues</h3><ul>` +
      clues.map(c => `<li>${c}</li>`).join('') +
      `</ul>`;
  });

// Button handlers
document.querySelectorAll('.detail-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const type = btn.dataset.detail;
    if (type === 'suspects') {
      window.location.href = 'suspects.html';
      return;
    }
    let file = '';
    if (type === 'crime-scene') file = 'data/crime-scene.txt';
    if (type === 'forensic') file = 'data/forensic.txt';
    if (type === 'witness') file = 'data/witness.txt';
    fetch(file)
      .then(res => res.text())
      .then(text => showOverlay(`<h2>${btn.textContent}</h2><p>${text}</p>`));
  });
});

// Answer selection
document.querySelectorAll('.answer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    fetch(`data/${type}-options.json`)
      .then(res => res.json())
      .then(options => {
        let html = `<h2>Select ${type}</h2><form id="answer-form">`;
        html += options.map(opt => `<label><input type="radio" name="answer" value="${opt}"> ${opt}</label><br>`).join('');
        html += `<button type="submit">Submit</button></form>`;
        showOverlay(html);
        document.getElementById('answer-form').onsubmit = function(ev) {
          ev.preventDefault();
          const selected = this.answer.value;
          fetch('data/answers.json')
            .then(res => res.json())
            .then(ans => {
              const correct = ans[type];
              showOverlay(selected === correct
                ? `<h2>Correct!</h2><p>You chose the right answer.</p>`
                : `<h2>Wrong!</h2><p>The correct answer was: ${correct}</p>`);
            });
        };
      });
  });
});
