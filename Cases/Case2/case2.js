// Show screen utility
function showScreen(id) {
  document.querySelectorAll('.game-screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// Screen 1 -> Screen 2
document.getElementById('next-1').onclick = () => showScreen('screen-2');

// Forensic Modal logic
const forensicModal = document.getElementById('forensic-modal');
function openForensicReport() {
  forensicModal.classList.remove('hidden');
  fetch('data/forensic_report.txt')
    .then(res => res.text())
    .then(txt => {
      const htmlFormatted = txt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      document.getElementById('forensic-text').innerHTML = htmlFormatted;
    });
  document.getElementById('next-2').disabled = false;
}
document.getElementById('close-forensic').onclick = () => {
  document.getElementById('forensic-modal').classList.add('hidden');
};

// Next to screen 3
document.getElementById('next-2').onclick = () => showScreen('screen-3');


// --- SQL Investigation ---
const prompts = [
  {
    prompt: "Check how many people accessed Server Room 6 (location_id = 6) in access_logs.",
    validate: sql => /select\s+count\(\*\)\s+from\s+access_logs\s+where\s+location_id\s*=\s*6/i.test(sql.trim()),
    result: "3 people accessed Server Room 6."
  },
  {
    prompt: "List the names of employees who accessed Server Room 6.",
    validate: sql => /select\s+e\.name\s+from\s+access_logs\s+a\s+join\s+employees\s+e\s+on\s+a\.employee_id\s*=\s*e\.employee_id\s+where\s+a\.location_id\s*=\s*6/i.test(sql.replace(/\s+/g,' ').trim()),
    result: "Kiran Rao, Felix Duval, Dr. Mara Vellum"
  }
  // Add more prompts here
];

let currentPrompt = 0;
function showPrompt() {
  const p = prompts[currentPrompt];
  document.getElementById('sql-prompts').innerHTML = `<div class="sql-prompt"><b>Task:</b> ${p.prompt}</div>`;
}
showPrompt();

document.getElementById('run-sql').onclick = () => {
  const sql = document.getElementById('sql-query').value;
  const p = prompts[currentPrompt];
  if (p.validate(sql)) {
    document.getElementById('sql-result').textContent = p.result;
    currentPrompt++;
    if (currentPrompt < prompts.length) {
      showPrompt();
      document.getElementById('sql-query').value = '';
    } else {
      document.getElementById('next-3').disabled = false;
      document.getElementById('sql-prompts').innerHTML = "<b>All tasks complete! Click Next to continue.</b>";
    }
  } else {
    document.getElementById('sql-result').textContent = "Incorrect or incomplete SQL. Try again!";
  }
};

document.getElementById('next-3').onclick = () => showScreen('screen-4');

// --- Final Answer ---
const correctAnswer = "Kiran Rao"; 
document.getElementById('submit-answer').onclick = () => {
  const ans = document.getElementById('final-answer').value.trim();
  if (ans.toLowerCase() === correctAnswer.toLowerCase()) {
    document.getElementById('answer-feedback').innerHTML = "<span style='color:green'><b>Correct! Case solved.</b></span>";
    document.getElementById('finish-case').classList.remove('hidden');
  } else {
    document.getElementById('answer-feedback').innerHTML = "<span style='color:red'><b>Incorrect. Try again.</b></span>";
  }
};
document.getElementById('finish-case').onclick = () => window.location.href = "../../index.html";

// Navigation stack to track screen history
const screenHistory = [];
// Initialize the screen history with screen-1
screenHistory.push('screen-1');

function showScreen(id) {
  document.querySelectorAll('.game-screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  // Push to history if it's a forward move
  if (!screenHistory.length || screenHistory[screenHistory.length - 1] !== id) {
    screenHistory.push(id);
  }
 
}

function goBack() {
  if (screenHistory.length > 1) {
    screenHistory.pop(); // current screen
    const prev = screenHistory[screenHistory.length - 1];
    showScreen(prev);
  }
}

function exitToHome() {
  window.location.href = "../../index.html"; 
}
function openDatabaseInfo() {
  const modal = document.getElementById('dbinfo-modal');
  modal.classList.remove('hidden');
  document.getElementById('dbinfo-text').textContent = "Loading...";

  fetch('data/database_info.txt')
    .then(res => res.text())
    .then(txt => {
      const htmlFormatted = txt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      document.getElementById('dbinfo-text').innerHTML = htmlFormatted;
    });
}

function closeDatabaseInfo() {
  document.getElementById('dbinfo-modal').classList.add('hidden');
}


