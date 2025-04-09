#!/bin/bash
# Compile the C code using GCC with C99 standard.
gcc chess.c -o chess.exe -std=c99

# Run the chess engine in the background.
./chess.exe &

# Start the Node.js server.
node server.js
