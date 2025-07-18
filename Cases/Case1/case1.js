function showPopup(type) {
  const popup = document.getElementById("popup");
  const content = document.getElementById("popup-content");
  const imageHtml = `
  <img src="/images/leena.png" alt="Dr. Leena Ramaswamy" class="victim-img-fixed">
`;

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
  overlay.innerHTML = `<div class="overlay-content">${contentHtml}<br><button id="popup-close-btn" onclick="hideOverlay()">Close</button></div>`;
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

    if (type === 'crime-scene'){ file = 'data/crime-scene.txt'; 
      fetch(file)
      .then(res => res.text())
      .then(text => {
      const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      const imageHtml = `<img src="/Images/Mysterious Orchid Gala Crime Scene.png" alt="Crime scene" class="crime-scene-img">`;

      const contentHtml = `
        ${imageHtml}
        <h2>${btn.textContent}</h2>
        <div class="crime-scene-wrapper"><p>${formatted}</p></div>
      `;

      showOverlay(contentHtml);
    });
  return;
}
    if (type === 'forensic') {
    file = 'data/forensic.txt';
    fetch(file)
      .then(res => res.text())
      .then(text => {
        const formatted = text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');

        // Float image to top-right
        const imageHtml = `<img src="/images/leena.png" alt="Dr. Leena Ramaswamy" class="victim-img-fixed">`;

        const contentHtml = `
          ${imageHtml}
          <h2>${btn.textContent}</h2>
          <div class="forensic-wrapper"><p>${formatted}</p></div>
        `;

        showOverlay(contentHtml);
      });
  return;
}
    if (type === 'witness') file = 'data/witness.txt';
    fetch(file)
      .then(res => res.text())
      .then(text => {
        const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/\n/g, '<br>');
        showOverlay(`<h2>${btn.textContent}</h2><p>${formatted}</p>`);
      })
  });
});

const answerKeys = ['weapon', 'suspect', 'motive'];
let correctAnswers = {};

// Load correct answers
fetch('data/answers.json')
  .then(res => res.json())
  .then(data => correctAnswers = data);

// Populate dropdowns
Promise.all(
  answerKeys.map(key =>
    fetch(`data/${key}-options.json`).then(res => res.json())
  )
).then(([weaponOpts, suspectOpts, motiveOpts]) => {
  const selectData = { weapon: weaponOpts, suspect: suspectOpts, motive: motiveOpts };
  answerKeys.forEach(key => {
    const select = document.getElementById(key);
    select.innerHTML = `<option value="">--Select--</option>` +
      selectData[key].map(opt => `<option value="${opt}">${opt}</option>`).join('');
  });

  const form = document.getElementById('inline-answer-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('change', () => {
    const allSelected = answerKeys.every(key => form[key].value);
    submitBtn.disabled = !allSelected;
  });

form.onsubmit = function (e) {
  e.preventDefault();

  const selections = {
    weapon: form.weapon.value,
    suspect: form.suspect.value,
    motive: form.motive.value
  };

  fetch('data/answers.json')
    .then(res => res.json())
    .then(correctAnswers => {
      fetch('data/feedback.json')
        .then(res => res.json())
        .then(feedback => {
          const verdictHtml = Object.keys(selections).map(key => {
            const selected = selections[key];
            const correct = correctAnswers[key];
            const isCorrect = selected === correct;

            const explanation = isCorrect
              ? feedback[key][selected]?.correct
              : feedback[key][selected]?.wrong || "No info available.";

            const verdictIcon = isCorrect ? "✅" : "❌";

            return `
              <div class="verdict-block">
                <div class="verdict-icon">${verdictIcon}</div>
                <h3>${key.toUpperCase()}: ${selected}</h3>
                <p>${explanation}</p>
              </div>
            `;
          }).join('');

          showOverlay(`<h2>Case Review</h2>${verdictHtml}`);
        });
    });
};
});