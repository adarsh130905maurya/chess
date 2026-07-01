/* ══════════════════════════════════════════════
   Chess Game — Frontend Script
   Features:
   - Per-session game IDs (URL param > localStorage > new)
   - All API calls include ?gameId=<id>
   - Restart button (RESTART signal to C engine)
   - Copy shareable link
   - New Game button
   - Polling /board every second
   ══════════════════════════════════════════════ */

const POLL_INTERVAL_MS = 1000;

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
  gameId = await fetchNewGameId();
  if (gameId) {
    localStorage.setItem('chessGameId', gameId);
    history.replaceState(null, '', `?gameId=${gameId}`);
  }
}

/* Fetch new game ID from server */
async function fetchNewGameId() {
  try {
    const response = await fetch('/newgame');
    if (!response.ok) throw new Error('Failed to fetch new game ID');
    const data = await response.json();
    return data.gameId;
  } catch (err) {
    showError('Failed to create new game');
    console.error(err);
    return null;
  }
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
    data.board[i].forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  }
  html += '</table>';

  // Info panel
  html += `
    <div class="info">
      <p>Turn: ${data.turn}</p>
      <p>Status: ${data.status}</p>
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
      clearError();
    })
    .catch(err => {
      showError(`Error fetching board: ${err.message}`);
    });
}

/* ── Status and Error helpers ── */
function showError(message) {
  const errorDiv = document.getElementById('errorDisplay');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function clearError() {
  document.getElementById('errorDisplay').style.display = 'none';
}

function showStatus(message, duration = 1000) {
  const statusDiv = document.getElementById('statusDisplay');
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, duration);
}

/* ── Game ID Display ── */
function updateGameIdDisplay() {
  document.getElementById('gameIdValue').textContent = gameId || '—';
}

/* ── Submit Move ── */
document.getElementById('moveForm').addEventListener('submit', e => {
  e.preventDefault();
  const moveInput = document.getElementById('moveInput');
  const move = moveInput.value.trim();
  if (!move || !gameId) return;

  showStatus('Submitting move...', 1000);

  fetch(`/move?gameId=${gameId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ move })
  })
    .then(r => {
      if (!r.ok) throw new Error('Failed to submit move');
      return r.text();
    })
    .then(msg => {
      showStatus(msg, 1000);
      moveInput.value = '';
      fetchBoard();
    })
    .catch(err => {
      showError(`Move error: ${err.message}`);
    });
});

/* ── Restart Game ── */
document.getElementById('restartBtn').addEventListener('click', () => {
  if (!gameId) return;
  if (!confirm('Restart the game? All pieces will be reset.')) return;

  showStatus('Restarting game...', 1000);
  document.getElementById('restartBtn').disabled = true;

  fetch(`/restart?gameId=${gameId}`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error('Failed to restart');
      return r.json();
    })
    .then(() => {
      showStatus('Game restarted!', 2000);
      // Give the C engine ~1.5s to reset and write the fresh board
      setTimeout(() => {
        fetchBoard();
        document.getElementById('restartBtn').disabled = false;
      }, 1500);
    })
    .catch(err => {
      showError(`Restart error: ${err.message}`);
      document.getElementById('restartBtn').disabled = false;
    });
});

/* ── Copy Shareable Link ── */
document.getElementById('copyGameIdBtn').addEventListener('click', () => {
  const gameLink = `${window.location.origin}?gameId=${gameId}`;
  navigator.clipboard.writeText(gameLink).then(() => {
    showStatus('Game link copied!', 2000);
  }).catch(() => {
    showError('Failed to copy link');
  });
});

/* ── New Game ── */
document.getElementById('newGameBtn').addEventListener('click', async () => {
  if (!confirm('Start a brand-new game? This tab will get a fresh session.')) return;

  const newId = await fetchNewGameId();
  if (newId) {
    gameId = newId;
    localStorage.setItem('chessGameId', gameId);
    history.replaceState(null, '', `?gameId=${gameId}`);
    updateGameIdDisplay();
    clearError();
    fetchBoard();
    showStatus('New game created!', 2000);
  }
});

/* ── Boot ── */
(async () => {
  await resolveGameId();
  updateGameIdDisplay();
  fetchBoard();
  setInterval(fetchBoard, POLL_INTERVAL_MS);
})();
