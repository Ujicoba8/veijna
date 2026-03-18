FROM node:20-slim

RUN apt-get update && \
    apt-get install -y wget --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Download Stockfish 18 - sse41-popcnt untuk compatibility maksimal
RUN wget -q "https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64-sse41-popcnt.tar" -O sf.tar && \
    tar xf sf.tar && \
    mv stockfish/stockfish-ubuntu-x86-64-sse41-popcnt /usr/local/bin/stockfish && \
    chmod +x /usr/local/bin/stockfish && \
    rm -rf sf.tar stockfish

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
