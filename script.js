// Basic DOM helpers
const $ = (sel) => document.querySelector(sel);

// Persona avatars
const avatarMap = {
  "Retrocore Virtuonaut": "https://api.dicebear.com/7.x/micah/svg?seed=Virtuonaut&backgroundColor=eff1f3",
  "Pixelia Chromatica": "https://api.dicebear.com/7.x/micah/svg?seed=Pixelia&backgroundColor=bae6fd",
  "Dr. Aurelius Verne": "https://api.dicebear.com/7.x/micah/svg?seed=Aurelius&backgroundColor=ede9fe",
  "Maxwell Tagora": "https://api.dicebear.com/7.x/micah/svg?seed=Maxwell&backgroundColor=bbf7d0",
  "Sophie Loopmaker": "https://api.dicebear.com/7.x/micah/svg?seed=Sophie&backgroundColor=fef9c3"
};

const defaultPersonas = [
  {name: "Retrocore Virtuonaut", description: "Legendary Retro Game Designer & Programmer."},
  {name: "Pixelia Chromatica", description: "Pixel Graphics Virtuoso & Visual Artist."},
  {name: "Dr. Aurelius Verne", description: "World-Renowned Historian & Scriptwriter."},
  {name: "Maxwell Tagora", description: "HTML5 Game Architect & Programmer."},
  {name: "Sophie Loopmaker", description: "Gameplay Visionary & Level Design Genius."}
];

let appState = {
  openaiKey: "",
  groqKey: "",
  openrouterKey: "",
  activeApi: "openai",
  personas: defaultPersonas,
  userSettings: {temperature: 0.7, maxTokens: 1024},
  projectHistory: []
};

function syncFromStorage() {
  try {
    const saved = localStorage.getItem('aiStudioState');
    if (saved) appState = JSON.parse(saved);
  } catch {}
  $('#openaiKey').value = appState.openaiKey || '';
  $('#groqKey').value = appState.groqKey || '';
  $('#openrouterKey').value = appState.openrouterKey || '';
  $('#temperature').value = appState.userSettings.temperature;
  $('#maxTokens').value = appState.userSettings.maxTokens;
  document.querySelectorAll('input[name="api"]').forEach(r => r.checked = r.value === appState.activeApi);
  updateActiveApiDisplay();
  updatePersonasList();
  showChatHistory();
}

const syncToStorage = () => localStorage.setItem('aiStudioState', JSON.stringify(appState));

const updateActiveApiDisplay = () => {
  $('#activeApiDisplay').innerText = `Current API: ${(appState.activeApi || 'OPENAI').toUpperCase()}`;
};

const setStatus = (msg) => { $('#statusBar').innerText = msg; };

function saveKeys() {
  appState.openaiKey = $('#openaiKey').value.trim();
  appState.groqKey = $('#groqKey').value.trim();
  appState.openrouterKey = $('#openrouterKey').value.trim();
  syncToStorage();
  setStatus('API keys saved.');
}

function clearKeys() {
  appState.openaiKey = appState.groqKey = appState.openrouterKey = '';
  syncToStorage();
  syncFromStorage();
  setStatus('API keys cleared.');
}

function saveSettings() {
  appState.userSettings.temperature = Number($('#temperature').value);
  appState.userSettings.maxTokens = Number($('#maxTokens').value);
  syncToStorage();
  setStatus('Settings saved.');
}

function updatePersonasList() {
  const html = appState.personas.map(p => {
    const av = avatarMap[p.name] ? `<img src="${avatarMap[p.name]}" class="agent-avatar">` : '';
    return `<div>${av}<b>${p.name}</b></div><div class="persona-desc">${p.description}</div>`;
  }).join('');
  $('#personasList').innerHTML = html;
}

function newProject() {
  if (confirm('Start new project? All current chat history will be cleared.')) {
    appState.projectHistory = [];
    showChatHistory();
    setStatus('Started new project.');
  }
}

