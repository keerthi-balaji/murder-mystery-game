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

// After forensic report, go to DB structure screen
document.getElementById('next-2').onclick = () => showScreen('screen-3');

// From DB structure to SQL investigation

document.getElementById('next-3').onclick = async () => {
  console.log("Next-3 clicked");
  try {
    await initDatabase();
    console.log("Database initialized");
    showScreen('screen-4');
  } catch (err) {
    console.error("Failed to initialize DB:", err);
  }
};



// --- SQL Investigation ---
const prompts = [
  {
    prompt: "Use the SQL console to investigate the database. Start by checking <b>access_logs</b> for who accessed Server Room 6 at the time of the murder to get a list of suspects.",
    patterns: [
      /select\s+\*\s+from\s+access_logs\s+where\s+(location_id\s*=\s*101\s+and\s+timestamp\s+like\s+['"]2013-04-14(?:%| 1[9-9]:00:00| 2[0-1]:00:00)['"]|timestamp\s+like\s+['"]2013-04-14(?:%| 1[9-9]:00:00| 2[0-1]:00:00)['"]\s+and\s+location_id\s*=\s*101)/i,
      /select\s+\*\s+from\s+access_logs\s+where\s+(location_id\s*=\s*101\s+and\s+timestamp\s+between\s+['"]2013-04-14 19:00:00['"]\s+and\s+['"]2013-04-14 21:00:00['"]|timestamp\s+between\s+['"]2013-04-14 19:00:00['"]\s+and\s+['"]2013-04-14 21:00:00['"]\s+and\s+location_id\s*=\s*101)/i
    ]
  },
  {
    prompt: "Now that we have a list of suspects (employee IDs), let's check the details of these employees.",
    patterns: [
      /select\s+\*\s+from\s+employees\s+where\s+employee_id\s+in\s*\(\s*(?:1|2|3|999)\s*(?:,\s*(?:1|2|3|999)\s*){1,3}\)/i,
      /select\s+\*\s+from\s+employees\s+where\s+employee_id\s*=\s*(?:1|2|3|999)(?:\s+or\s+employee_id\s*=\s*(?:1|2|3|999)){1,3}/i
    ]
  },
  {
    prompt: "That's interesting. There's no employee with ID number '999'. But Ava Lin and Jonah Reid were both in Server Room 6 at the time of murder. They both had opportunity but did they have motive? Let's check their message logs to see if there's any suspicious activity.",
    patterns: [
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id|receiver_id)\s+in\s*\(.*(employee_id|1|2|3).*?\)/i,
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id|receiver_id)\s*=\s*(1|2|3|employee_id)(\s+or\s+\1\s*=\s*(1|2|3|employee_id)){1,3}/i
    ]
  },
  {
    prompt: "See anything more interesting?? (Hint: Pay close attention to hostile messages from and to Ava Lin!)",
    patterns: [
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id\s*=\s*2\s+or\s+receiver_id\s*=\s*2|receiver_id\s*=\s*2\s+or\s+sender_id\s*=\s*2)/i,
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id|receiver_id)\s+in\s*\(\s*2\s*\)/i
    ]
  },
  {
    prompt: "Very interesting! Looks like both Ava Lin and Jonah Reid have motive for murder. But we need more evidence to confirm. Let's check if any of the employees ran unusual server commands at the time of murder.",
    patterns: [
      /select\s+\*\s+from\s+server_commands\s+where\s+(run_time\s+like\s+['"]2013-04-14(?:%| 1[9-9]:00:00| 2[0-1]:00:00)['"])/i,
      /select\s+\*\s+from\s+server_commands\s+where\s+(run_time\s+between\s+['"]2013-04-14 19:00:00['"]\s+and\s+['"]2013-04-14 21:00:00['"])/i
    ]
  },
  {
    prompt: "Fascinating! Excluding the victim only Ava Lin ran commands using their own access. But, there's a suspicious command ran at 20:25 and again there's no employee with ID number '999'. It looks like someone cloned someone's access card and used that to gain access. But it could be anyone! Let's check everyone's movements by checking their wifi logs within the estimated time of death.",
    patterns: [
      /select\s+\*\s+from\s+wifi_logs\s+where\s+ping_time\s+between\s+['"]2013-04-14 19:00:00['"]\s+and\s+['"]2013-04-14 21:00:00['"]/i,
    /select\s+\*\s+from\s+wifi_logs\s+where\s+ping_time\s+like\s+['"]2013-04-14(?:%| 1[9-9]:00:00| 2[0-1]:00:00)['"]/i
    ]
  },
  {
    prompt: "That's strange. Looks like Ava Lin and someone with employee ID number 4 were the only ones who were in the vicinity of Server Room 6 during the time window. We might have a new suspect, but we don't know who that is. Let's check the their employee details to see if we can find out who they are.",
    patterns: [
      /select\s+\*\s+from\s+employees\s+where\s+employee_id\s*=\s*4/i,
      /select\s+\*\s+from\s+employees\s+where\s+employee_id\s+in\s*\(\s*4\s*\)/i
    ]
  },
  {
    prompt: "Interesting! Malik Awan is our new suspect. He was in the vicinity of Server Room 6 at the time of the murder and he is a remote employee with no restricted access. But, did he have motive? Let's check messages he has exchanged with other employees.",
    patterns: [ 
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id\s*=\s*4\s+or\s+receiver_id\s*=\s*4|receiver_id\s*=\s*4\s+or\s+sender_id\s*=\s*4)/i,
      /select\s+\*\s+from\s+messages\s+where\s+(sender_id|receiver_id)\s+in\s*\(\s*4\s*\)/i
    ]
  }
  
];

let currentPrompt = 0;
function showPrompt() {
  const p = prompts[currentPrompt];
  document.getElementById('sql-prompts').innerHTML = `<div class="sql-prompt"><div class="detective-dialogue"> 
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen: </b></p>
        </div> ${p.prompt}</div>`;
}
showPrompt();

document.getElementById('run-sql').onclick = () => {
  const sql = document.getElementById('sql-query').value.trim();
  const resultContainer = document.getElementById('sql-result');
  document.getElementById('sql-result').classList.remove('hidden');
  const promptContainer = document.getElementById('sql-prompts');

  try {
    const results = db.exec(sql);

    // Display results
    if (results.length === 0) {
      resultContainer.textContent = "Query executed but returned no results.";
    } else {
      const { columns, values } = results[0];
      let html = '<table border="1"><tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
      for (const row of values) {
        html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
      }
      html += '</table>';
      resultContainer.innerHTML = html;
    }

    // Check correctness
    const prompt = prompts[currentPrompt];
    if (validateAny(sql, prompt.patterns)) {
      // Show predefined result
     // promptContainer.innerHTML += `<p style="color:green"><b>✅ Correct query!</b> ${prompt.result}</p>`;
      currentPrompt++;

      if (currentPrompt < prompts.length) {
        showPrompt();
        document.getElementById('sql-query').value = '';
      } else {
        document.getElementById('next-4').disabled = false;
        document.getElementById('sql-input-fields').hidden = true;
        promptContainer.innerHTML = `<div class="sql-prompt"><div class="detective-dialogue"> 
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen: What do you think? Who could it be? Click Next to continue.</b></p>`;
      }
    } else {
      promptContainer.innerHTML += `<p style="color:orange"><b>⚠️ Query ran, but didn’t match expected pattern.</b> Keep exploring!</p>`;
    }

  } catch (err) {
    resultContainer.textContent = "❌ SQL Error: " + err.message;
  }
};


// --- Final Answer Logic ---
document.getElementById('next-4').onclick = () => showScreen('screen-5');

const correctSuspect = "Malik Awan";
const correctMotiveValue = "ai_misuse";

// Get dropdown elements
const suspectSelect = document.getElementById('final-suspect-answer');
const motiveSelect = document.getElementById('final-motive-answer');
const submitBtn = document.getElementById('submit-answer');
const feedback = document.getElementById('answer-feedback');
const finishBtn = document.getElementById('finish-case');

// Enable submit only when both are selected
function checkDropdowns() {
  if (suspectSelect.value && motiveSelect.value) {
    submitBtn.classList.remove('hidden');
  } else {
    submitBtn.classList.add('hidden');
  }
}
suspectSelect.addEventListener('change', checkDropdowns);
motiveSelect.addEventListener('change', checkDropdowns);

// Submission handler
submitBtn.onclick = () => {
  const suspectAns = suspectSelect.value;
  const motiveAns = motiveSelect.value;

  const isCorrect = suspectAns === correctSuspect && motiveAns === correctMotiveValue;

  if (isCorrect) {
    feedback.innerHTML = `
      <div>
        <div class="detective-dialogue"> 
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen: ✅ Congratulations! Case Solved.</b><br><br>
        </p>
        </div>
        <div class="detective-dialogue">
        <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen:</b> Malik Awan, a remote ML engineer, was secretly using the company’s compute infrastructure to train and sell AI models for personal gain. Elina, the company’s auditor, discovered the activity during a routine check and was preparing to report it. Fearing exposure, Malik acted quickly. </p></div>
        <div class="detective-dialogue">
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen:</b> Malik Awan cloned Ava Lin’s access badge and used it to gain unauthorized entry into Server Room 6 on the evening of April 14th. By exploiting his remote privileges, he bypassed surveillance logs to conceal his identity, making it appear as though Ava had accessed the room.</p></div>
        <div class="detective-dialogue">
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen:</b> Inside, Malik disabled critical safety protocols, including grounding protections and circuit fault overrides, then tampered with the server rack’s internal grounding conduit to deliver a high-voltage discharge. The scorched cable fragment and ajar tool panel confirmed deliberate sabotage. Later that evening, Dr. Elina Rao entered the server room alone for a scheduled diagnostic scan. As she interacted with Terminal A12, she unknowingly touched an electrified surface—likely the metal keyboard edge—completing a circuit that electrocuted her instantly.</p></div>
        <div class="detective-dialogue">
          <img src="/Images/detective.png" alt="Detective Priya Sen" class="detective-img" />
          <p><b>Detective Sen:</b> Thanks to your investigation, justice is served!</p></div>
      </div>`;
    finishBtn.classList.remove('hidden');
  } else {
    feedback.innerHTML = `<span style="color:red"><b>❌ Not quite right. Try again!</b></span>`;
  }
};

finishBtn.onclick = () => window.location.href = "../../index.html";


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

function validateAny(sql, patterns) {
  const cleaned = sql.replace(/\s+/g, ' ').trim();
  return patterns.some(pattern => pattern.test(cleaned));
}
