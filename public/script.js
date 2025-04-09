// Function to render the chessboard and additional game information.
function renderBoard(data) {
  let html = '<table id="chessboard">';
  
  // Create header row for file labels (a-h)
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  html += '<tr><th class="corner"></th>';
  files.forEach(file => {
    html += `<th class="file-label">${file}</th>`;
  });
  html += '</tr>';
  
  // Render each row with rank labels.
  for (let i = 0; i < data.board.length; i++) {
    let rowLabel = 8 - i;
    html += `<tr><th class="rank-label">${rowLabel}</th>`;
    data.board[i].forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  }
  html += '</table>';
  
  // Append game status.
  html += `<div class="info">
             <p>Turn: ${data.turn}</p>
             <p>Status: ${data.status}</p>
           </div>`;
  
  // Append captured pieces information.
  html += `<div class="captured">
             <div class="captured-section">
               <h3>Captured White</h3>
               <p>${data.capturedWhite}</p>
             </div>
             <div class="captured-section">
               <h3>Captured Black</h3>
               <p>${data.capturedBlack}</p>
             </div>
           </div>`;
  
  // Update the element with id "board".
  document.getElementById("board").innerHTML = html;
}

// Function to fetch the board state from the server.
function fetchBoard() {
  fetch('/board')
    .then(response => response.json())
    .then(data => {
      renderBoard(data);
      document.getElementById('status').textContent = "";
    })
    .catch(err => console.error(err));
}

// Event listener for submitting moves.
document.getElementById('moveForm').addEventListener('submit', function(e) {
  e.preventDefault();  // Prevent form submission from reloading the page.
  const move = document.getElementById('moveInput').value;
  // Send the move via POST request in JSON format.
  fetch('/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ move })
  })
  .then(response => response.text())
  .then(data => {
    document.getElementById('status').textContent = data;
    document.getElementById('moveInput').value = "";
  })
  .catch(err => console.error(err));
});

// Poll the server every second to update the board.
setInterval(fetchBoard, 1000);
fetchBoard();  // Initial call on page load.
