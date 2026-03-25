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

  // UI Panel
  const style = document.createElement('style');
  style.textContent = `#hch-panel{position:fixed;top:10px;right:10px;width:240px;z-index:99999;background:#111;border:1px solid #c9a84c;color:#fff;padding:10px;font-family:sans-serif;border-radius:8px;} .hch-mv{color:gold;font-weight:bold} .hch-row{display:flex;justify-content:space-between;padding:4px;border-bottom:1px solid #333}`;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'hch-panel';
  panel.innerHTML = `<div style="font-size:12px;font-weight:bold;color:gold">♟ CHESS HELPER</div><div id="hch-status" style="font-size:10px;margin:5px 0">Ready</div><div id="hch-turn" style="font-size:14px;text-align:center;margin:10px 0;font-weight:bold">...</div><div id="hch-moves"></div>`;
  document.body.appendChild(panel);

  function highlightMove(uci) {
    document.querySelectorAll('.hch-sq-highlight').forEach(el => el.remove());
    const from = uci.slice(0, 2), to = uci.slice(2, 4);
    [from, to].forEach((sq, i) => {
      const el = document.querySelector(`[data-square="${sq}"]`);
      if (el) {
        const h = document.createElement('div');
        h.className = 'hch-sq-highlight';
        h.style.cssText = `position:absolute;inset:0;background:${i==0?'rgba(255,215,0,0.4)':'rgba(50,205,50,0.4)'};border:2px solid ${i==0?'gold':'lime'}`;
        el.style.position = 'relative'; el.appendChild(h);
      }
    });
  }

  function detectPosition() {
    const histEl = document.querySelector('[class*="history"]');
    if (!histEl || !window.Chess) return null;

    playerColor = document.body.innerText.includes('You (Black)') ? 'b' : 'w';
    let text = histEl.textContent || '';
    
    // FIX: Memecah teks rapat e4e6 dan menghapus angka langkah
    let cleanText = text.replace(/Move History:/gi, '')
                        .replace(/([a-zKQRBN][a-h1-8x+#=]*[1-8])([a-zKQRBN])/g, '$1 $2') // e4e6 -> e4 e6
                        .replace(/(\d+\.)([a-zKQRBN])/gi, '$1 $2') // 1.e4 -> 1. e4
                        .replace(/\d+\./g, ' ') 
                        .replace(/\s+/g, ' ').trim();

    const tokens = cleanText.split(' ').filter(t => t.length >= 2);
    const chess = new Chess();
    for (const m of tokens) { if (!chess.move(m, { sloppy: true })) break; }
    
    return { fen: chess.fen(), turn: chess.turn() };
  }

  async function triggerAnalysis() {
    if (isAnalyzing) return;
    const pos = detectPosition();
    if (!pos) return;

    if (pos.turn !== playerColor) {
      document.getElementById('hch-turn').innerText = "Opponent's Turn";
      document.getElementById('hch-status').innerText = "Waiting...";
      if(pos.fen !== currentFen) { document.getElementById('hch-moves').innerHTML = ''; currentFen = pos.fen; }
      return;
    }

    if (pos.fen === currentFen) return;
    currentFen = pos.fen;
    isAnalyzing = true;
    document.getElementById('hch-turn').innerText = "YOUR TURN!";
    document.getElementById('hch-status').innerText = "Analyzing...";

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: pos.fen, movetime: 400 })
      });
      const data = await res.json();
      const el = document.getElementById('hch-moves');
      el.innerHTML = data.moves.map(m => `<div class="hch-row"><span class="hch-mv">${m.move}</span><span>${m.score}</span></div>`).join('');
      if (data.moves[0]) highlightMove(data.moves[0].move);
      document.getElementById('hch-status').innerText = "Analyzed ✓";
    } catch (e) { console.error(e); } finally { isAnalyzing = false; }
  }

  loadChessJs(() => setInterval(triggerAnalysis, 1000));
})();
