const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

function runStockfish(commands, moveTime = 200) {
  return new Promise((resolve, reject) => {
let sfBin = 'stockfish';
try { require.resolve('stockfish/src/stockfish.js'); sfBin = process.execPath; } catch {}
const sfArgs = sfBin === process.execPath ? [require.resolve('stockfish/src/stockfish.js')] : [];
const proc = spawn(sfBin, sfArgs, { stdio: ['pipe', 'pipe', 'pipe'] });    const moves = [];
    let bestMove = null;
    let resolved = false;
    let buffer = '';

    const done = () => {
      if (!resolved) { resolved = true; proc.kill(); resolve({ bestMove, moves: moves.filter(Boolean) }); }
    };
    const timeout = setTimeout(done, moveTime + 200);

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        if (line.startsWith('info') && line.includes('multipv') && line.includes('score')) {
          const m = line.match(/multipv (\d+).*?score (cp|mate) (-?\d+).*? pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (m) {
            const idx = parseInt(m[1]) - 1;
            const val = parseInt(m[3]);
            const score = m[2] === 'mate'
              ? (val > 0 ? `Mate in ${val}` : `Mated in ${Math.abs(val)}`)
              : (val > 0 ? '+' : '') + (val / 100).toFixed(2);
            moves[idx] = { move: m[4], score, raw: val, type: m[2] };
          }
        }
        if (line.startsWith('bestmove')) {
          const bm = line.split(' ')[1];
          bestMove = bm && bm !== '(none)' ? bm : null;
          clearout(out);
          done();
        }
      });
    });

    proc.stderr.on('data', () => {});
    proc.on('error', (err) => { if (!resolved) { resolved = true; clearout(out); reject(err); } });

    commands.forEach(cmd => proc.stdin.write(cmd + '\n'));
  });
}

function analyzeNormal(fen, multiPV = 3, move = 200) {
  return runStockfish([
    'uci',
    `setoption name MultiPV value ${multiPV}`,
    'setoption name Threads value 2',
    'setoption name Hash value 128',
    'isready',
    `position fen ${fen}`,
    `go move ${move} depth 25`
  ], move);
}

function analyzeMate(fen, move = 200) {
  // Cari mate dalam 1-10 langkah
  return runStockfish([
    'uci',
    'setoption name MultiPV value 1',
    'setoption name Threads value 2',
    'setoption name Hash value 128',
    'isready',
    `position fen ${fen}`,
    `go move ${move} depth 30 mate 10`
  ], move);
}

app.get('/health', (req, res) => res.json({ status: 'ok', engine: 'stockfish-binary' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'static', 'index.html')));

app.post('/analyze', async (req, res) => {
  const { fen, move = 2000, mode = 'normal' } = req.body;
  if (!fen) return res.status(400).json({ error: 'FEN required' });
  try {
    let result;
    if (mode === 'mate') {
      // Coba cari mate dulu, kalau tidak ada fallback ke normal
      result = await analyzeMate(fen, Math.min(move, 200));
      if (!result.bestMove || !result.moves.some(m => m.type === 'mate')) {
        const normal = await analyzeNormal(fen, 3, Math.min(move, 200));
        result = normal;
      }
    } else {
      result = await analyzeNormal(fen, 3, Math.min(movetime, 200));
    }
    console.log(`[${mode}] best: ${result.bestMove}`);
    res.json(result);
  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/inject.js', (req, res) => {
  const serverUrl = 'https://' + req.get('host');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  let script = fs.readFileSync(path.join(__dirname, 'static', 'bookmarklet.js'), 'utf8');
  script = script.replace('https://YOUR-APP.railway.app', serverUrl);
  res.send(script);
});

app.listen(PORT, () => console.log(`✓ Hustle Chess Helper running on port ${PORT}`));
