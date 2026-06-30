/* ══════════════════════════════════════════════
   Chess Game — Frontend Script
   Features:
   - Per-session game IDs (URL param > localStorage > new)
   - All API calls include ?gameId=<id>
   - Restart button (RESTART signal to C engine)
   - Copy shareable link
   - New Game button
   ══════════════════════════════════════════════ */

let gameId = null;

/* ── Game ID Resolution ──
   Priority: ?gameId=<url> > localStorage > fetch /newgame
*/
async function resolveGameId() {
  // 1. Check URL param — allows sharing a link
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('gameId');
  if (urlId && /^[a-zA-Z0-9_-]{1,64}$/.test(urlId)) {
    gameId = urlId;
    localStorage.setItem('chessGameId', gameId);
    return;
  }

  // 2. Check localStorage — returning visitor
  const stored = localStorage.getItem('chessGameId');
  if (stored && /^[a-zA-Z0-9_-]{1,64}$/.test(stored)) {
    gameId = stored;
    // Reflect the stored ID in URL for easy sharing
    history.replaceState(null, '', `?gameId=${gameId}`);
    return;
  }

  // 3. Request a fresh game ID from the server
  const res = await fetch('/newgame');
  const data = await res.json();
  gameId = data.gameId;
  localStorage.setItem('chessGameId', gameId);
  history.replaceState(null, '', `?gameId=${gameId}`);
}

/* ── Board Rendering ── */
function renderBoard(data) {
  const files = ['a','b','c','d','e','f','g','h'];
  let html = '<table id="chessboard">';

  // Column headers
  html += '<tr><th class="corner"></th>';
  files.forEach(f => html += `<th class="file-label">${f}</th>`);
  html += '</tr>';

  // Rows
  for (let i = 0; i < data.board.length; i++) {
    html += `<tr><th class="rank-label">${8 - i}</th>`;
    data.board[i].forEach((cell, j) => {
      const shade = (i + j) % 2 === 0 ? 'light' : 'dark';
      html += `<td class="${shade}">${cell}</td>`;
    });
    html += '</tr>';
  }
  html += '</table>';

  // Info panel
  html += `
    <div class="info">
      <span class="turn-badge ${data.turn.toLowerCase()}">${data.turn}'s turn</span>
      <span class="status-text">${data.status}</span>
    </div>`;

  // Captured pieces
  html += `
    <div class="captured">
      <div class="captured-section">
        <h3>Captured White</h3>
        <p>${data.capturedWhite || '—'}</p>
      </div>
      <div class="captured-section">
        <h3>Captured Black</h3>
        <p>${data.capturedBlack || '—'}</p>
      </div>
    </div>`;

  document.getElementById('board').innerHTML = html;
}

/* ── Fetch Board ── */
function fetchBoard() {
  if (!gameId) return;
  fetch(`/board?gameId=${gameId}`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      renderBoard(data);
      clearStatus();
    })
    .catch(err => {
      // Silently ignore transient errors (spin-up, restart mid-flight)
      console.warn('Board fetch error:', err.message);
    });
}

/* ── Status helpers ── */
function setStatus(msg, isError = false) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
}
function clearStatus() {
  const el = document.getElementById('statusMsg');
  el.textContent = '';
  el.className = '';
}

/* ── Game ID Display ── */
function updateGameIdDisplay() {
  document.getElementById('gameIdText').textContent =
    gameId ? gameId.slice(0, 8) + '…' : '—';
}

/* ── Submit Move ── */
document.getElementById('moveForm').addEventListener('submit', e => {
  e.preventDefault();
  const move = document.getElementById('moveInput').value.trim();
  if (!move || !gameId) return;

  fetch(`/move?gameId=${gameId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ move })
  })
    .then(r => r.text())
    .then(msg => {
      setStatus(msg);
      document.getElementById('moveInput').value = '';
    })
    .catch(err => setStatus('Error submitting move.', true));
});

/* ── Restart Game ── */
document.getElementById('restartBtn').addEventListener('click', () => {
  if (!gameId) return;
  if (!confirm('Restart this game? The board will reset to starting position.')) return;

  setStatus('Restarting…');
  document.getElementById('restartBtn').disabled = true;

  fetch(`/restart?gameId=${gameId}`, { method: 'POST' })
    .then(r => r.json())
    .then(() => {
      setStatus('Game restarted! White to move.');
      // Give the C engine ~1.5s to reset and write the fresh board
      setTimeout(() => {
        fetchBoard();
        document.getElementById('restartBtn').disabled = false;
        clearStatus();
      }, 1500);
    })
    .catch(err => {
      setStatus('Restart failed. Try again.', true);
      document.getElementById('restartBtn').disabled = false;
    });
});

/* ── Copy Shareable Link ── */
document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const url = `${window.location.origin}?gameId=${gameId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    const original = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = original, 2000);
  }).catch(() => {
    setStatus(`Share this link: ${window.location.href}`, false);
  });
});

/* ── New Game ── */
document.getElementById('newGameBtn').addEventListener('click', async () => {
  if (!confirm('Start a brand-new game? This tab will get a fresh session.')) return;

  const res = await fetch('/newgame');
  const data = await res.json();
  gameId = data.gameId;
  localStorage.setItem('chessGameId', gameId);
  history.replaceState(null, '', `?gameId=${gameId}`);
  updateGameIdDisplay();
  fetchBoard();
  setStatus('New game started!');
});

/* ── Boot ── */
(async () => {
  await resolveGameId();
  updateGameIdDisplay();
  fetchBoard();
  setInterval(fetchBoard, 1000);
})();
