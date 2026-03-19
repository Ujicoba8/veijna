FROM node:20-slim

RUN apt-get update && \
    apt-get install -y stockfish --no-install-recommends && \
    ln -sf /usr/games/stockfish /usr/local/bin/stockfish && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
