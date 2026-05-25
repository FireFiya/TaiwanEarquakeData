const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'bookmarks.json');

app.use(express.json());
app.use(cors());

async function readBookmarks() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeBookmarks(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/bookmarks', async (req, res, next) => {
  try {
    res.json(await readBookmarks());
  } catch (e) { next(e); }
});

app.post('/bookmarks', async (req, res, next) => {
  try {
    const { earthquakeId, time, place, magnitude, depth } = req.body;
    if (!earthquakeId) return res.status(400).json({ error: 'earthquakeId is required' });

    const bookmarks = await readBookmarks();
    if (bookmarks.find(b => b.earthquakeId === earthquakeId)) {
      return res.status(409).json({ error: 'Already bookmarked' });
    }

    const newItem = {
      id: bookmarks.length > 0 ? Math.max(...bookmarks.map(b => b.id)) + 1 : 1,
      earthquakeId,
      time,
      place,
      magnitude,
      depth,
      savedAt: new Date().toISOString(),
    };
    bookmarks.unshift(newItem);
    await writeBookmarks(bookmarks);
    res.status(201).json(newItem);
  } catch (e) { next(e); }
});

app.delete('/bookmarks/:earthquakeId', async (req, res, next) => {
  try {
    const earthquakeId = decodeURIComponent(req.params.earthquakeId);
    const bookmarks = await readBookmarks();
    const filtered = bookmarks.filter(b => b.earthquakeId !== earthquakeId);
    if (filtered.length === bookmarks.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    await writeBookmarks(filtered);
    res.status(204).send();
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Bookmark server running on http://localhost:${PORT}`));

module.exports = app;
