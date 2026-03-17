// Hustle Chess Helper - Bookmarklet Inject Script
(function () {
  const SERVER = 'https://hustle-chess-helper-production.up.railway.app';

  if (window.__hchLoaded) { console.log('[HCH] Already loaded'); return; }
  window.__hchLoaded = true;

  let currentFen = '';
  let playerColor = 'w';
  let analysisTimer = null;
  let isAnalyzing = false;

  // ── CSS ────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Rajdhani:wght@600;700&display=swap');
    #hch-panel {
      position: fixed; top: 20px; right: 20px;
      width: 270px; z-index: 999999;
      background: #0d0d0d;
      border: 1px solid #c9a84c;
      border-radius: 10px;
      box-shadow: 0 0 40px rgba(201,168,76,0.2), 0 12px 40px rgba(0,0,0,0.7);
      font-family: 'Rajdhani', sans-serif;
      overflow: hidden;
    }
    #hch-panel * { box-sizing: border-box; margin: 0; padding: 0; }
    .hch-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; cursor: grab;
      background: linear-gradient(135deg, #1a1400, #2c1f00);
      border-bottom: 1px solid #c9a84c33;
    }
    .hch-head:active { cursor: grabbing; }
    .hch-title { color: #c9a84c; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .hch-btns { display: flex; gap: 5px; }
    .hch-btn {
      background: transparent; border: 1px solid #c9a84c33;
      color: #c9a84c; width: 22px; height: 22px; border-radius: 4px;
      cursor: pointer; font-size: 13px; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s;
    }
    .hch-btn:hover { background: #c9a84c22; border-color: #c9a84c; }
    .hch-body { padding: 12px 14px; }
    .hch-status {
      display: flex; align-items: center; gap: 8px;
      font-family: 'Space Mono', monospace;
      font-size: 10px; color: #666; margin-bottom: 10px;
    }
    .hch-dot { width: 7px; height: 7px; border-radius: 50%; background: #333; flex-shrink: 0; }
    .hch-dot.on { background: #4caf50; box-shadow: 0 0 6px #4caf5077; animation: hch-blink 1.4s infinite; }
    .hch-dot.thinking { background: #ff9800; box-shadow: 0 0 6px #ff980077; animation: hch-blink 0.7s infinite; }
    @keyframes hch-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .hch-moves { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
    .hch-empty { font-family:'Space Mono',monospace; font-size:11px; color:#444; text-align:center; padding:10px 0; }
    .hch-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; background: #111;
      border: 1px solid #222; border-radius: 6px;
    }
    .hch-row.top { background: linear-gradient(135deg, #1a1400, #201800); border-color: #c9a84c55; }
    .hch-rank { font-size: 12px; color: #555; width: 14px; text-align:center; flex-shrink:0; }
    .hch-row.top .hch-rank { color: #c9a84c; }
    .hch-mv { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #ddd; flex: 1; letter-spacing: 0.05em; }
    .hch-row.top .hch-mv { color: #ffd966; }
    .hch-sc { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; min-width: 52px; text-align: right; }
    .hch-sc.win { color: #4caf50; }
    .hch-sc.eq  { color: #ffc107; }
    .hch-sc.los { color: #f44336; }
    .hch-sc.mat { color: #ce93d8; font-size: 10px; }
    .hch-footer { border-top: 1px solid #1a1a1a; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; }
    .hch-color-lbl { font-family:'Space Mono',monospace; font-size: 10px; color: #555; }
    .hch-color-lbl strong { color: #c9a84c; }
    .hch-toggle {
      background: #c9a84c22; border: 1px solid #c9a84c55;
      color: #c9a84c; padding: 3px 8px; border-radius: 4px;
      cursor: pointer; font-size: 11px; font-family: 'Rajdhani', sans-serif;
      font-weight: 700; transition: all 0.15s;
    }
    .hch-toggle:hover { background: #c9a84c44; }
  `;
  document.head.appendChild(style);

  // ── Panel HTML ─────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'hch-panel';
  panel.innerHTML = `
    <div class="hch-head" id="hch-head">
      <span class="hch-title">♟ Chess Helper</span>
      <div class="hch-btns">
        <button class="hch-btn" id="hch-min">−</button>
        <button class="hch-btn" id="hch-close">✕</button>
      </div>
    </div>
    <div class="hch-body" id="hch-body">
      <div class="hch-status">
        <span class="hch-dot" id="hch-dot"></span>
        <span id="hch-status-txt">Connecting...</span>
      </div>
      <div class="hch-moves" id="hch-moves">
        <div class="hch-empty">Waiting for position...</div>
      </div>
      <div class="hch-footer">
        <div class="hch-color-lbl">Playing as: <strong id="hch-color-lbl">White ♔</strong></div>
        <button class="hch-toggle" id="hch-toggle">Switch ⇄</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Controls ───────────────────────────────────────────
  let minimized = false;
  document.getElementById('hch-min').onclick = () => {
    minimized = !minimized;
    document.getElementById('hch-body').style.display = minimized ? 'none' : 'block';
    document.getElementById('hch-min').textContent = minimized ? '+' : '−';
  };
  document.getElementById('hch-close').onclick = () => { panel.remove(); window.__hchLoaded = false; };
  document.getElementById('hch-toggle').onclick = () => {
    playerColor = playerColor === 'w' ? 'b' : 'w';
    document.getElementById('hch-color-lbl').textContent = playerColor === 'w' ? 'White ♔' : 'Black ♚';
    triggerAnalysis(true);
  };

  // ── Drag ───────────────────────────────────────────────
  const head = document.getElementById('hch-head');
  head.addEventListener('mousedown', e => {
    let ox = e.clientX - panel.getBoundingClientRect().left;
    let oy = e.clientY - panel.getBoundingClientRect().top;
    const move = e2 => { panel.style.left = (e2.clientX-ox)+'px'; panel.style.top = (e2.clientY-oy)+'px'; panel.style.right='auto'; };
    const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // ── UI ─────────────────────────────────────────────────
  function setStatus(msg, state='idle') {
    document.getElementById('hch-status-txt').textContent = msg;
    const dot = document.getElementById('hch-dot');
    dot.className = 'hch-dot' + (state==='on'?' on':state==='thinking'?' thinking':'');
  }

  function renderMoves(moves) {
    const el = document.getElementById('hch-moves');
    if (!moves || !moves.length) { el.innerHTML = '<div class="hch-empty">No moves found</div>'; return; }
    el.innerHTML = moves.map((m,i) => {
      const sc = m.score;
      const scClass = (sc.includes('Mate')||sc.includes('mate')) ? 'mat' : parseFloat(sc)>0.5 ? 'win' : parseFloat(sc)<-0.5 ? 'los' : 'eq';
      const uci = m.move;
      const notation = uci.slice(0,2)+' → '+uci.slice(2,4)+(uci[4]?'='+uci[4].toUpperCase():'');
      return `<div class="hch-row ${i===0?'top':''}">
        <span class="hch-rank">${i===0?'★':i+1}</span>
        <span class="hch-mv">${notation}</span>
        <span class="hch-sc ${scClass}">${sc}</span>
      </div>`;
    }).join('');
    setStatus('Analysis complete ✓', 'on');
  }

  // ── FEN Detection (Hustle Chess specific) ──────────────
  function detectFen() {
    // Hustle Chess pakai chessboard.js dengan data-square + data-piece
    const squares = document.querySelectorAll('[data-square]');
    if (squares.length > 0) return fenFromSquares(squares);

    // Fallback chessground
    const cg = document.querySelector('.cg-wrap');
    if (cg) return fenFromCg(cg);

    // Fallback: cari FEN string di DOM
    const m = document.body.innerHTML.match(/[rnbqkpRNBQKP1-8]{2,8}(?:\/[rnbqkpRNBQKP1-8]{1,8}){7}/);
    if (m) return m[0] + ' ' + playerColor + ' KQkq - 0 1';

    return null;
  }

  function fenFromSquares(squares) {
    try {
      const board = Array(8).fill(null).map(() => Array(8).fill(null));
      squares.forEach(sq => {
        const sqn = sq.getAttribute('data-square');
        if (!sqn || sqn.length < 2) return;

        const fi = sqn.charCodeAt(0) - 97;
        const ri = 8 - parseInt(sqn[1]);
        if (fi < 0 || fi > 7 || ri < 0 || ri > 7) return;

        // Hustle Chess: data-piece ada di <img> di dalam square
        const img = sq.querySelector('img[data-piece]');
        let pieceVal = img ? img.getAttribute('data-piece') : sq.getAttribute('data-piece');

        if (!pieceVal || pieceVal.length < 2) return;

        const color = pieceVal[0].toLowerCase();
        const type  = pieceVal[1].toLowerCase();
        board[ri][fi] = color + type;
      });

      const hasPieces = board.some(row => row.some(cell => cell !== null));
      if (!hasPieces) return null;

      return boardToFen(board);
    } catch(e) {
      console.error('[HCH] fenFromSquares error:', e);
      return null;
    }
  }

  function fenFromCg(wrap) {
    try {
      const pieces = wrap.querySelectorAll('piece');
      if (!pieces.length) return null;
      const board = Array(8).fill(null).map(() => Array(8).fill(null));
      pieces.forEach(p => {
        const cls = p.className;
        const st = p.getAttribute('style') || '';
        const t = st.match(/translate\((\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
        if (!t) return;
        const fi = Math.round(parseFloat(t[1]) / 12.5);
        const ri = Math.round(parseFloat(t[2]) / 12.5);
        const color = cls.includes('white') ? 'w' : 'b';
        let type = '';
        if (cls.includes('king'))        type = 'k';
        else if (cls.includes('queen'))  type = 'q';
        else if (cls.includes('rook'))   type = 'r';
        else if (cls.includes('bishop')) type = 'b';
        else if (cls.includes('knight')) type = 'n';
        else if (cls.includes('pawn'))   type = 'p';
        if (type && fi >= 0 && fi < 8 && ri >= 0 && ri < 8) board[ri][fi] = color + type;
      });
      return boardToFen(board);
    } catch { return null; }
  }

  function boardToFen(board) {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) { e++; }
        else {
          if (e) { fen += e; e = 0; }
          fen += p[0]==='w' ? p[1].toUpperCase() : p[1];
        }
      }
      if (e) fen += e;
      if (r < 7) fen += '/';
    }
    return fen + ' ' + playerColor + ' KQkq - 0 1';
  }

  // ── Analysis ───────────────────────────────────────────
  async function triggerAnalysis(force=false) {
    if (isAnalyzing && !force) return;
    const fen = detectFen();
    if (!fen) { setStatus('Board not detected', 'idle'); return; }
    if (fen === currentFen && !force) return;
    currentFen = fen;

    isAnalyzing = true;
    setStatus('Analyzing...', 'thinking');

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, movetime: 1500 })
      });
      const data = await res.json();
      renderMoves(data.moves);
    } catch(err) {
      setStatus('Server error ✗', 'idle');
      console.error('[HCH]', err);
    } finally {
      isAnalyzing = false;
    }
  }

  // ── Observer ───────────────────────────────────────────
  const target = document.querySelector('[class*="board"], [id*="board"]') || document.body;
  const obs = new MutationObserver(() => {
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => triggerAnalysis(), 400);
  });
  obs.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','data-piece','data-square'] });

  // ── Init ───────────────────────────────────────────────
  fetch(`${SERVER}/`)
    .then(r => r.json())
    .then(() => { setStatus('Connected ✓', 'on'); triggerAnalysis(); })
    .catch(() => setStatus('Cannot reach server ✗', 'idle'));

  console.log('[HCH] Loaded ✓');
})();
