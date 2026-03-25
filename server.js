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

function runStockfish(fen, multiPV, moveTime) {
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
            const score = m[2] === 'mate' ? `M${val}` : (val/100).toFixed(2);
            moves[idx] = { move: m[4], score };
          }
        }
        if (line.startsWith('bestmove')) {
          bestMove = line.split(' ')[1];
          clearTimeout(timeout);
          done();
        }
      });
    });

    proc.stdin.write(`uci\nsetoption name MultiPV value ${multiPV}\nisready\nposition fen ${fen}\ngo movetime ${moveTime}\n`);
  });
}

app.post('/analyze', async (req, res) => {
  const { fen, movetime = 300 } = req.body;
  try {
    // FIX: Menaikkan limit waktu agar engine tidak prematur
    const mt = Math.min(parseInt(movetime) || 300, 1000); 
    const result = await runStockfish(fen, 3, mt);
    console.log(`[Analyzed] Best: ${result.bestMove}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✓ Server Aktif di Port ${PORT}`));
