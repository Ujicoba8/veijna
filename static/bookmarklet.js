(function () {
  const SERVER = 'https://hustle-chess-helper-production.up.railway.app';
  if (window.__hchLoaded) return;
  window.__hchLoaded = true;

  let currentFen = '';
  let playerColor = 'w';
  let isAnalyzing = false;
  let mode = 'normal';

  function loadChessJs(cb) {
    if (window.Chess) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    s.onload = cb; document.head.appendChild(s);
  }

  // --- UI Setup ---
  const style = document.createElement('style');
  style.textContent = `
    #hch-panel { position:fixed; top:20px; right:20px; width:260px; z-index:99999; background:#111; border:1px solid #c9a84c; border-radius:8px; color:#eee; font-family:sans-serif; padding:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
    .hch-row { display:flex; justify-content:space-between; padding:5px; margin:2px 0; background:#222; border-radius:4px; cursor:pointer; border:1px solid transparent; }
    .hch-row:hover { border-color: #c9a84c; }
    .hch-best { background: #2c1f00; border-color: #c9a84c; }
    .hch-status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; background:#444; }
    .dot-online { background:#4caf50; box-shadow:0 0 5px #4caf50; }
    .dot-thinking { background:#ff9800; animation: blink 0.8s infinite; }
    @keyframes blink { 0% {opacity:1} 50% {opacity:0.3} 100% {opacity:1} }
    .hch-sq-highlight { position:absolute; pointer-events:none; z-index:9999; border-radius:3px; width:100%; height:100%; top:0; left:0; }
    .hch-from { background:rgba(255,215,0,0.4); border:2px solid gold; }
    .hch-to { background:rgba(50,205,50,0.4); border:2px solid limegreen; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'hch-panel';
  panel.innerHTML = `
    <div style="font-weight:bold; color:#c9a84c; margin-bottom:10px; display:flex; justify-content:space-between;">
      <span>♟ CHESS HELPER</span>
      <span style="cursor:pointer" onclick="this.parentElement.parentElement.remove(); window.__hchLoaded=false;">✕</span>
    </div>
    <div style="font-size:11px; margin-bottom:10px;">
      <span class="hch-status-dot" id="hch-dot"></span><span id="hch-status">Ready</span>
    </div>
    <div id="hch-turn" style="text-align:center; font-weight:bold; margin-bottom:10px; font-size:13px;">Detecting...</div>
    <div id="hch-moves"></div>
    <div style="margin-top:10px; font-size:10px; color:#666; border-top:1px solid #333; pt:5px">
      Playing as: <span id="hch-color" style="color:#c9a84c">...</span>
    </div>
  `;
  document.body.appendChild(panel);

  function clearHighlights() {
    document.querySelectorAll('.hch-sq-highlight').forEach(el => el.remove());
  }

  function drawHighlight(uci) {
    clearHighlights();
    const from = uci.slice(0,2), to = uci.slice(2,4);
    [from, to].forEach((sq, i) => {
      const el = document.querySelector(`[data-square="${sq}"]`);
      if (el) {
        const h = document.createElement('div');
        h.className = `hch-sq-highlight ${i===0?'hch-from':'hch-to'}`;
        el.style.position = 'relative';
        el.appendChild(h);
      }
    });
  }

  function detectPosition() {
    const histEl = document.querySelector('[class*="history"]');
    if (!histEl || !window.Chess) return null;

    // Bersihkan teks history: hapus angka langkah (1., 2.) dan baris baru
    let text = histEl.innerText.replace(/\d+\./g, ' ').replace(/\n/g, ' ').trim();
    const tokens = text.split(/\s+/).filter(t => t.length >= 2 && !['Move','History:'].includes(t));

    const chess = new Chess();
    for (const t of tokens) {
      if (!chess.move(t, { sloppy: true })) break;
    }

    const turn = chess.turn();
    const isBlack = document.body.innerText.includes('You (Black)');
    playerColor = isBlack ? 'b' : 'w';

    document.getElementById('hch-color').textContent = playerColor === 'w' ? 'White' : 'Black';
    return { fen: chess.fen(), turn };
  }

  async function triggerAnalysis() {
    const pos = detectPosition();
    if (!pos) return;

    const { fen, turn } = pos;
    const turnEl = document.getElementById('hch-turn');
    const dot = document.getElementById('hch-dot');

    // Jika bukan giliran kita, berhenti
    if (turn !== playerColor) {
      turnEl.innerHTML = `<span style="color:#888">Opponent's turn...</span>`;
      dot.className = 'hch-status-dot';
      if (fen !== currentFen) { 
        clearHighlights(); 
        document.getElementById('hch-moves').innerHTML = '';
      }
      currentFen = fen;
      return;
    }

    if (fen === currentFen || isAnalyzing) return;
    currentFen = fen;
    isAnalyzing = true;

    turnEl.innerHTML = `<span style="color:#4caf50">Your Turn!</span>`;
    dot.className = 'hch-status-dot dot-thinking';
    document.getElementById('hch-status').textContent = 'Analyzing...';

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, movetime: 300 })
      });
      const data = await res.json();
      
      const moveList = document.getElementById('hch-moves');
      moveList.innerHTML = data.moves.map((m, i) => `
        <div class="hch-row ${i===0?'hch-best':''}" onclick="drawHighlight('${m.move}')">
          <span>${m.move}</span>
          <span style="color:${m.score.includes('-')?'#f44336':'#4caf50'}">${m.score}</span>
        </div>
      `).join('');

      if (data.moves.length > 0) drawHighlight(data.moves[0].move);
      document.getElementById('hch-status').textContent = 'Best move found';
      dot.className = 'hch-status-dot dot-online';
    } catch (e) {
      document.getElementById('hch-status').textContent = 'Server Error';
    } finally {
      isAnalyzing = false;
    }
  }

  loadChessJs(() => {
    setInterval(triggerAnalysis, 1000);
    console.log('[HCH] Aktif');
  });
})();
