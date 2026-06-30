FROM node:20-bullseye

# Install gcc for compiling the C chess engine
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY chess.c server.js start.sh ./
COPY public/ ./public/

# Compile the C chess engine at build time
RUN gcc chess.c -o chess -std=c99

# Create the games directory for per-session state files
RUN mkdir -p games

# Make start script executable
RUN chmod +x start.sh

# Expose the server port
EXPOSE 3000

# Run the startup script
CMD ["./start.sh"]
