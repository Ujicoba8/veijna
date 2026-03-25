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

function getStockfishCmd() {
  try {
    execSync('which stockfish', { stdio: 'ignore' });
    return { bin: 'stockfish', args: [] };
  } catch {}
  try {
    const sfPath = require.resolve('stockfish/src/stockfish.js');
    return { bin: process.execPath, args: [sfPath] };
  } catch {}
  throw new Error('Stockfish not found');
}

function runStockfish(fen, multiPV, moveTime, mateSearch) {
  return new Promise((resolve, reject) => {
    let sfCmd;
    try { sfCmd = getStockfishCmd(); } catch(e) { return reject(e); }

    const proc = spawn(sfCmd.bin, sfCmd.args);
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

    // Tambahkan buffer waktu agar engine tidak mati sebelum mengirim bestmove
    const timeout = setTimeout(done, moveTime + 1000); 

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(line => {
        line = line.trim();
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

    proc.stdin.write(`uci\nsetoption name MultiPV value ${multiPV}\nisready\nposition fen ${fen}\n`);
    proc.stdin.write(`go movetime ${moveTime}\n`);
  });
}

app.post('/analyze', async (req, res) => {
  const { fen, movetime = 300, mode = 'normal' } = req.body;
  if (!fen) return res.status(400).json({ error: 'FEN required' });
  
  try {
    // Perbaikan: Izinkan movetime hingga 1000ms agar engine punya waktu berpikir
    const mt = Math.min(parseInt(movetime), 1000); 
    const isMate = mode === 'mate';
    const result = await runStockfish(fen, isMate ? 1 : 3, mt, isMate);

    console.log(`[${mode}] Analisa selesai untuk: ${result.bestMove}`);
    res.json(result);
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/inject.js', (req, res) => {
  const serverUrl = 'https://' + req.get('host');
  res.setHeader('Content-Type', 'application/javascript');
  let script = fs.readFileSync(path.join(__dirname, 'static', 'bookmarklet.js'), 'utf8');
  script = script.replace('https://hustle-chess-helper-production.up.railway.app', serverUrl);
  res.send(script);
});

app.listen(PORT, () => console.log(`✓ Server Aktif di Port ${PORT}`));
