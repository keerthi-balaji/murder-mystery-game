fetch('data/suspects.json')
  .then(res => res.json())
  .then(suspects => {
    const list = document.getElementById('suspects-list');
    list.innerHTML = suspects.map((sus, i) => `
      <div class="suspect-card" onclick="flipCard(this)">
        <div class="suspect-inner">
          <div class="suspect-front">
            <img src="${sus.image}" alt="${sus.name}" class="suspect-img-front"/>
            <div class="suspect-name">${sus.name}</div>
          </div>
          <div class="suspect-back">
            <img src="${sus.image}" alt="${sus.name}" class="suspect-img-back"/>
            <h3>${sus.name}</h3>
            <p>${sus.details}</p>
          </div>
        </div>
      </div>
    `).join('');
  });

function flipCard(card) {
  card.classList.toggle('flipped');
}
