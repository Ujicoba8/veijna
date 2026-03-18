const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Detect stockfish binary atau npm
function getStockfishCmd() {
  try {
    execSync('which stockfish', { stdio: 'ignore' });
    return { bin: 'stockfish', args: [] };
  } catch {}
  try {
    const sfPath = require.resolve('stockfish/src/stockfish.js');
    return { bin: process.execPath, args: [sfPath] };
  } catch {}
  try {
    const sfPath = require.resolve('stockfish');
    return { bin: process.execPath, args: [sfPath] };
  } catch {}
  throw new Error('Stockfish not found');
}

function runStockfish(fen, multiPV, moveTime, mateSearch) {
  return new Promise((resolve, reject) => {
    let sfCmd;
    try { sfCmd = getStockfishCmd(); }
    catch(e) { return reject(e); }

    const proc = spawn(sfCmd.bin, sfCmd.args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const moves = [];
    let bestMove = null;
    let resolved = false;
    let buffer = '';

    const done = () => {
      if (!resolved) {
        resolved = true;
        try { proc.kill(); } catch {}
        resolve({ bestMove, moves: moves.filter(Boolean) });
      }
    };

    const timeout = setTimeout(done, moveTime + 400);

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
            moves[idx] = { move: m[4], score };
          }
        }
        if (line.startsWith('bestmove')) {
          const bm = line.split(' ')[1];
          bestMove = bm && bm !== '(none)' ? bm : null;
          clearTimeout(timeout);
          done();
        }
      });
    });

    proc.stderr.on('data', () => {});
    proc.on('error', (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); reject(err); }
    });

    proc.stdin.write('uci\n');
    proc.stdin.write(`setoption name MultiPV value ${multiPV}\n`);
    proc.stdin.write('setoption name Threads value 2\n');
    proc.stdin.write('setoption name Hash value 128\n');
    proc.stdin.write('setoption name Contempt value 50\n');
    proc.stdin.write('isready\n');
    proc.stdin.write(`position fen ${fen}\n`);
    if (mateSearch) {
      proc.stdin.write(`go movetime ${moveTime} depth 30 mate 10\n`);
    } else {
      proc.stdin.write(`go movetime ${moveTime} depth 25\n`);
    }
  });
}

app.get('/health', (req, res) => {
  let engine = 'stockfish-npm';
  try { execSync('which stockfish', { stdio: 'ignore' }); engine = 'stockfish-binary'; } catch {}
  res.json({ status: 'ok', engine });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'static', 'index.html')));

app.post('/analyze', async (req, res) => {
  const { fen, movetime = 300, mode = 'normal' } = req.body;
  if (!fen) return res.status(400).json({ error: 'FEN required' });
  try {
    const mt = Math.min(parseInt(movetime) || 150, 150);
    const isMate = mode === 'mate';
    const result = await runStockfish(fen, isMate ? 1 : 3, mt, isMate);

    if (isMate && !result.moves.some(m => m.score.includes('Mate'))) {
      const fallback = await runStockfish(fen, 3, mt, false);
      return res.json(fallback);
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
