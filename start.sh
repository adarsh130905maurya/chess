#!/usr/bin/env bash
# Make sure errors kill the script
set -e

# 1. Compile the C engine
gcc chess.c -o chess -std=c99

# 2. Clear any old state files and create empty ones
: > board.txt
: > input.txt

# 3. Launch the chess engine in the background
./chess &

# 4. Start the Node.js server in the foreground
node server.js
