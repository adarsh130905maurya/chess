#!/usr/bin/env bash

# Clear any old state files
: > board.txt
: > input.txt

# Launch the chess engine in the background
./chess &

# Start the Node.js server in the foreground
node server.js
