const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const YOUTUBE_API_KEY = 'AIzaSyAcFTJAfZM23_bxQwVtCyMUkbCeM8jFWhQ';

app.use(express.static('public'));

// Search endpoint
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        q,
        part: 'snippet',
        maxResults: 5,
        type: 'video',
      },
    });

    const videos = response.data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    res.json(videos);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// Get available formats
app.get('/api/formats', async (req, res) => {
  const url = req.query.url;
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio')
      .filter(f => f.container === 'mp4' && f.qualityLabel)
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel,
        url: f.url,
      }));

    res.json({ title: info.videoDetails.title, formats });
  } catch (err) {
    console.error('Format error:', err.message);
    res.status(500).json({ error: 'Failed to get formats', message: err.message });
  }
});

// Download selected quality
app.get('/api/download', async (req, res) => {
  const { url, itag } = req.query;
  if (!ytdl.validateURL(url) || !itag) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').substring(0, 50);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);

    ytdl(url, { quality: itag }).pipe(res);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Download failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
