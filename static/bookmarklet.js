// Hustle Chess Helper - Updated Bookmarklet
(function () {
  const SERVER = 'https://hustle-chess-helper-production.up.railway.app';

  if (window.__hchLoaded) { console.log('[HCH] Already loaded'); return; }
  window.__hchLoaded = true;

  let currentFen = '';
  let playerColor = document.body.innerText.includes('You (Black)') ? 'b' : 'w';
  let isAnalyzing = false;
  let mode = 'normal';

  function loadChessJs(cb) {
    if (window.Chess) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    s.onload = cb; document.head.appendChild(s);
  }

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Rajdhani:wght@600;700&display=swap');
    #hch-panel { position:fixed;top:20px;right:20px;width:280px;z-index:999999;background:#0d0d0d;border:1px solid #c9a84c;border-radius:10px;box-shadow:0 0 40px rgba(201,168,76,0.2),0 12px 40px rgba(0,0,0,0.7);font-family:'Rajdhani',sans-serif;overflow:hidden; }
    #hch-panel * { box-sizing:border-box;margin:0;padding:0; }
    .hch-head { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:grab;background:linear-gradient(135deg,#1a1400,#2c1f00);border-bottom:1px solid #c9a84c33; }
    .hch-title { color:#c9a84c;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase; }
    .hch-btns { display:flex;gap:5px; }
    .hch-btn { background:transparent;border:1px solid #c9a84c33;color:#c9a84c;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center; }
    .hch-body { padding:12px 14px; }
    .hch-status { display:flex;align-items:center;gap:8px;font-family:'Space Mono',monospace;font-size:10px;color:#666;margin-bottom:8px; }
    .hch-dot { width:7px;height:7px;border-radius:50%;background:#333; }
    .hch-dot.on { background:#4caf50;box-shadow:0 0 6px #4caf5077;animation:hch-blink 1.4s infinite; }
    .hch-dot.thinking { background:#ff9800;box-shadow:0 0 6px #ff980077;animation:hch-blink 0.7s infinite; }
    .hch-dot.mate { background:#e040fb;box-shadow:0 0 6px #e040fb77;animation:hch-blink 0.5s infinite; }
    @keyframes hch-blink { 0%,100%{opacity:1}50%{opacity:0.3} }
    .hch-mode-bar { display:flex;gap:6px;margin-bottom:10px; }
    .hch-mode-btn { flex:1;padding:5px;border-radius:6px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;border:1px solid #333;background:#111;color:#666; }
    .hch-mode-btn.active { background:#1a1400;border-color:#c9a84c;color:#c9a84c; }
    .hch-moves { display:flex;flex-direction:column;gap:5px;margin-bottom:10px; }
    .hch-empty { font-family:'Space Mono',monospace;font-size:11px;color:#444;text-align:center;padding:10px 0; }
    .hch-row { display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111;border:1px solid #222;border-radius:6px;cursor:pointer; }
    .hch-row.top { border-color:#c9a84c55;background:linear-gradient(135deg,#1a1400,#201800); }
    .hch-mv { font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#ddd;flex:1; }
    .hch-sc { font-family:'Space Mono',monospace;font-size:11px;font-weight:700;min-width:52px;text-align:right; }
    .hch-sc.win{color:#4caf50} .hch-sc.mat{color:#e040fb}
    .hch-turn { font-family:'Space Mono',monospace;font-size:11px;text-align:center;margin-bottom:8px; }
    .hch-footer { border-top:1px solid #1a1a1a;padding-top:8px;display:flex;align-items:center;justify-content:space-between; }
    .hch-color-lbl { font-family:'Space Mono',monospace;font-size:10px;color:#555; }
    .hch-color-lbl strong { color:#c9a84c; }
    .hch-sq-highlight { position:absolute; pointer-events:none; z-index:9999; border-radius:3px; }
    .hch-sq-from { background:rgba(255,215,0,0.4); border:2px solid gold; }
    .hch-sq-to { background:rgba(50,205,50,0.4); border:2px solid limegreen; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'hch-panel';
  panel.innerHTML = `
    <div class="hch-head" id="hch-head">
      <span class="hch-title">♟ Chess Helper</span>
      <div class="hch-btns"><button class="hch-btn" id="hch-min">−</button><button class="hch-btn" id="hch-close">✕</button></div>
    </div>
    <div class="hch-body" id="hch-body">
      <div class="hch-status"><span class="hch-dot" id="hch-dot"></span><span id="hch-status-txt">Ready</span></div>
      <div class="hch-mode-bar">
        <button class="hch-mode-btn active" id="btn-normal">⚡ Best Move</button>
        <button class="hch-mode-btn" id="btn-mate">☠ Hunt Mate</button>
      </div>
      <div class="hch-turn" id="hch-turn">Waiting...</div>
      <div class="hch-moves" id="hch-moves"><div class="hch-empty">No moves analyzed</div></div>
      <div class="hch-footer">
        <div class="hch-color-lbl">Playing as: <strong id="hch-color-lbl">Detecting...</strong></div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  // --- UI Logic ---
  document.getElementById('hch-min').onclick = () => { 
    const b = document.getElementById('hch-body');
    b.style.display = b.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('hch-close').onclick = () => { clearHighlights(); panel.remove(); window.__hchLoaded = false; };
  document.getElementById('btn-normal').onclick = () => { mode='normal'; updateModeUI(); };
  document.getElementById('btn-mate').onclick = () => { mode='mate'; updateModeUI(); };

  function updateModeUI() {
    document.getElementById('btn-normal').classList.toggle('active', mode==='normal');
    document.getElementById('btn-mate').classList.toggle('active', mode==='mate');
    currentFen = ''; // Force refresh
  }

  function setStatus(msg, state='on') {
    document.getElementById('hch-status-txt').textContent = msg;
    document.getElementById('hch-dot').className = 'hch-dot ' + state;
  }

  function clearHighlights() {
    document.querySelectorAll('.hch-sq-highlight').forEach(el => el.remove());
  }

  function highlightMove(uci) {
    clearHighlights();
    const from = uci.slice(0, 2), to = uci.slice(2, 4);
    [from, to].forEach((sq, i) => {
      const el = document.querySelector(`[data-square="${sq}"]`);
      if (el) {
        const h = document.createElement('div');
        h.className = `hch-sq-highlight ${i===0?'hch-sq-from':'hch-sq-to'}`;
        h.style.cssText = "width:100%;height:100%;top:0;left:0;";
        el.style.position = 'relative';
        el.appendChild(h);
      }
    });
  }

  // --- Chess Logic ---
  function detectPosition() {
    const histEl = document.querySelector('[class*="history"]');
    if (!histEl || !window.Chess) return null;

    // Bersihkan teks history: hapus baris baru dan nomor langkah (1., 2., dst)
    let text = (histEl.textContent || '').replace(/\n/g, ' ').replace(/\d+\./g, ' ').trim();
    const tokens = text.split(/\s+/).filter(t => t.length >= 2 && !['Move','History:'].includes(t));
    
    const chess = new Chess();
    for (const t of tokens) {
      if (!chess.move(t, { sloppy: true })) break;
    }

    const turn = chess.turn();
    const isBlack = document.body.innerText.includes('You (Black)');
    playerColor = isBlack ? 'b' : 'w';
    document.getElementById('hch-color-lbl').textContent = playerColor === 'w' ? 'White ♔' : 'Black ♚';

    return { fen: chess.fen(), turn };
  }

  async function triggerAnalysis() {
    const pos = detectPosition();
    if (!pos) return;

    const { fen, turn } = pos;
    const turnEl = document.getElementById('hch-turn');

    if (turn !== playerColor) {
      turnEl.innerHTML = `<span style="color:#666">Opponent's turn...</span>`;
      if (fen !== currentFen) { 
        clearHighlights(); 
        document.getElementById('hch-moves').innerHTML = '<div class="hch-empty">Waiting for opponent...</div>';
      }
      currentFen = fen;
      return;
    }

    if (fen === currentFen || isAnalyzing) return;
    currentFen = fen;
    isAnalyzing = true;
    turnEl.innerHTML = `<strong style="color:#c9a84c">Your turn!</strong>`;
    setStatus('Analyzing...', 'thinking');

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, movetime: mode==='mate'?600:300, mode })
      });
      const data = await res.json();
      
      const moveList = document.getElementById('hch-moves');
      if (data.moves && data.moves.length > 0) {
        moveList.innerHTML = data.moves.map((m, i) => `
          <div class="hch-row ${i===0?'top':''}" onclick="this.parentElement.querySelectorAll('.hch-row').forEach(r=>r.style.borderColor='#222');this.style.borderColor='gold';">
            <span class="hch-mv">${m.move}</span>
            <span class="hch-sc ${m.score.includes('Mate')?'mat':'win'}">${m.score}</span>
          </div>
        `).join('');
        highlightMove(data.moves[0].move);
        setStatus(data.moves[0].score.includes('Mate') ? '☠ MATE FOUND' : 'Best move found', 'on');
      }
    } catch (e) {
      setStatus('Server Error', 'idle');
    } finally {
      isAnalyzing = false;
    }
  }

  loadChessJs(() => {
    setInterval(triggerAnalysis, 1000);
    console.log('[HCH] Running');
  });
})();
