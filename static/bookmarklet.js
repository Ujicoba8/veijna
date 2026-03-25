(function () {
  const SERVER = 'https://hustle-chess-helper-production.up.railway.app';
  if (window.__hchLoaded) return;
  window.__hchLoaded = true;

  let currentFen = '';
  let playerColor = 'w';
  let isAnalyzing = false;

  function loadChessJs(cb) {
    if (window.Chess) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    s.onload = cb; document.head.appendChild(s);
  }

  // UI Setup
  const style = document.createElement('style');
  style.textContent = `
    #hch-panel { position:fixed; top:20px; right:20px; width:250px; z-index:99999; background:#111; border:1px solid #c9a84c; border-radius:8px; color:#eee; font-family:sans-serif; padding:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
    .hch-row { display:flex; justify-content:space-between; padding:6px; margin:3px 0; background:#222; border-radius:4px; cursor:pointer; }
    .hch-best { border: 1px solid #c9a84c; background: #1a1400; }
    .hch-sq-highlight { position:absolute; pointer-events:none; z-index:9999; border-radius:3px; width:100%; height:100%; top:0; left:0; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'hch-panel';
  panel.innerHTML = `
    <div style="font-weight:bold; color:#c9a84c; margin-bottom:8px;">♟ CHESS HELPER</div>
    <div id="hch-status" style="font-size:10px; color:#777; margin-bottom:10px;">Ready</div>
    <div id="hch-turn" style="text-align:center; font-weight:bold; margin-bottom:10px; font-size:14px;">...</div>
    <div id="hch-moves"></div>
    <div style="margin-top:10px; font-size:10px; color:#444; border-top:1px solid #333; pt:5px">
      Playing as: <span id="hch-color">Detecting...</span>
    </div>
  `;
  document.body.appendChild(panel);

  function drawHighlight(uci) {
    document.querySelectorAll('.hch-sq-highlight').forEach(el => el.remove());
    const from = uci.slice(0, 2), to = uci.slice(2, 4);
    [from, to].forEach((sq, i) => {
      const el = document.querySelector(`[data-square="${sq}"]`);
      if (el) {
        const h = document.createElement('div');
        h.className = 'hch-sq-highlight';
        h.style.cssText = `background:${i==0?'rgba(255,215,0,0.4)':'rgba(50,205,50,0.4)'}; border:2px solid ${i==0?'gold':'lime'}`;
        el.style.position = 'relative';
        el.appendChild(h);
      }
    });
  }

  function detectPosition() {
    const isBlack = document.body.innerText.includes('You (Black)');
    playerColor = isBlack ? 'b' : 'w';
    document.getElementById('hch-color').textContent = playerColor === 'w' ? 'White' : 'Black';

    const histEl = document.querySelector('[class*="history"]');
    if (!histEl || !window.Chess) return null;

    let text = histEl.textContent || '';
    
    // --- FIX LOGIKA PEMISAHAN (e4e6 -> e4 e6) ---
    let cleanText = text.replace(/Move History:/gi, '')
                        .replace(/([a-zKQRBN][a-h1-8x+#=]*[1-8])([a-zKQRBN])/g, '$1 $2') // Pisah e4e6
                        .replace(/(\d+\.)([a-zKQRBN])/gi, '$1 $2') // Pisah 1.e4
                        .replace(/\d+\./g, ' ') // Hapus angka langkah
                        .replace(/\s+/g, ' ').trim();

    const tokens = cleanText.split(' ').filter(t => t.length >= 2);
    const chess = new Chess();
    for (const move of tokens) {
      if (!chess.move(move, { sloppy: true })) break;
    }

    return { fen: chess.fen(), turn: chess.turn() };
  }

  async function triggerAnalysis() {
    if (isAnalyzing) return;
    const pos = detectPosition();
    if (!pos) return;

    const { fen, turn } = pos;
    const turnEl = document.getElementById('hch-turn');

    if (turn !== playerColor) {
      turnEl.innerHTML = `<span style="color:#555">Opponent's turn...</span>`;
      if (fen !== currentFen) { document.getElementById('hch-moves').innerHTML = ''; }
      currentFen = fen;
      return;
    }

    if (fen === currentFen) return;
    currentFen = fen;
    isAnalyzing = true;
    turnEl.innerHTML = `<span style="color:#4caf50">YOUR TURN!</span>`;

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, movetime: 300 })
      });
      const data = await res.json();
      
      const el = document.getElementById('hch-moves');
      el.innerHTML = data.moves.map((m, i) => `
        <div class="hch-row ${i===0?'hch-best':''}" onclick="drawHighlight('${m.move}')">
          <span style="color:gold; font-weight:bold">${m.move}</span>
          <span style="color:#4caf50">${m.score}</span>
        </div>
      `).join('');

      if (data.moves[0]) drawHighlight(data.moves[0].move);
      document.getElementById('hch-status').textContent = 'Analysis complete ✓';
    } catch (e) {
      document.getElementById('hch-status').textContent = 'Server Error';
    } finally {
      isAnalyzing = false;
    }
  }

  loadChessJs(() => setInterval(triggerAnalysis, 1000));
})();
