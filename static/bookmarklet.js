// Hustle Chess Helper - Bookmarklet Inject Script
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
    .hch-row { display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111;border:1px solid #222;border-radius:6px; }
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
    </div>`;
  document.body.appendChild(panel);

  let minimized = false;
  document.getElementById('hch-min').onclick = () => { minimized=!minimized; document.getElementById('hch-body').style.display=minimized?'none':'block'; document.getElementById('hch-min').textContent=minimized?'+':'−'; };
  document.getElementById('hch-close').onclick = () => { panel.remove(); window.__hchLoaded=false; };
  document.getElementById('hch-toggle').onclick = () => { playerColor=playerColor==='w'?'b':'w'; document.getElementById('hch-color-lbl').textContent=playerColor==='w'?'White ♔':'Black ♚'; currentFen=''; };
  document.getElementById('btn-normal').onclick = () => { mode='normal'; document.getElementById('btn-normal').classList.add('active'); document.getElementById('btn-mate').classList.remove('active'); currentFen=''; };
  document.getElementById('btn-mate').onclick = () => { mode='mate'; document.getElementById('btn-mate').classList.add('active'); document.getElementById('btn-normal').classList.remove('active'); currentFen=''; };

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

  function renderMoves(moves,turn) {
    document.getElementById('hch-turn').innerHTML=turn===playerColor?`<strong>Your turn!</strong>`:`Opponent's turn...`;
    const el=document.getElementById('hch-moves');
    if(!moves||!moves.length){el.innerHTML='<div class="hch-empty">No moves</div>';return;}
    el.innerHTML=moves.map((m,i)=>{
      const sc=m.score,isMate=sc.includes('Mate')||sc.includes('mate');
      const scClass=isMate?'mat':parseFloat(sc)>0.3?'win':parseFloat(sc)<-0.3?'los':'eq';
      const rowClass=isMate?'mate-move':i===0?'top':'';
      const rank=isMate?'☠':i===0?'★':i+1;
      const n=m.move.slice(0,2)+' → '+m.move.slice(2,4)+(m.move[4]?'='+m.move[4].toUpperCase():'');
      return `<div class="hch-row ${rowClass}"><span class="hch-rank">${rank}</span><span class="hch-mv">${n}</span><span class="hch-sc ${scClass}">${sc}</span></div>`;
    }).join('');
    const hasMate=moves.some(m=>m.score.includes('Mate'));
    setStatus(hasMate?'☠ Mate found!':turn===playerColor?'Your move! ✓':'Waiting...',hasMate?'mate':'on');
  }

  function getFenFromHistory() {
    if (!window.Chess) return null;
    try {
      const histEl = document.querySelector('[class*="history"]');
      if (!histEl) return null;
      let text = histEl.textContent || '';
      // Fix: "c52." → "c5 2." — tambah spasi sebelum nomor move
      text = text.replace(/([a-zA-Z0-9+#!?])(\d+\.)/g, '$1 $2');
      // Fix: "e4c5" → "e4 c5"
      text = text.replace(/([a-h][1-8])([a-zA-Z])/g, '$1 $2');

      const chess = new Chess();
      const tokens = text.split(/\s+/).filter(t =>
        t.length >= 2 &&
        !t.match(/^\d+\.$/) &&
        !t.match(/^\d+$/) &&
        !['Move','History:','No','moves','yet'].includes(t)
      );

      let moveCount = 0;
      for (const token of tokens) {
        try {
          const result = chess.move(token, {sloppy: true});
          if (result) moveCount++;
          else break;
        } catch(e) { break; }
      }

      if (moveCount === 0) return null;
      return chess.fen();
    } catch(e) { return null; }
  }

  function getFenFromDOM(turn='w') {
    const squares = document.querySelectorAll('[data-square]');
    if (!squares.length) return null;
    const b=Array(8).fill(null).map(()=>Array(8).fill(null));
    squares.forEach(sq=>{
      const sqn=sq.getAttribute('data-square');
      if(!sqn||sqn.length<2) return;
      const fi=sqn.charCodeAt(0)-97,ri=8-parseInt(sqn[1]);
      if(fi<0||fi>7||ri<0||ri>7) return;
      const img=sq.querySelector('img[data-piece]');
      const pv=img?img.getAttribute('data-piece'):null;
      if(!pv||pv.length<2) return;
      b[ri][fi]=pv[0].toLowerCase()+pv[1].toLowerCase();
    });
    if(!b.some(row=>row.some(c=>c!==null))) return null;
    let fen='';
    for(let r=0;r<8;r++){let e=0,row='';for(let f=0;f<8;f++){const p=b[r][f];if(!p){e++;}else{if(e){row+=e;e=0;}row+=p[0]==='w'?p[1].toUpperCase():p[1];}}if(e)row+=e;fen+=row+(r<7?'/':'');}
    return fen+' '+turn+' KQkq - 0 1';
  }

  function detectPosition() {
    const detected = document.body.innerText.includes('You (Black)') ? 'b' : 'w';
    if (detected !== playerColor) {
      playerColor=detected;
      document.getElementById('hch-color-lbl').textContent=playerColor==='w'?'White ♔':'Black ♚';
      currentFen='';
    }

    const fenHist = getFenFromHistory();
    if (fenHist) return { fen: fenHist, turn: fenHist.split(' ')[1] };

    const histEl = document.querySelector('[class*="history"]');
    let text = (histEl?histEl.textContent:'').replace(/([a-zA-Z0-9+#!?])(\d+\.)/g,'$1 $2').replace(/([a-h][1-8])([a-zA-Z])/g,'$1 $2');
    const tokens = text.split(/\s+/).filter(t=>t.length>=2&&!t.match(/^\d+\.?$/)&&!['Move','History:','No','moves','yet'].includes(t));
    const turn = tokens.length%2===0?'w':'b';
    const fen = getFenFromDOM(turn);
    return fen?{fen,turn}:null;
  }

  async function triggerAnalysis() {
    if (isAnalyzing) return;
    const pos = detectPosition();
    if (!pos) { setStatus('Board not detected','idle'); return; }
    const { fen, turn } = pos;

    // Hanya analisis waktu giliran kamu
    if (turn !== playerColor) {
      setStatus('Opponent thinking...','idle');
      document.getElementById('hch-turn').innerHTML = `Opponent's turn...`;
      currentFen = '';
      return;
    }

    if (fen === currentFen) return;
    currentFen = fen;

    isAnalyzing = true;
    setStatus(mode==='mate'?'☠ Hunting...':'Analyzing...','thinking');

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fen, movetime: mode==='mate'?3000:2000, mode })
      });
      const data = await res.json();
      renderMoves(data.moves, turn);
    } catch(err) {
      setStatus('Server error ✗','idle');
    } finally {
      isAnalyzing = false;
    }
  }

  loadChessJs(() => {
    setStatus('Connected ✓','on');
    setInterval(triggerAnalysis, 500);
    setTimeout(triggerAnalysis, 200);
  });

  console.log('[HCH] Loaded ✓');
})();
