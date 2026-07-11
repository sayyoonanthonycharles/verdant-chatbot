const chatWindow = document.getElementById('chatWindow');
const composerForm = document.getElementById('composerForm');
const userInput = document.getElementById('userInput');
const typingRow = document.getElementById('typingRow');
const statusText = document.getElementById('statusText');

let history = [];

// Turns simple markdown (**bold**, *italic*, line breaks) into safe HTML
function formatText(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function addMessage(text, sender) {
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;

  if (sender === 'bot') {
    msg.innerHTML = `
      <div class="avatar"><span class="pulse-core small"></span></div>
      <div class="bubble"><p></p></div>
    `;
    msg.querySelector('p').innerHTML = formatText(text);
  } else {
    msg.innerHTML = `<div class="bubble"><p></p></div>`;
    msg.querySelector('p').innerHTML = formatText(text);
  }

  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping(show) {
  typingRow.hidden = !show;
  if (show) chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage(text) {
  addMessage(text, 'user');
  history.push({ role: 'user', content: text });
  showTyping(true);
  statusText.textContent = 'thinking';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    });

    if (!res.ok) throw new Error('Request failed');

    const data = await res.json();
    showTyping(false);
    addMessage(data.reply, 'bot');
    history.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    showTyping(false);
    addMessage("I couldn't reach the server just now. Please try again.", 'bot');
  } finally {
    statusText.textContent = 'online';
  }
}

composerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = '';
  sendMessage(text);
});