function exportState() {
  const blob = new Blob([JSON.stringify(appState, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agent_studio_project.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Exported project state.');
}

const importStateFilePrompt = () => $('#importFile').click();

function importStateFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      appState = JSON.parse(ev.target.result);
      updatePersonasList();
      showChatHistory();
      syncToStorage();
      setStatus('Imported!');
    } catch {
      setStatus('Invalid file!');
    }
  };
  reader.readAsText(f);
}

const clearSearch = () => { $('#searchBox').value = ''; showChatHistory(); };

function showChatHistory() {
  let history = appState.projectHistory || [];
  const search = $('#searchBox').value.toLowerCase();
  if (search) {
    history = history.filter(turn =>
      turn.prompt.toLowerCase().includes(search) ||
      turn.responses.some(a => a.persona.toLowerCase().includes(search)) ||
      turn.responses.some(a => a.text.toLowerCase().includes(search))
    );
  }
  const html = history.map((turn, i) => {
    const roundId = `round${i}`;
    const agentsHtml = turn.responses.map(a =>
      `<div class="agent"><img src="${avatarMap[a.persona] || ''}" class="agent-avatar"><b>${a.persona}</b>: <span class="output">${a.text}</span></div>`
    ).join('');
    return `<div class="chat-card" id="${roundId}">
      <div onclick="toggleRound('${roundId}')" class="round-header">
        <b>Round ${history.length - i}</b>
        <span class="timestamp">(${turn.timestamp ? turn.timestamp.slice(0, 19).replace('T',' ') : ''})</span>
        <span class="prompt-label">Prompt:</span> <code>${turn.prompt.slice(0,64)}${turn.prompt.length>64?'...':''}</code>
        <span class="expand-icon" id="${roundId}_toggle">[+]</span>
        <span class="round-controls">
          <button class="control-btn" onclick="event.stopPropagation();copyRound(${i});">Copy</button>
          <button class="control-btn" onclick="event.stopPropagation();exportRound(${i},'md');">Export MD</button>
          <button class="control-btn" onclick="event.stopPropagation();exportRound(${i},'json');">Export JSON</button>
          <button class="control-btn" onclick="event.stopPropagation();deleteRound(${i});">Delete</button>
        </span>
      </div>
      <div class="round-detail hidden" id="${roundId}_detail">${agentsHtml}</div>
    </div>`;
  }).reverse().join('');
  $('#chatHistory').innerHTML = html || '<em>No history yet.</em>';
  if (history.length) toggleRound('round0', true);
}

function toggleRound(id, expand) {
  const el = $(`#${id}_detail`);
  const card = $(`#${id}`);
  const toggle = $(`#${id}_toggle`);
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  if ((expand && !isHidden) || (!expand && isHidden)) return;
  if (isHidden) {
    el.classList.remove('hidden');
    card.classList.remove('collapsed');
    toggle.innerText = '[-]';
  } else {
    el.classList.add('hidden');
    card.classList.add('collapsed');
    toggle.innerText = '[+]';
  }
}

function copyRound(i) {
  const turn = appState.projectHistory[i];
  const text = `Prompt:\n${turn.prompt}\n\n` +
    turn.responses.map(a => `${a.persona}:\n${a.text}`).join('\n\n');
  navigator.clipboard.writeText(text);
  setStatus('Round copied to clipboard!');
}

