FROM node:20-slim

RUN apt-get update && \
    apt-get install -y wget tar --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Download Stockfish 18 binary
RUN wget -q "https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64-avx2.tar.gz" -O sf.tar.gz && \
    tar xzf sf.tar.gz && \
    find . -name "stockfish*" -type f -executable | head -1 | xargs -I{} mv {} /usr/local/bin/stockfish && \
    chmod +x /usr/local/bin/stockfish && \
    rm -rf sf.tar.gz stockfish*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
