// Hustle Chess Helper - Bookmarklet Inject Script
(function () {
  const SERVER = 'https://hustle-chess-helper-production.up.railway.app';

  window.__hchLoaded = true;

  let lastDomPieces = '';
  let playerColor = document.body.innerText.includes('You (Black)') ? 'b' : 'w';
  let isAnalyzing = false;
  let mode = 'normal';
  let bestMoveUci = null;

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
    .hch-btn:hover { background:#c9a84c22;border-color:#c9a84c; }
    .hch-body { padding:12px 14px; }
    .hch-status { display:flex;align-items:center;gap:8px;font-family:'Space Mono',monospace;font-size:10px;color:#666;margin-bottom:8px; }
    .hch-dot { width:7px;height:7px;border-radius:50%;background:#333;flex-shrink:0; }
    .hch-dot.on { background:#4caf50;box-shadow:0 0 6px #4caf5077;animation:hch-blink 1.4s infinite; }
    .hch-dot.thinking { background:#ff9800;box-shadow:0 0 6px #ff980077;animation:hch-blink 0.7s infinite; }
    .hch-dot.mate { background:#e040fb;box-shadow:0 0 6px #e040fb77;animation:hch-blink 0.5s infinite; }
    @keyframes hch-blink { 0%,100%{opacity:1}50%{opacity:0.3} }
    .hch-mode-bar { display:flex;gap:6px;margin-bottom:10px; }
    .hch-mode-btn { flex:1;padding:5px;border-radius:6px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;border:1px solid #333;background:#111;color:#666; }
    .hch-mode-btn.active { background:#1a1400;border-color:#c9a84c;color:#c9a84c; }
    .hch-mode-btn.mate-btn.active { background:#1a0010;border-color:#e040fb;color:#e040fb; }
    .hch-moves { display:flex;flex-direction:column;gap:5px;margin-bottom:10px; }
    .hch-empty { font-family:'Space Mono',monospace;font-size:11px;color:#444;text-align:center;padding:10px 0; }
    .hch-row { display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111;border:1px solid #222;border-radius:6px;cursor:pointer;transition:border-color 0.15s; }
    .hch-row:hover { border-color:#c9a84c55; }
    .hch-row.top { background:linear-gradient(135deg,#1a1400,#201800);border-color:#c9a84c55; }
    .hch-row.mate-move { background:linear-gradient(135deg,#1a0010,#200018);border-color:#e040fb55; }
    .hch-rank { font-size:12px;color:#555;width:14px;text-align:center;flex-shrink:0; }
    .hch-row.top .hch-rank { color:#c9a84c; }
    .hch-row.mate-move .hch-rank { color:#e040fb; }
    .hch-mv { font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#ddd;flex:1;letter-spacing:0.05em; }
    .hch-row.top .hch-mv { color:#ffd966; }
    .hch-row.mate-move .hch-mv { color:#f48fb1; }
    .hch-sc { font-family:'Space Mono',monospace;font-size:11px;font-weight:700;min-width:52px;text-align:right; }
    .hch-sc.win{color:#4caf50}.hch-sc.eq{color:#ffc107}.hch-sc.los{color:#f44336}.hch-sc.mat{color:#e040fb;font-size:10px}
    .hch-turn { font-family:'Space Mono',monospace;font-size:10px;color:#666;text-align:center;margin-bottom:6px; }
    .hch-turn strong { color:#c9a84c; }
    .hch-footer { border-top:1px solid #1a1a1a;padding-top:8px;display:flex;align-items:center;justify-content:space-between; }
    .hch-color-lbl { font-family:'Space Mono',monospace;font-size:10px;color:#555; }
    .hch-color-lbl strong { color:#c9a84c; }
    .hch-toggle { background:#c9a84c22;border:1px solid #c9a84c55;color:#c9a84c;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-family:'Rajdhani',sans-serif;font-weight:700; }
    .hch-sq-highlight { position:absolute; pointer-events:none; z-index:9999; border-radius:3px; transition:all 0.2s; }
    .hch-sq-from { background:rgba(255,215,0,0.5); border:3px solid rgba(255,215,0,0.9); }
    .hch-sq-to   { background:rgba(50,205,50,0.5); border:3px solid rgba(50,205,50,0.9); }
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
      <div class="hch-status"><span class="hch-dot" id="hch-dot"></span><span id="hch-status-txt">Loading...</span></div>
      <div class="hch-mode-bar">
        <button class="hch-mode-btn active" id="btn-normal">⚡ Best Move</button>
        <button class="hch-mode-btn mate-btn" id="btn-mate">☠ Hunt Mate</button>
      </div>
      <div class="hch-turn" id="hch-turn"></div>
      <div class="hch-moves" id="hch-moves"><div class="hch-empty">Waiting...</div></div>
      <div class="hch-footer">
        <div class="hch-color-lbl">Playing as: <strong id="hch-color-lbl">${playerColor==='w'?'White ♔':'Black ♚'}</strong></div>
        <button class="hch-toggle" id="hch-toggle">Switch ⇄</button>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px;">
        <button class="hch-toggle" id="hch-force" style="flex:1;font-size:10px;padding:3px 4px;">⚡ Force</button>
        <button class="hch-toggle" id="hch-debug" style="flex:1;font-size:10px;padding:3px 4px;border-color:#888;color:#888;">🔍 Debug</button>
      </div>
    </div>`;
  document.body.appendChild(panel);

  let minimized = false;
  document.getElementById('hch-min').onclick = () => { minimized=!minimized; document.getElementById('hch-body').style.display=minimized?'none':'block'; document.getElementById('hch-min').textContent=minimized?'+':'−'; };
  document.getElementById('hch-close').onclick = () => { clearHighlights(); panel.remove(); window.__hchLoaded=false; };
  document.getElementById('hch-toggle').onclick = () => { playerColor=playerColor==='w'?'b':'w'; document.getElementById('hch-color-lbl').textContent=playerColor==='w'?'White ♔':'Black ♚'; lastDomPieces=''; clearHighlights(); };
  document.getElementById('hch-force').onclick = () => { lastDomPieces=''; triggerAnalysis(true); };
  document.getElementById('hch-debug').onclick = () => {
    const hist = parseHistory();
    const dom = getFenFromDOM();
    const sq = document.querySelector('[data-square]');
    const histEl = document.querySelector('[class*="history"]');
    alert('Debug info dicetak ke Console (F12 → Console tab)');
  };
  document.getElementById('btn-normal').onclick = () => { mode='normal'; document.getElementById('btn-normal').classList.add('active'); document.getElementById('btn-mate').classList.remove('active'); lastDomPieces=''; };
  document.getElementById('btn-mate').onclick = () => { mode='mate'; document.getElementById('btn-mate').classList.add('active'); document.getElementById('btn-normal').classList.remove('active'); lastDomPieces=''; };

  document.getElementById('hch-head').addEventListener('mousedown', e => {
    let ox=e.clientX-panel.getBoundingClientRect().left, oy=e.clientY-panel.getBoundingClientRect().top;
    const mv=e2=>{panel.style.left=(e2.clientX-ox)+'px';panel.style.top=(e2.clientY-oy)+'px';panel.style.right='auto';};
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });

  function setStatus(msg,state='idle') {
    document.getElementById('hch-status-txt').textContent=msg;
    document.getElementById('hch-dot').className='hch-dot'+(state==='on'?' on':state==='thinking'?' thinking':state==='mate'?' mate':'');
  }

  function getSquareEl(sqName) { return document.querySelector(`[data-square="${sqName}"]`); }

  function clearHighlights() { document.querySelectorAll('.hch-sq-highlight').forEach(el => el.remove()); }

  function highlightMove(uci) {
    clearHighlights();
    if (!uci || uci.length < 4) return;
    const fromEl = getSquareEl(uci.slice(0,2));
    const toEl   = getSquareEl(uci.slice(2,4));
    if (fromEl) { const h=document.createElement('div'); h.className='hch-sq-highlight hch-sq-from'; h.style.cssText='width:100%;height:100%;top:0;left:0;'; fromEl.style.position='relative'; fromEl.appendChild(h); }
    if (toEl)   { const h=document.createElement('div'); h.className='hch-sq-highlight hch-sq-to';   h.style.cssText='width:100%;height:100%;top:0;left:0;'; toEl.style.position='relative';   toEl.appendChild(h); }
  }

  function renderMoves(moves, turn) {
    document.getElementById('hch-turn').innerHTML = turn===playerColor ? `<strong>Your turn!</strong>` : `Opponent's turn...`;
    const el=document.getElementById('hch-moves');
    if(!moves||!moves.length){el.innerHTML='<div class="hch-empty">No moves</div>';clearHighlights();return;}
    el.innerHTML=moves.map((m,i)=>{
      const sc=m.score,isMate=sc.includes('Mate')||sc.includes('mate');
      const scClass=isMate?'mat':parseFloat(sc)>0.3?'win':parseFloat(sc)<-0.3?'los':'eq';
      const rowClass=isMate?'mate-move':i===0?'top':'';
      const rank=isMate?'☠':i===0?'★':i+1;
      const n=m.move.slice(0,2)+' → '+m.move.slice(2,4)+(m.move[4]?'='+m.move[4].toUpperCase():'');
      return `<div class="hch-row ${rowClass}" data-uci="${m.move}"><span class="hch-rank">${rank}</span><span class="hch-mv">${n}</span><span class="hch-sc ${scClass}">${sc}</span></div>`;
    }).join('');
    bestMoveUci = moves[0].move;
    highlightMove(bestMoveUci);
    document.querySelectorAll('#hch-moves .hch-row').forEach(row => {
      row.addEventListener('click', () => highlightMove(row.getAttribute('data-uci')));
    });
    const hasMate=moves.some(m=>m.score.includes('Mate'));
    setStatus(hasMate?'☠ Mate found!':turn===playerColor?'Your move! ✓':'Waiting...',hasMate?'mate':'on');
  }

  // ── parseHistory: Returns { fen, turn, parsedCount, totalTokens } ──
  function parseHistory() {
    if (!window.Chess) return null;
    try {
      const histEl = document.querySelector('[class*="history"]');
      if (!histEl) return null;
      const rawText = histEl.textContent || '';

      // ── CARA PALING RELIABLE UNTUK TURN: hitung dari move numbers ──
      // Cari semua angka "N." dalam teks asli (sebelum parsing apapun)
      // Ini tidak terpengaruh oleh token splitting yang gagal
      let turnFromMoveNums = 'w'; // default
      const rawMoveNums = rawText.match(/\b(\d+)\./g);
      if (rawMoveNums && rawMoveNums.length > 0) {
        const maxNum = Math.max(...rawMoveNums.map(n => parseInt(n)));
        // Cari teks setelah "maxNum." untuk lihat apakah black juga sudah main
        const lastNumStr = maxNum + '.';
        const lastNumIdx = rawText.lastIndexOf(lastNumStr);
        if (lastNumIdx !== -1) {
          const afterLastNum = rawText.slice(lastNumIdx + lastNumStr.length).trim();
          // Split dan filter hanya token yang terlihat seperti move
          const moveLike = afterLastNum.split(/\s+/).filter(t =>
            t.length >= 2 && /^[a-hNBRQKO]/.test(t)
          );
          // Kalau ada 2+ token setelah nomor terakhir → kedua sisi sudah main → white to move
          // Kalau hanya 1 → white baru saja main → black to move
          turnFromMoveNums = moveLike.length >= 2 ? 'w' : 'b';
        }
      }

      // ── PARSING FEN (untuk posisi, bukan turn) ──
      let text = rawText;

      // Hapus nomor move yang nyambung ke move (e.g. Nf62. exd43.)
      text = text.replace(/([a-zA-Z][1-8])\d+\./g, '$1 ');
      text = text.replace(/([+#!?=])\d+\./g, '$1 ');
      text = text.replace(/(O-O-O)\d+\./g, '$1 ');
      text = text.replace(/(O-O)\d+\./g, '$1 ');
      text = text.replace(/\b\d+\.\s*/g, ' ');

      // Split double castling
      text = text.replace(/O-O-OO-O-O/g, 'O-O-O O-O-O');
      text = text.replace(/O-O-OO-O/g, 'O-O-O O-O');
      text = text.replace(/O-OO-O/g, 'O-O O-O');

      // Multi-pass splitting sampai stabil
      let prev = '';
      let passes = 0;
      while (prev !== text && passes < 15) {
        prev = text;
        passes++;
        // Tambah: piece disambiguasi (Nbd2, R1e1, Qd1e2)
        text = text.replace(/([NBRQK][a-h\d]x[a-h][1-8][+#]?)([a-hNBRQKO])/g, '$1 $2');
        text = text.replace(/([NBRQK][a-h\d][a-h][1-8][+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Piece capture
        text = text.replace(/([NBRQK]x[a-h][1-8][+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Piece move
        text = text.replace(/([NBRQK][a-h][1-8][+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Pawn promotion (e8=Q, exd8=Q)
        text = text.replace(/(=[QRBN][+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Pawn capture
        text = text.replace(/([a-h]x[a-h][1-8](?:=[QRBN])?[+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Square diikuti capture
        text = text.replace(/([a-h][1-8][+#]?)([a-h]x)/g, '$1 $2');
        // Square diikuti square
        text = text.replace(/([a-h][1-8][+#]?)([a-h][1-8])/g, '$1 $2');
        // Square diikuti piece
        text = text.replace(/([a-h][1-8][+#]?)([NBRQK])/g, '$1 $2');
        // Square diikuti castling
        text = text.replace(/([a-h][1-8][+#]?)(O-O)/g, '$1 $2');
        // Castling diikuti apapun
        text = text.replace(/(O-O-O[+#]?)([a-hNBRQKO])/g, '$1 $2');
        text = text.replace(/(O-O[+#]?)([a-hNBRQKO])/g, '$1 $2');
        // Setelah check/mate/annotation
        text = text.replace(/([+#!?])([a-hNBRQKO])/g, '$1 $2');
      }

      const tokens = text.split(/\s+/).filter(t =>
        t.length >= 2 &&
        !t.match(/^\d+\.?$/) &&
        !t.match(/^\d+$/) &&
        !['Move','History:','No','moves','yet','Move History:','e.p.'].includes(t)
      );

      const totalTokens = tokens.length;
      if (totalTokens === 0) return { fen: null, turn: turnFromMoveNums, parsedCount: 0, totalTokens: 0 };

      const chess = new Chess();
      let parsedCount = 0;
      for (const token of tokens) {
        try {
          const r = chess.move(token, { sloppy: true });
          if (r) parsedCount++;
          else break;
        } catch(e) { break; }
      }

      const fen = parsedCount > 0 ? chess.fen() : null;

      // Gunakan turnFromMoveNums (paling reliable), bukan parsedCount/totalTokens
      return { fen, turn: turnFromMoveNums, parsedCount, totalTokens };
    } catch(e) {
      return null;
    }
  }

  // Coba ambil piece value dari berbagai format atribut Hustle Chess
  function getPieceValue(el) {
    const dp = el.getAttribute && el.getAttribute('data-piece');
    if (dp && dp.length >= 2) return dp[0].toLowerCase() + dp[1].toLowerCase();
    if (el.tagName === 'IMG') {
      const src = el.src || '';
      const m = src.match(/[/_-]([wb])([PNBRQK])\./i) || src.match(/([wb])([PNBRQK])\.(?:png|svg|gif|jpg)/i);
      if (m) return m[1].toLowerCase() + m[2].toLowerCase();
      const colors = { white:'w', black:'b' };
      const pieces = { pawn:'p', knight:'n', bishop:'b', rook:'r', queen:'q', king:'k' };
      const srcL = src.toLowerCase();
      for (const [cname, cv] of Object.entries(colors))
        for (const [pname, pv] of Object.entries(pieces))
          if (srcL.includes(cname) && srcL.includes(pname)) return cv + pv;
    }
    const cls = (el.className && typeof el.className === 'string') ? el.className : '';
    const mc = cls.match(/\b([wb])([PNBRQKpnbrqk])\b/);
    if (mc) return mc[1].toLowerCase() + mc[2].toLowerCase();
    return null;
  }

  function getFenFromDOM() {
    const squares = document.querySelectorAll('[data-square]');
    if (!squares.length) {
      return null;
    }
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    let pieceCount = 0;
    squares.forEach(sq => {
      const sqn = sq.getAttribute('data-square');
      if (!sqn || sqn.length < 2) return;
      const fi = sqn.charCodeAt(0) - 97, ri = 8 - parseInt(sqn[1]);
      if (fi < 0 || fi > 7 || ri < 0 || ri > 7) return;
      let pv = null;
      for (const child of sq.querySelectorAll('img, [data-piece], [class*="piece"]')) {
        pv = getPieceValue(child);
        if (pv) break;
      }
      if (!pv) pv = getPieceValue(sq);
      if (pv && pv.length >= 2) { b[ri][fi] = pv; pieceCount++; }
    });
    if (pieceCount < 2) {
      const sample = squares[0];
      return null;
    }
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let e = 0, row = '';
      for (let f = 0; f < 8; f++) {
        const p = b[r][f];
        if (!p) { e++; }
        else { if (e) { row += e; e = 0; } row += p[0] === 'w' ? p[1].toUpperCase() : p[1]; }
      }
      if (e) row += e;
      fen += row + (r < 7 ? '/' : '');
    }
    return fen;
  }

  function detectPosition() {
    const detected = document.body.innerText.includes('You (Black)') ? 'b' : 'w';
    if (detected !== playerColor) {
      playerColor = detected;
      document.getElementById('hch-color-lbl').textContent = playerColor === 'w' ? 'White ♔' : 'Black ♚';
      lastDomPieces = ''; clearHighlights();
    }

    const hist = parseHistory();

    // Posisi dari history (kalau parse penuh berhasil)
    if (hist && hist.fen && hist.parsedCount === hist.totalTokens && hist.totalTokens > 0) {
      const domPieces = hist.fen.split(' ')[0]; // bagian pieces saja
      return { fen: hist.fen, turn: hist.turn, domPieces };
    }

    // Fallback: posisi dari DOM pieces
    const domPieces = getFenFromDOM();
    if (!domPieces) {
      return null;
    }

    const turn = hist ? hist.turn : 'w';
    const fen = domPieces + ' ' + turn + ' KQkq - 0 1';
    return { fen, turn, domPieces };
  }

  async function triggerAnalysis(force = false) {
    if (isAnalyzing) return;

    const pos = detectPosition();
    if (!pos) { setStatus('Board not detected', 'idle'); return; }

    const { fen, turn, domPieces } = pos;

    document.getElementById('hch-turn').innerHTML =
      turn === playerColor ? `<strong>Your turn!</strong>` : `Opponent's turn...`;

    if (turn !== playerColor) {
      setStatus('Opponent thinking...', 'idle');
      clearHighlights();
      // JANGAN update lastDomPieces di sini!
      // Kalau disimpan, giliran kita berikutnya pieces-nya sama → skip analisis
      return;
    }

    // Change detection: bandingkan HANYA pieces (bukan full FEN dengan turn)
    // Ini yang menyebabkan "Same FEN, skip" — turn berubah tapi pieces sama tidak dideteksi
    const piecesChanged = domPieces && domPieces !== lastDomPieces;

    if (!force && !piecesChanged) {
      return;
    }

    lastDomPieces = domPieces || '';
    isAnalyzing = true;
    setStatus(mode === 'mate' ? '☠ Hunting...' : 'Analyzing...', 'thinking');

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, movetime: mode === 'mate' ? 800 : 500, mode })
      });
      const data = await res.json();
      renderMoves(data.moves, turn);
    } catch(err) {
      setStatus('Server error ✗', 'idle');
    } finally {
      isAnalyzing = false;
    }
  }

  loadChessJs(() => {
    setStatus('Connected ✓', 'on');
    setInterval(() => triggerAnalysis(false), 800);
    setTimeout(() => triggerAnalysis(false), 300);
  });

})();
