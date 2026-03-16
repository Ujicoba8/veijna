# ♟ Hustle Chess Helper — Railway Deploy Guide

Zero install. Jalan 100% di browser.

---

## 🚀 Deploy ke Railway (5 menit)

### Step 1 — Push ke GitHub

```bash
# Buat repo baru di github.com dulu, lalu:
git init
git add .
git commit -m "init hustle chess helper"
git remote add origin https://github.com/USERNAME/hustle-chess-helper.git
git push -u origin main
```

### Step 2 — Deploy di Railway

1. Buka **railway.app** → Login dengan GitHub
2. Klik **New Project** → **Deploy from GitHub repo**
3. Pilih repo `hustle-chess-helper`
4. Railway auto-detect Dockerfile → klik **Deploy**
5. Tunggu ~2 menit sampai build selesai
6. Klik **Settings** → **Domains** → **Generate Domain**
7. Copy URL kamu, contoh: `https://hustle-chess-helper.up.railway.app`

### Step 3 — Pakai!

1. Buka URL Railway kamu di browser
2. Drag tombol **♟ Chess Helper** ke Bookmarks Bar
3. Buka hustle-chess.com
4. Klik bookmark → Panel muncul!

---

## 📁 File Structure

```
hustle-chess-server/
├── server.js          ← Express + Stockfish engine
├── package.json
├── Dockerfile         ← Railway deploy config
└── public/
    ├── index.html     ← Landing page (drag bookmarklet dari sini)
    └── bookmarklet.js ← Script yang di-inject ke hustle-chess.com
```

---

## 🔍 Cara Kerja

```
hustle-chess.com
     │
     │ (bookmarklet inject script)
     ▼
bookmarklet.js ──── POST /analyze {fen} ───▶ Railway Server
     │                                              │
     │                                        Stockfish analisis
     │                                              │
     ◀──────────── { moves: [...] } ───────────────┘
     │
  Overlay UI muncul di atas board
```

---

## ⚙️ Endpoints

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/` | GET | Health check |
| `/analyze` | POST | `{ fen, movetime }` → `{ bestMove, moves }` |
| `/inject.js` | GET | Serve bookmarklet dengan URL server |

---

## 💡 Tips

- **Movetime** default 1500ms, bisa diubah di `server.js`
- Kalau Railway sleep (free tier), buka URL dulu sebelum main
- Gunakan **⇄ Switch** di panel kalau main sebagai Black

---

Enjoy! 🎯
