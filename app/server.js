const express = require('express')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 3000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000
})

app.use(express.urlencoded({ extended: false }))

async function initDb() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY DEFAULT 1,
        count INTEGER DEFAULT 0
      )
    `)
    await client.query(`
      INSERT INTO visitors (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
  } finally {
    client.release()
  }
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(str).replace(/[&<>"']/g, c => map[c])
}

function renderPage(visitorCount, entries) {
  const entriesHtml = entries.length === 0
    ? '<p class="empty">No messages yet. Be the first to sign!</p>'
    : entries.map(e => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-name">${escapeHtml(e.name)}</span>
            <span class="entry-time">${timeAgo(e.created_at)}</span>
          </div>
          <p class="entry-message">${escapeHtml(e.message)}</p>
        </div>
      `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vibe_in_vps - Guestbook</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0f;
      color: #e0e0e8;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .container {
      width: 100%;
      max-width: 640px;
    }

    .hero {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .hero h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #a78bfa, #818cf8, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      color: #6b6b80;
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }

    .hero a {
      color: #818cf8;
      text-decoration: none;
    }

    .hero a:hover { text-decoration: underline; }

    .counter {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(129, 140, 248, 0.08);
      border: 1px solid rgba(129, 140, 248, 0.15);
      border-radius: 999px;
      padding: 0.4rem 1rem;
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #a5b4fc;
    }

    .counter span {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card h2 {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b6b80;
      margin-bottom: 1.25rem;
    }

    form { display: flex; flex-direction: column; gap: 0.75rem; }

    input, textarea {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 0.7rem 0.9rem;
      color: #e0e0e8;
      font-family: inherit;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: rgba(129, 140, 248, 0.4);
    }

    input::placeholder, textarea::placeholder { color: #3d3d50; }

    textarea { resize: vertical; min-height: 80px; }

    button {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 0.7rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    button:hover { opacity: 0.9; }

    .entries { display: flex; flex-direction: column; gap: 0.75rem; }

    .entry {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 1rem;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .entry-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #c4b5fd;
    }

    .entry-time {
      font-size: 0.75rem;
      color: #4a4a5e;
    }

    .entry-message {
      font-size: 0.88rem;
      line-height: 1.5;
      color: #a0a0b4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty {
      text-align: center;
      color: #4a4a5e;
      padding: 2rem 0;
      font-size: 0.9rem;
    }

    .footer {
      text-align: center;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #3d3d50;
    }

    .footer a { color: #6366f1; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>guestbook</h1>
      <p>deployed with <a href="https://github.com/filipegalo/vibe_in_vps" target="_blank">vibe_in_vps</a></p>
      <div class="counter">
        visitors: <span>${visitorCount.toLocaleString()}</span>
      </div>
    </div>

    <div class="card">
      <h2>Leave a message</h2>
      <form action="/sign" method="POST">
        <input type="text" name="name" placeholder="Your name" required maxlength="100" autocomplete="off" />
        <textarea name="message" placeholder="Write something..." required maxlength="500"></textarea>
        <button type="submit">Sign the guestbook</button>
      </form>
    </div>

    <div class="card">
      <h2>Messages (${entries.length})</h2>
      <div class="entries">
        ${entriesHtml}
      </div>
    </div>

    <div class="footer">
      powered by docker + terraform + github actions
    </div>
  </div>
</body>
</html>`
}

app.get('/', async (req, res) => {
  try {
    const countResult = await pool.query(
      'UPDATE visitors SET count = count + 1 WHERE id = 1 RETURNING count'
    )
    const entriesResult = await pool.query(
      'SELECT name, message, created_at FROM entries ORDER BY created_at DESC LIMIT 50'
    )

    const visitorCount = countResult.rows[0].count
    const entries = entriesResult.rows

    res.send(renderPage(visitorCount, entries))
  } catch (error) {
    res.status(500).send('<h1>Something went wrong</h1><p>Could not connect to the database.</p>')
  }
})

app.post('/sign', async (req, res) => {
  const { name, message } = req.body

  if (!name || !message || name.trim().length === 0 || message.trim().length === 0) {
    return res.redirect('/')
  }

  const safeName = name.trim().slice(0, 100)
  const safeMessage = message.trim().slice(0, 500)

  try {
    await pool.query(
      'INSERT INTO entries (name, message) VALUES ($1, $2)',
      [safeName, safeMessage]
    )
  } catch (error) {
    // Entry failed but don't crash - redirect back
  }

  res.redirect('/')
})

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }
})

async function start() {
  try {
    await initDb()
  } catch (error) {
    process.exit(1)
  }

  app.listen(PORT, '0.0.0.0', () => {
    process.stdout.write(`Server running on port ${PORT}\n`)
  })
}

start()

process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await pool.end()
  process.exit(0)
})
