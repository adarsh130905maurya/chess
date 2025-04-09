// Import Express to create the web server.
const express = require('express');
// Import the file system module for file operations.
const fs = require('fs');

// Create an Express application.
const app = express();
// Use the port provided by Glitch (process.env.PORT) or default to 3000.
const port = process.env.PORT || 3000;

// Middleware to automatically parse incoming JSON data.
app.use(express.json());
// Middleware to serve static files from the "public" folder.
app.use(express.static('public'));

// GET /board endpoint: Returns the game state from board.txt as JSON.
app.get('/board', (req, res) => {
  fs.readFile('board.txt', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send("Error reading board.");
    } else {
      try {
        // Parse and send the JSON game state.
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (e) {
        res.status(500).send("Error parsing board data.");
      }
    }
  });
});

// POST /move endpoint: Accepts a move from the client and writes it to input.txt.
app.post('/move', (req, res) => {
  const move = req.body.move;
  if (!move) {
    return res.status(400).send("Move not provided.");
  }
  fs.writeFile('input.txt', move, (err) => {
    if (err) {
      res.status(500).send("Error writing move.");
    } else {
      res.send("Move received.");
    }
  });
});

// Start the server and listen on the specified port.
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
