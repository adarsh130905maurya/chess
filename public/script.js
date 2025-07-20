function renderBoard(data) {
  let html = '<table id="chessboard">';
  const files = ['a','b','c','d','e','f','g','h'];
  html += '<tr><th class="corner"></th>';
  files.forEach(f => html += `<th class="file-label">${f}</th>`);
  html += '</tr>';
  for (let i = 0; i < data.board.length; i++) {
    html += `<tr><th class="rank-label">${8 - i}</th>`;
    data.board[i].forEach(cell => html += `<td>${cell}</td>`);
    html += '</tr>';
  }
  html += '</table>';
  html += `<div class="info"><p>Turn: ${data.turn}</p><p>Status: ${data.status}</p></div>`;
  html += `<div class="captured"><div class="captured-section"><h3>Captured White</h3><p>${data.capturedWhite}</p></div><div class="captured-section"><h3>Captured Black</h3><p>${data.capturedBlack}</p></div></div>`;
  document.getElementById("board").innerHTML = html;
}

function fetchBoard() {
  fetch('/board')
    .then(r => r.json())
    .then(data => { renderBoard(data); document.getElementById('status').textContent = ""; })
    .catch(err => console.error(err));
}

document.getElementById('moveForm').addEventListener('submit', e => {
  e.preventDefault();
  const move = document.getElementById('moveInput').value;
  fetch('/move', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ move })
  })
  .then(r => r.text())
  .then(msg => { document.getElementById('status').textContent = msg; document.getElementById('moveInput').value = ''; })
  .catch(err => console.error(err));
});

setInterval(fetchBoard, 1000);
fetchBoard();
