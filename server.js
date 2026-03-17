const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('static'));

// ── Stockfish helper ───────────────────────────────────────
function analyzeWithStockfish(fen, multiPV = 3, moveTime = 1500) {
  return new Promise((resolve, reject) => {
    // Try to find stockfish binary (Railway / npm)
    let sfPath;
    try {
      sfPath = require.resolve('stockfish/src/stockfish.js');
    } catch {
      sfPath = 'stockfish'; // system binary fallback
    }

    const sf = spawn('node', [sfPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    const moves = [];
    let bestMove = null;
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        sf.kill();
        resolve({ bestMove, moves });
      }
    }, moveTime + 2000);

    sf.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        line = line.trim();

        // Parse multipv info lines
        if (line.startsWith('info') && line.includes('pv') && line.includes('score')) {
          const pvMatch = line.match(
            /multipv (\d+).*?score (cp|mate) (-?\d+).*? pv ([a-h][1-8][a-h][1-8][qrbn]?)/
          );
          if (pvMatch) {
            const idx = parseInt(pvMatch[1]) - 1;
            const scoreType = pvMatch[2];
            const scoreVal = parseInt(pvMatch[3]);
            const move = pvMatch[4];

            let scoreLabel;
            if (scoreType === 'mate') {
              scoreLabel = scoreVal > 0 ? `Mate in ${scoreVal}` : `Mated in ${Math.abs(scoreVal)}`;
            } else {
              const pawns = (scoreVal / 100).toFixed(2);
              scoreLabel = (scoreVal > 0 ? '+' : '') + pawns;
            }

            moves[idx] = { move, score: scoreLabel, scoreRaw: scoreVal };
          }
        }

        // bestmove line — we're done
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          bestMove = parts[1] !== '(none)' ? parts[1] : null;

          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            sf.kill();
            resolve({ bestMove, moves: moves.filter(Boolean) });
          }
        }
      });
    });

    sf.stderr.on('data', () => {}); // suppress stderr

    sf.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    // Send UCI commands
    sf.stdin.write('uci\n');
    sf.stdin.write(`setoption name MultiPV value ${multiPV}\n`);
    sf.stdin.write('isready\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go movetime ${moveTime}\n`);
  });
}

// ── Routes ─────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hustle Chess Helper Server running ✓' });
});

// Main analysis endpoint
// POST /analyze  { fen: "...", movetime: 1500 }
app.post('/analyze', async (req, res) => {
  const { fen, movetime = 1500 } = req.body;

  if (!fen) {
    return res.status(400).json({ error: 'FEN required' });
  }

  // Basic FEN validation
  const fenParts = fen.trim().split(' ');
  if (fenParts.length < 1) {
    return res.status(400).json({ error: 'Invalid FEN' });
  }

  try {
    console.log(`[analyze] FEN: ${fen.substring(0, 40)}...`);
    const result = await analyzeWithStockfish(fen, 3, Math.min(movetime, 3000));
    console.log(`[analyze] Best: ${result.bestMove}`);
    res.json(result);
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: 'Engine error: ' + err.message });
  }
});

// GET /analyze?fen=...  (simpler for bookmarklet)
app.get('/analyze', async (req, res) => {
  const { fen, movetime = 1500 } = req.query;

  if (!fen) {
    return res.status(400).json({ error: 'FEN required' });
  }

  try {
    const result = await analyzeWithStockfish(fen, 3, Math.min(parseInt(movetime), 3000));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Engine error: ' + err.message });
  }
});

// Serve bookmarklet script
app.get('/inject.js', (req, res) => {
  const serverUrl = req.protocol + '://' + req.get('host');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');

  // Inject bookmarklet with dynamic server URL
  const fs = require('fs');
 let script = fs.readFileSync(path.join(__dirname, 'static', 'bookmarklet.js'), 'utf8');
  script = script.replace('__SERVER_URL__', serverUrl);
  res.send(script);
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Hustle Chess Helper running on port ${PORT}`);
});
