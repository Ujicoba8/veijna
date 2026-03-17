const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

function analyzeWithStockfish(fen, multiPV = 3, moveTime = 1500) {
  return new Promise((resolve, reject) => {
    let sf;
    try {
      const stockfish = require('stockfish');
      // v10 bisa export function atau object
      sf = typeof stockfish === 'function' ? stockfish() : stockfish;
      if (!sf) throw new Error('Cannot init stockfish');
    } catch(e) {
      return reject(new Error('Stockfish init failed: ' + e.message));
    }

    const moves = [];
    let bestMove = null;
    let resolved = false;

    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve({ bestMove, moves: moves.filter(Boolean) });
      }
    };

    const timeout = setTimeout(done, moveTime + 3000);

    // stockfish v10 pakai addMessageListener
    const handler = (line) => {
      if (typeof line !== 'string') return;

      if (line.startsWith('info') && line.includes('multipv') && line.includes('score')) {
        const m = line.match(/multipv (\d+).*?score (cp|mate) (-?\d+).*? pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (m) {
          const idx = parseInt(m[1]) - 1;
          const val = parseInt(m[3]);
          const score = m[2] === 'mate'
            ? (val > 0 ? `Mate in ${val}` : `Mated in ${Math.abs(val)}`)
            : (val > 0 ? '+' : '') + (val / 100).toFixed(2);
          moves[idx] = { move: m[4], score };
        }
      }

      if (line.startsWith('bestmove')) {
        const bm = line.split(' ')[1];
        bestMove = bm && bm !== '(none)' ? bm : null;
        clearTimeout(timeout);
        done();
      }
    };

    // Try different listener APIs
    if (typeof sf.addMessageListener === 'function') {
      sf.addMessageListener(handler);
    } else if (typeof sf.onmessage !== 'undefined') {
      sf.onmessage = handler;
    } else {
      return reject(new Error('No message listener API found'));
    }

    // Try different postMessage APIs
    const send = (msg) => {
      if (typeof sf.postMessage === 'function') sf.postMessage(msg);
      else if (typeof sf.send === 'function') sf.send(msg);
    };

    send('uci');
    send(`setoption name MultiPV value ${multiPV}`);
    send('isready');
    send(`position fen ${fen}`);
    send(`go movetime ${moveTime}`);
  });
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'static', 'index.html')));

app.post('/analyze', async (req, res) => {
  const { fen, movetime = 1500 } = req.body;
  if (!fen) return res.status(400).json({ error: 'FEN required' });
  try {
    const result = await analyzeWithStockfish(fen, 3, Math.min(movetime, 3000));
    console.log(`[analyze] best: ${result.bestMove}`);
    res.json(result);
  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/inject.js', (req, res) => {
  const serverUrl = req.protocol + '://' + req.get('host');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  let script = fs.readFileSync(path.join(__dirname, 'static', 'bookmarklet.js'), 'utf8');
  script = script.replace('https://YOUR-APP.railway.app', serverUrl);
  res.send(script);
});

app.listen(PORT, () => console.log(`✓ Hustle Chess Helper running on port ${PORT}`));