function exportRound(i, mode) {
  const turn = appState.projectHistory[i];
  let out, name;
  if (mode === 'md') {
    out = `**Prompt:**\n${turn.prompt}\n\n` +
      turn.responses.map(a => `### ${a.persona}\n${a.text}`).join('\n\n');
    name = `round_${i + 1}.md`;
  } else {
    out = JSON.stringify(turn, null, 2);
    name = `round_${i + 1}.json`;
  }
  const blob = new Blob([out], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Round exported.');
}

function deleteRound(i) {
  if (confirm('Delete this round?')) {
    appState.projectHistory.splice(i, 1);
    syncToStorage();
    showChatHistory();
    setStatus('Deleted round.');
  }
}

async function runPanel() {
  const prompt = $('#promptInput').value.trim();
  if (!prompt) return;
  const coop = $('#coopMode').checked;
  setStatus('Running agents...');
  $('#sendBtn').disabled = true;
  const responses = [];
  const prevRound = appState.projectHistory.length ? appState.projectHistory[appState.projectHistory.length - 1] : null;
  for (const persona of appState.personas) {
    const sys = persona.description || persona.name;
    let context = '';
    if (coop) {
      const panelSoFar = responses.map(a => `[${a.persona}]:\n${a.text}\n`).join('');
      const lastRoundPanel = prevRound ? prevRound.responses.map(a => `[Last round by ${a.persona}]:\n${a.text}\n`).join('') : '';
      context = (panelSoFar ? panelSoFar + '\n' : '') + (lastRoundPanel ? lastRoundPanel + '\n' : '') + prompt;
    } else {
      context = prompt;
    }
    const reply = await callAgentAPI(sys, context);
    responses.push({persona: persona.name, text: reply});
    showChatHistory();
    setStatus(`Completed: ${persona.name}`);
  }
  appState.projectHistory.push({prompt, responses, timestamp: new Date().toISOString()});
  syncToStorage();
  showChatHistory();
  $('#promptInput').value = '';
  setStatus(`Last run completed at: ${new Date().toLocaleTimeString()}`);
  $('#sendBtn').disabled = false;
}

async function callAgentAPI(sysPrompt, userPrompt) {
  const api = getActiveApi();
  const key = getActiveApiKey();
  let endpoint, headers = {}, model;
  const temp = appState.userSettings.temperature;
  const max_tokens = appState.userSettings.maxTokens;
  if (api === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    headers = {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'};
    model = 'gpt-4o';
  } else if (api === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'};
    model = 'meta-llama/llama-4-scout-17b-16e-instruct';
  } else if (api === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'};
    model = 'mistral-7b';
  }
  const body = {
    messages: [
      {role: 'system', content: sysPrompt},
      {role: 'user', content: userPrompt}
    ],
    temperature: temp,
    max_tokens: max_tokens,
    model
  };
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.error) {
      setStatus('API error: ' + (data.error.message || JSON.stringify(data)));
      return `[API error: ${data.error.message || JSON.stringify(data)}]`;
    }
    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  } catch (e) {
    setStatus('API error: ' + e);
    return `[API error: ${e}]`;
  }
}

function getActiveApiKey() {
  switch (appState.activeApi) {
    case 'openai':
      return appState.openaiKey;
    case 'groq':
      return appState.groqKey;
    case 'openrouter':
      return appState.openrouterKey;
    default:
      return '';
  }
}

function getActiveApi() {
  for (const r of document.querySelectorAll('input[name="api"]')) {
    if (r.checked) return r.value;
  }
  return 'openai';
}

window.addEventListener('DOMContentLoaded', () => {
  syncFromStorage();
  document.querySelectorAll('input[name="api"]').forEach(r => {
    r.addEventListener('change', () => {
      appState.activeApi = getActiveApi();
      syncToStorage();
      updateActiveApiDisplay();
    });
  });

  $('#newProjectBtn').onclick = newProject;
  $('#exportBtn').onclick = exportState;
  $('#importBtn').onclick = importStateFilePrompt;
  $('#saveKeysBtn').onclick = saveKeys;
  $('#clearKeysBtn').onclick = clearKeys;
  $('#saveSettingsBtn').onclick = saveSettings;
  $('#clearSearchBtn').onclick = clearSearch;
  $('#sendBtn').onclick = runPanel;
  $('#importFile').addEventListener('change', importStateFile);
  $('#searchBox').addEventListener('input', showChatHistory);
  setStatus('Ready.');
});
