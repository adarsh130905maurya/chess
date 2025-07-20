const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/board', (req, res) => {
  fs.readFile('board.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send("Error reading board.");
    try {
      res.json(JSON.parse(data));
    } catch {
      res.status(500).send("Error parsing board data.");
    }
  });
});

app.post('/move', (req, res) => {
  const move = req.body.move;
  if (!move) return res.status(400).send("Move not provided.");
  fs.writeFile('input.txt', move, err => {
    if (err) return res.status(500).send("Error writing move.");
    res.send("Move received.");
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
